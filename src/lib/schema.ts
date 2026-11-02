import { z } from 'zod'
import { PROJECT_VERSION, type Actor, type Cut, type Project } from '../types/scene'
import { DEFAULT_CAMERA, STAGE_LIMIT, clamp, clampCamera, wrapAngle } from './camera'
import { DEFAULT_LIGHTING, LIGHTING_PRESETS, clampLighting } from './lighting'
import { isValidFrame } from './motion'

const finite = z.number().finite()
const vec3 = z.tuple([finite, finite, finite])
const presetSchema = z.enum(['front', 'side', 'back', 'rembrandt'])
const toneSchema = z.enum(['warm', 'neutral', 'cool'])
const aspectSchema = z.enum(['16:9', '9:16'])
const motionTypeSchema = z.enum(['fixed', 'dolly', 'truck', 'pedestal', 'orbit'])
const durationSchema = z.union([z.literal(3), z.literal(5), z.literal(8)])

export const cameraSchema = z.object({
  distance: finite,
  height: finite,
  angle: finite,
  targetHeight: finite,
  fov: finite,
  // v4 추가: v3 데이터는 원점 기준
  focus: z.tuple([finite, finite]).default([0, 0]),
})

export const lightingSchema = z.object({
  preset: presetSchema,
  intensity: finite,
  direction: finite,
  tone: toneSchema,
})

export const frameSchema = z.object({
  position: vec3,
  target: vec3,
  fov: finite,
  lighting: lightingSchema,
  aspect: aspectSchema,
})

export const actorSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  x: finite,
  z: finite,
  rotation: finite,
  outfit: z.number().int().nonnegative(),
})

export const cutSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  camera: cameraSchema,
  lighting: lightingSchema,
  aspect: aspectSchema,
  // v4 추가 필드 (v3 → 기본값으로 마이그레이션)
  environment: z.enum(['indoor', 'outdoor']).default('indoor'),
  actors: z.array(actorSchema).max(12).optional(),
  motion: z.object({
    type: motionTypeSchema,
    duration: durationSchema,
    start: frameSchema.nullable(),
    end: frameSchema.nullable(),
  }),
  action: z.string(),
  mood: z.string(),
  prompt: z.object({ text: z.string(), edited: z.boolean() }),
  updatedAt: finite,
})

export const STORAGE_KEY = 'scene-preview-project'
/** Codex로 구현된 기존 버전(배포본)의 zustand persist 키 */
export const LEGACY_STORAGE_KEY = 'scene-preview-project-v1'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const cutName = (index: number) => `CUT ${String(index + 1).padStart(2, '0')}`

export const MAX_ACTORS = 6

/** 인물 의상 팔레트 */
export const ACTOR_OUTFITS = [
  { label: '아이보리', top: '#e8dcc8', bottom: '#26282d', hair: '#3a2a20', skin: '#e3b593' },
  { label: '네이비', top: '#2f4a68', bottom: '#c9b79c', hair: '#16110d', skin: '#c99272' },
  { label: '테라코타', top: '#b5573b', bottom: '#3b3f46', hair: '#5a3a24', skin: '#efc3a2' },
  { label: '세이지', top: '#8aa37f', bottom: '#4a4038', hair: '#201812', skin: '#d6a37f' },
  { label: '블랙', top: '#24262a', bottom: '#24262a', hair: '#0f0c0a', skin: '#e9be9c' },
  { label: '라벤더', top: '#a993d9', bottom: '#e9e4da', hair: '#6b4a2e', skin: '#f0caa8' },
] as const

export function createActor(index: number, partial: Partial<Actor> = {}): Actor {
  return { id: newId(), name: `인물 ${index + 1}`, x: 0, z: 0, rotation: 0, outfit: index % ACTOR_OUTFITS.length, ...partial }
}

export function clampActor(a: Actor): Actor {
  return {
    ...a,
    x: clamp(a.x, -STAGE_LIMIT, STAGE_LIMIT),
    z: clamp(a.z, -STAGE_LIMIT, STAGE_LIMIT),
    rotation: wrapAngle(a.rotation),
    outfit: Math.min(ACTOR_OUTFITS.length - 1, Math.max(0, Math.round(a.outfit))),
  }
}

export function createCut(index: number, partial: Partial<Cut> = {}): Cut {
  return {
    id: newId(),
    name: cutName(index),
    camera: { ...DEFAULT_CAMERA },
    lighting: { ...DEFAULT_LIGHTING },
    aspect: '16:9',
    environment: 'indoor',
    actors: [createActor(0)],
    motion: { type: 'fixed', duration: 5, start: null, end: null },
    action: '인물이 카메라를 바라보며 천천히 미소 짓는다.',
    mood: '따뜻하고 영화 같은 분위기',
    prompt: { text: '', edited: false },
    updatedAt: Date.now(),
    ...partial,
  }
}

export function createProject(): Project {
  const cut = createCut(0)
  return { version: PROJECT_VERSION, projectName: 'The quiet moment', cuts: [cut], activeCutId: cut.id }
}

/** 값 범위 보정 + 손상된 프레임 제거 */
function sanitizeCut(cut: Cut): Cut {
  const motion = {
    ...cut.motion,
    start: isValidFrame(cut.motion.start) ? cut.motion.start : null,
    end: isValidFrame(cut.motion.end) ? cut.motion.end : null,
  }
  return { ...cut, camera: clampCamera(cut.camera), lighting: clampLighting(cut.lighting), actors: cut.actors.map(clampActor), motion }
}

