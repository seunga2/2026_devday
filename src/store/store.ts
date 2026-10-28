import { create } from 'zustand'
import type { Aspect, CameraSettings, Cut, Duration, LightingPreset, LightingSettings, MotionType, Project } from '../types/scene'
import { CAMERA_PRESETS, DEFAULT_CAMERA, clampCamera, type CameraPresetKey } from '../lib/camera'
import { DEFAULT_LIGHTING, applyLightingPreset, clampLighting } from '../lib/lighting'
import { evaluateMotion, frameFromSettings } from '../lib/motion'
import { loadProject, saveProject, type KeyValueStorage } from '../lib/persistence'
import { playback } from '../lib/playback'
import { createCut, createProject, cutName, newId } from '../lib/schema'

export type FrameSlot = 'start' | 'end'

interface Actions {
  // 카메라·조명 (편집 → 카메라 편집 모드로 복귀)
  setCamera(patch: Partial<CameraSettings>): void
  applyCameraPreset(key: CameraPresetKey): void
  resetCamera(): void
  setLighting(patch: Partial<LightingSettings>): void
  applyLightingPreset(preset: LightingPreset): void
  setAspect(aspect: Aspect): void
  // 모션
  setMotionType(type: MotionType): void
  setDuration(d: Duration): void
  saveFrame(slot: FrameSlot): void
  clearFrame(slot: FrameSlot): void
  // 장면 설명·프롬프트
  setAction(text: string): void
  setMood(text: string): void
  editPrompt(text: string): void
  resetPrompt(): void
  // CUT
  addCut(): void
  duplicateCut(id: string): void
  selectCut(id: string): void
  renameCut(id: string, name: string): void
  deleteCut(id: string): void
  resetActiveCut(): void
  setProjectName(name: string): void
  replaceProject(p: Project): void
}

export interface StoreState extends Project, Actions {}

export const activeCut = (s: Pick<Project, 'cuts' | 'activeCutId'>): Cut => s.cuts.find((c) => c.id === s.activeCutId) ?? s.cuts[0]

