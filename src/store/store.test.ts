import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KeyValueStorage } from '../lib/persistence'
import { playback } from '../lib/playback'
import { STORAGE_KEY } from '../lib/schema'
import { activeCut, attachAutosave, createSceneStore } from './store'

afterEach(() => playback.stop())

describe('스토어: 카메라·조명 편집', () => {
  it('카메라 슬라이더 변경은 범위 보정 후 활성 CUT에 반영되고 편집 모드로 복귀', () => {
    const s = createSceneStore()
    playback.seek(0.5)
    s.getState().setCamera({ distance: 3.3, fov: 200 })
    const c = activeCut(s.getState())
    expect(c.camera.distance).toBe(3.3)
    expect(c.camera.fov).toBe(90)
    expect(playback.status).toBe('idle')
  })
  it('카메라 프리셋·초기 구도 복원', () => {
    const s = createSceneStore()
    s.getState().applyCameraPreset('back')
    expect(activeCut(s.getState()).camera.angle).toBe(180)
    s.getState().setCamera({ height: 4 })
    s.getState().resetCamera()
    expect(activeCut(s.getState()).camera).toMatchObject({ angle: 22, height: 2.1, distance: 5.8 })
  })
  it('조명 프리셋·밝기·색온도 변경', () => {
    const s = createSceneStore()
    s.getState().applyLightingPreset('back')
    s.getState().setLighting({ intensity: 6.5, tone: 'cool' })
    expect(activeCut(s.getState()).lighting).toEqual({ preset: 'back', intensity: 6.5, direction: 180, tone: 'cool' })
    s.getState().setLighting({ direction: -30 })
    expect(activeCut(s.getState()).lighting.direction).toBe(-30)
  })
})

describe('스토어: 시작·종료 프레임', () => {
  it('편집 모드에서는 현재 구도·조명·비율을 프레임으로 저장', () => {
    const s = createSceneStore()
    s.getState().setCamera({ angle: 0, distance: 4, height: 1.5 })
    s.getState().setAspect('9:16')
    s.getState().saveFrame('start')
    const f = activeCut(s.getState()).motion.start!
    expect(f.position[2]).toBeCloseTo(4)
    expect(f.target).toEqual([0, 1.25, 0])
    expect(f.fov).toBe(42)
    expect(f.lighting.preset).toBe('rembrandt')
    expect(f.aspect).toBe('9:16')
  })
  it('모션 미리보기 중에는 타임라인 위치의 구도를 저장', () => {
    const s = createSceneStore()
    s.getState().setCamera({ angle: 0, distance: 5 })
    s.getState().saveFrame('start')
    s.getState().setMotionType('dolly')
    playback.seek(1)
    s.getState().saveFrame('end')
    expect(activeCut(s.getState()).motion.end!.position[2]).toBeCloseTo(3)
    expect(playback.status).toBe('idle')
  })
})

describe('스토어: CUT 관리', () => {
  it('추가·선택·이름 수정·복제·삭제와 CUT별 설정 복원', () => {
    const s = createSceneStore()
    const first = s.getState().activeCutId
    s.getState().setCamera({ fov: 25 })
    s.getState().setAction('sits down')
    s.getState().addCut()
    const second = s.getState().activeCutId
    expect(second).not.toBe(first)
    expect(s.getState().cuts).toHaveLength(2)
    expect(activeCut(s.getState()).name).toBe('CUT 02')
    expect(activeCut(s.getState()).camera.fov).toBe(25) // 현재 구도를 이어받음
    s.getState().setCamera({ fov: 70 })
    s.getState().selectCut(first)
    expect(activeCut(s.getState()).camera.fov).toBe(25)
    expect(activeCut(s.getState()).action).toBe('sits down')
    s.getState().selectCut(second)
    expect(activeCut(s.getState()).camera.fov).toBe(70)

    s.getState().renameCut(second, '클로즈업')
    s.getState().duplicateCut(second)
    expect(s.getState().cuts.map((c) => c.name)).toEqual(['CUT 01', '클로즈업', '클로즈업 복사본'])
    s.getState().deleteCut(s.getState().activeCutId)
    expect(activeCut(s.getState()).name).toBe('클로즈업')
    s.getState().deleteCut(first)
    s.getState().deleteCut(s.getState().activeCutId)
    expect(s.getState().cuts).toHaveLength(1) // 마지막 CUT 삭제 시 새 CUT
  })
  it('프롬프트 수정 표시 및 자동 생성 복귀', () => {
    const s = createSceneStore()
    s.getState().editPrompt('my text')
    expect(activeCut(s.getState()).prompt).toEqual({ text: 'my text', edited: true })
    s.getState().setCamera({ fov: 20 })
    expect(activeCut(s.getState()).prompt.text).toBe('my text')
    s.getState().resetActiveCut()
    expect(activeCut(s.getState()).prompt.edited).toBe(true)
    s.getState().resetPrompt()
    expect(activeCut(s.getState()).prompt.edited).toBe(false)
  })
})

describe('LocalStorage 자동 저장', () => {
  it('변경 후 debounce 저장, flush 즉시 저장', () => {
    vi.useFakeTimers()
    const data: Record<string, string> = {}
    const storage: KeyValueStorage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
    const s = createSceneStore()
    const results: (string | null)[] = []
    const auto = attachAutosave(s, (e) => results.push(e), storage, 300)
    s.getState().setCamera({ fov: 33 })
    s.getState().setCamera({ fov: 34 })
    expect(data[STORAGE_KEY]).toBeUndefined()
    vi.advanceTimersByTime(300)
    expect(JSON.parse(data[STORAGE_KEY]).cuts[0].camera.fov).toBe(34)
    expect(results).toEqual([null])
    s.getState().setProjectName('Renamed')
    auto.flush()
    expect(JSON.parse(data[STORAGE_KEY]).projectName).toBe('Renamed')
    auto.dispose()
    vi.useRealTimers()
  })
})