function finalize(projectName: unknown, rawCuts: unknown[], activeId: unknown): Project {
  const cuts = rawCuts.flatMap((c) => {
    const r = cutSchema.safeParse(c)
    if (!r.success) return []
    // v3 이하: 인물 정보가 없으면 원점에 기본 인물 1명
    const actors = r.data.actors ?? [createActor(0)]
    return [sanitizeCut({ ...r.data, actors } as Cut)]
  })
  if (cuts.length === 0) return createProject()
  const active = cuts.some((c) => c.id === activeId) ? (activeId as string) : cuts[0].id
  return {
    version: PROJECT_VERSION,
    projectName: typeof projectName === 'string' && projectName.trim() ? projectName : 'Untitled project',
    cuts,
    activeCutId: active,
  }
}

// ---------- 기존(Codex) 버전 마이그레이션 ----------
// 기존 저장 형식: { state: { projectName, shot, motion, cuts: [{id,name,shot,motion}], selectedId }, version: 0~2 }
// shot: { distance, height, angle, targetHeight, fov, lighting, brightness, tone, aspect, description, prompt }
// motion: { type, duration, start: LegacyFrame, end: LegacyFrame }
// LegacyFrame: { position, target, fov, settings?: { lighting, brightness, tone, aspect } }

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback

function legacyLighting(src: Rec) {
  const preset = oneOf(src.lighting, ['front', 'side', 'back', 'rembrandt'] as const, DEFAULT_LIGHTING.preset)
  return {
    preset,
    intensity: num(src.brightness, DEFAULT_LIGHTING.intensity),
    direction: LIGHTING_PRESETS[preset].direction,
    tone: oneOf(src.tone, ['warm', 'neutral', 'cool'] as const, DEFAULT_LIGHTING.tone),
  }
}

function legacyFrame(f: unknown, shot: Rec) {
  if (!isRec(f)) return null
  const settings = isRec(f.settings) ? f.settings : shot
  const frame = {
    position: f.position,
    target: f.target,
    fov: num(f.fov, NaN),
    lighting: legacyLighting(settings),
    aspect: oneOf(settings.aspect, ['16:9', '9:16'] as const, '16:9'),
  }
  const r = frameSchema.safeParse(frame)
  return r.success && isValidFrame(r.data) ? r.data : null
}

function legacyCut(src: { id?: unknown; name?: unknown; shot?: unknown; motion?: unknown }, index: number): Cut {
  const shot = isRec(src.shot) ? src.shot : {}
  const m = isRec(src.motion) ? src.motion : {}
  const type = oneOf(m.type, ['fixed', 'dolly', 'truck', 'pedestal', 'orbit'] as const, 'fixed')
  const duration = [3, 5, 8].includes(m.duration as number) ? (m.duration as 3 | 5 | 8) : 5
  const start = legacyFrame(m.start, shot)
  const legacyPrompt = typeof shot.prompt === 'string' ? shot.prompt.trim() : ''
  return createCut(index, {
    id: typeof src.id === 'string' && src.id ? src.id : newId(),
    name: typeof src.name === 'string' && src.name ? src.name : cutName(index),
    camera: clampCamera({
      distance: num(shot.distance, DEFAULT_CAMERA.distance),
      height: num(shot.height, DEFAULT_CAMERA.height),
      angle: num(shot.angle, DEFAULT_CAMERA.angle),
      targetHeight: num(shot.targetHeight, DEFAULT_CAMERA.targetHeight),
      fov: num(shot.fov, DEFAULT_CAMERA.fov),
      focus: [0, 0],
    }),
    lighting: legacyLighting(shot),
    aspect: oneOf(shot.aspect, ['16:9', '9:16'] as const, '16:9'),
    // 기존 fixed 기본값은 start=end=현재 구도였으므로 종료 프레임은 비운다
    motion: { type, duration, start, end: type === 'fixed' ? null : legacyFrame(m.end, shot) },
    // 기존 버전은 행동·분위기를 하나의 설명으로 저장했다
    action: typeof shot.description === 'string' ? shot.description : '',
    mood: '',
    prompt: legacyPrompt ? { text: legacyPrompt, edited: true } : { text: '', edited: false },
  })
}

export function migrateLegacy(raw: unknown): Project {
  const state = isRec(raw) && isRec(raw.state) ? raw.state : isRec(raw) ? raw : {}
  const legacyCuts = Array.isArray(state.cuts) ? state.cuts.filter(isRec) : []
  const cuts = legacyCuts.map((c, i) => legacyCut(c, i))
  let activeId: unknown = state.selectedId
  // 저장되지 않은 작업 중 구도는 별도 CUT으로 보존
  if (isRec(state.shot) && (cuts.length === 0 || !state.selectedId)) {
    const draft = legacyCut({ shot: state.shot, motion: state.motion, name: cuts.length ? '작업 중 장면 (가져옴)' : undefined }, cuts.length)
    cuts.push(draft)
    activeId = draft.id
  }
  return finalize(state.projectName, cuts, activeId)
}

/** 저장된 원시 데이터를 현재 버전 Project로 변환. 알 수 없는 형식이면 기본 프로젝트 */
export function migrateProject(raw: unknown): Project {
  if (!isRec(raw)) return createProject()
  // v3(배경·인물·피사체 기준점 없음)은 스키마 기본값으로 v4가 된다
  if ((raw.version === PROJECT_VERSION || raw.version === 3) && Array.isArray(raw.cuts)) return finalize(raw.projectName, raw.cuts, raw.activeCutId)
  if (isRec(raw.state) || 'shot' in raw) return migrateLegacy(raw)
  return createProject()
}