export function createSceneStore(initial: Project = createProject()) {
  return create<StoreState>()((set, get) => {
    const updateActive = (fn: (c: Cut) => Partial<Cut>) =>
      set((s) => ({ cuts: s.cuts.map((c) => (c.id === s.activeCutId ? { ...c, ...fn(c), updatedAt: Date.now() } : c)) }))
    const updateMotion = (fn: (c: Cut) => Partial<Cut['motion']>) => updateActive((c) => ({ motion: { ...c.motion, ...fn(c) } }))
    const editMode = () => playback.stop()

    return {
      ...initial,

      setCamera: (patch) => {
        editMode()
        updateActive((c) => ({ camera: clampCamera({ ...c.camera, ...patch }) }))
      },
      applyCameraPreset: (key) => get().setCamera({ angle: CAMERA_PRESETS[key].angle }),
      resetCamera: () => get().setCamera({ ...DEFAULT_CAMERA }),
      setLighting: (patch) => {
        editMode()
        updateActive((c) => ({ lighting: clampLighting({ ...c.lighting, ...patch }) }))
      },
      applyLightingPreset: (preset) => {
        editMode()
        updateActive((c) => ({ lighting: applyLightingPreset(c.lighting, preset) }))
      },
      setAspect: (aspect) =>
        updateActive((c) => ({
          aspect,
          motion: {
            ...c.motion,
            start: c.motion.start && { ...c.motion.start, aspect },
            end: c.motion.end && { ...c.motion.end, aspect },
          },
        })),

      setMotionType: (type) => updateMotion(() => ({ type })),
      setDuration: (duration) => {
        playback.setDuration(duration)
        updateMotion(() => ({ duration }))
      },
      /** 편집 모드면 현재 슬라이더 구도, 모션 미리보기 중이면 타임라인 위치의 구도를 저장 */
      saveFrame: (slot) => {
        const cut = activeCut(get())
        let frame = frameFromSettings(cut.camera, cut.lighting, cut.aspect)
        if (playback.status !== 'idle') {
          const pose = evaluateMotion(cut.motion, playback.progress)
          if (pose) frame = { position: pose.position, target: pose.target, fov: pose.fov, lighting: pose.lighting, aspect: cut.aspect }
        }
        editMode()
        updateMotion(() => ({ [slot]: frame }))
      },
      clearFrame: (slot) => {
        editMode()
        updateMotion(() => ({ [slot]: null }))
      },

      setAction: (action) => updateActive(() => ({ action })),
      setMood: (mood) => updateActive(() => ({ mood })),
      editPrompt: (text) => updateActive(() => ({ prompt: { text, edited: true } })),
      resetPrompt: () => updateActive(() => ({ prompt: { text: '', edited: false } })),

      addCut: () => {
        editMode()
        set((s) => {
          const base = activeCut(s)
          // 현재 카메라·조명 구도를 이어받아 새 장면을 시작
          const cut = createCut(s.cuts.length, { camera: { ...base.camera }, lighting: { ...base.lighting }, aspect: base.aspect })
          return { cuts: [...s.cuts, cut], activeCutId: cut.id }
        })
      },
      duplicateCut: (id) => {
        editMode()
        set((s) => {
          const src = s.cuts.find((c) => c.id === id)
          if (!src) return s
          const copy: Cut = { ...structuredClone(src), id: newId(), name: `${src.name} 복사본`, updatedAt: Date.now() }
          const idx = s.cuts.indexOf(src)
          return { cuts: [...s.cuts.slice(0, idx + 1), copy, ...s.cuts.slice(idx + 1)], activeCutId: copy.id }
        })
      },
      selectCut: (id) => {
        if (!get().cuts.some((c) => c.id === id)) return
        editMode()
        set({ activeCutId: id })
        playback.setDuration(activeCut(get()).motion.duration)
      },
      renameCut: (id, name) => set((s) => ({ cuts: s.cuts.map((c) => (c.id === id ? { ...c, name } : c)) })),
      deleteCut: (id) => {
        editMode()
        set((s) => {
          const idx = s.cuts.findIndex((c) => c.id === id)
          if (idx < 0) return s
          if (s.cuts.length === 1) {
            const fresh = createCut(0)
            return { cuts: [fresh], activeCutId: fresh.id }
          }
          const cuts = s.cuts.filter((c) => c.id !== id)
          const activeCutId = s.activeCutId === id ? cuts[Math.max(0, idx - 1)].id : s.activeCutId
          return { cuts, activeCutId }
        })
        playback.setDuration(activeCut(get()).motion.duration)
      },
      resetActiveCut: () => {
        editMode()
        updateActive((c) => ({
          camera: { ...DEFAULT_CAMERA },
          lighting: { ...DEFAULT_LIGHTING },
          aspect: '16:9',
          motion: { type: 'fixed', duration: 5, start: null, end: null },
          prompt: c.prompt.edited ? c.prompt : { text: '', edited: false },
        }))
        playback.setDuration(5)
      },
      setProjectName: (projectName) => set({ projectName }),
      replaceProject: (p) => {
        editMode()
        set({ ...p })
      },
    }
  })
}

export const toProject = (s: StoreState): Project => ({
  version: s.version,
  projectName: s.projectName,
  cuts: s.cuts,
  activeCutId: s.activeCutId,
})

/** 상태 변경 시 debounce 자동 저장. 반환값: 즉시 저장 함수 + 해제 함수 */
export function attachAutosave(
  store: ReturnType<typeof createSceneStore>,
  onResult: (error: string | null, at: number) => void,
  storage?: KeyValueStorage | null,
  delay = 400,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    onResult(saveProject(toProject(store.getState()), storage), Date.now())
  }
  const unsub = store.subscribe((s, prev) => {
    if (s.cuts === prev.cuts && s.projectName === prev.projectName && s.activeCutId === prev.activeCutId) return
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  })
  return { flush, dispose: () => (clearTimeout(timer), unsub()) }
}

const loaded = loadProject()
export const initialLoadSource = loaded.source
export const useStore = createSceneStore(loaded.project)
playback.setDuration(activeCut(useStore.getState()).motion.duration)

export const useActiveCut = () => useStore((s) => activeCut(s))
export { cutName }
