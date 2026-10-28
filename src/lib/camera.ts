import type { CameraSettings, Vec3 } from '../types/scene'

export const DEFAULT_CAMERA: CameraSettings = {
  distance: 5.8,
  height: 2.1,
  angle: 22,
  targetHeight: 1.25,
  fov: 42,
}

export const CAMERA_LIMITS = {
  distance: { min: 1.2, max: 9, step: 0.1 },
  height: { min: 0.3, max: 4.5, step: 0.05 },
  angle: { min: -180, max: 180, step: 1 },
  targetHeight: { min: 0.2, max: 2.2, step: 0.05 },
  fov: { min: 15, max: 90, step: 1 },
} as const

export type CameraPresetKey = 'front' | 'side' | 'back'

export const CAMERA_PRESETS: Record<CameraPresetKey, { label: string; angle: number }> = {
  front: { label: '정면', angle: 0 },
  side: { label: '측면', angle: 90 },
  back: { label: '후면', angle: 180 },
}

export const SUBJECT_POSITION: Vec3 = [0, 0, 0]

export const toRad = (deg: number) => (deg * Math.PI) / 180
export const toDeg = (rad: number) => (rad * 180) / Math.PI
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** -180~180 범위로 정규화 */
export function wrapAngle(deg: number): number {
  const w = ((((deg + 180) % 360) + 360) % 360) - 180
  return w === -180 ? 180 : w
}

export function cameraPosition(c: CameraSettings): Vec3 {
  const a = toRad(c.angle)
  return [SUBJECT_POSITION[0] + Math.sin(a) * c.distance, c.height, SUBJECT_POSITION[2] + Math.cos(a) * c.distance]
}

export function cameraTarget(c: CameraSettings): Vec3 {
  return [SUBJECT_POSITION[0], c.targetHeight, SUBJECT_POSITION[2]]
}

export function clampCamera(c: CameraSettings): CameraSettings {
  const L = CAMERA_LIMITS
  return {
    distance: clamp(c.distance, L.distance.min, L.distance.max),
    height: clamp(c.height, L.height.min, L.height.max),
    angle: wrapAngle(c.angle),
    targetHeight: clamp(c.targetHeight, L.targetHeight.min, L.targetHeight.max),
    fov: clamp(c.fov, L.fov.min, L.fov.max),
  }
}

/** 카메라가 피사체를 내려다보는(+) / 올려다보는(-) 각도 (deg) */
export function tiltDegrees(position: Vec3, target: Vec3): number {
  const dx = target[0] - position[0]
  const dy = target[1] - position[1]
  const dz = target[2] - position[2]
  return toDeg(Math.atan2(-dy, Math.hypot(dx, dz)))
}

/** 수직 화각 → 35mm 환산 초점거리 (센서 높이 24mm 기준) */
export function fovToFocalLength(fov: number): number {
  return 12 / Math.tan(toRad(fov) / 2)
}

export const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
