import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Aspect, CameraSettings, Frame, LightingSettings, MotionSettings, MotionType, ShotPose, Vec3 } from '../types/scene'
import { cameraPosition, cameraTarget, wrapAngle } from './camera'
import { mixToneColor, toneColor } from './lighting'

export const MOTION_TYPES: Record<MotionType, { label: string; ko: string; hint: string }> = {
  fixed: { label: 'Fixed', ko: '고정', hint: '시작 구도에서 카메라가 움직이지 않습니다.' },
  dolly: { label: 'Dolly In / Out', ko: '돌리', hint: '시선 방향으로 앞뒤 이동합니다. 종료 프레임은 시선 축으로 보정됩니다.' },
  truck: { label: 'Truck Left / Right', ko: '트럭', hint: '시선과 수직인 좌우로 평행 이동합니다.' },
  pedestal: { label: 'Pedestal Up / Down', ko: '페데스탈', hint: '카메라와 시선이 함께 수직 이동합니다.' },
  orbit: { label: 'Orbit', ko: '오빗', hint: '피사체를 중심으로 원을 그리며 회전합니다.' },
}

export const DURATIONS = [3, 5, 8] as const

/** 종료 프레임을 지정하지 않았을 때 자동 이동량 */
export const AUTO_MOTION = { dollyRatio: 0.4, truck: 1.5, pedestal: 0.9, orbitDeg: 60 }

const MIN_TARGET_DISTANCE = 0.3

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

export function frameFromSettings(camera: CameraSettings, lighting: LightingSettings, aspect: Aspect): Frame {
  return { position: cameraPosition(camera), target: cameraTarget(camera), fov: camera.fov, lighting: { ...lighting }, aspect }
}

export function poseFromSettings(camera: CameraSettings, lighting: LightingSettings): ShotPose {
  return { position: cameraPosition(camera), target: cameraTarget(camera), fov: camera.fov, lighting }
}

export function isValidFrame(f: Frame | null | undefined): f is Frame {
  if (!f) return false
  const finite = (v: Vec3) => v.length === 3 && v.every((n) => Number.isFinite(n) && Math.abs(n) <= 1000)
  return finite(f.position) && finite(f.target) && f.fov >= 10 && f.fov <= 120 && Math.hypot(...sub(f.position, f.target)) > 0.05
}

/** 시선의 수평 단위 벡터 */
function horizontalForward(f: Frame): Vec3 {
  const d = sub(f.target, f.position)
  const len = Math.hypot(d[0], d[2]) || 1
  return [d[0] / len, 0, d[2] / len]
}

/** 움직임 종류의 이동 축 (orbit/fixed 제외) */
function motionAxis(type: MotionType, start: Frame): Vec3 {
  const fwd = horizontalForward(start)
  if (type === 'dolly') return fwd
  if (type === 'truck') return [-fwd[2], 0, fwd[0]] // 화면 기준 오른쪽
  return [0, 1, 0]
}

function autoEnd(type: MotionType, start: Frame): Frame {
  if (type === 'orbit') return orbitFrame(start, AUTO_MOTION.orbitDeg)
  const axis = motionAxis(type, start)
  const amount =
    type === 'dolly'
      ? Math.hypot(start.target[0] - start.position[0], start.target[2] - start.position[2]) * AUTO_MOTION.dollyRatio
      : type === 'truck'
        ? AUTO_MOTION.truck
        : AUTO_MOTION.pedestal
  return translateFrame(start, axis, amount, type !== 'dolly')
}

function translateFrame(f: Frame, axis: Vec3, amount: number, moveTarget: boolean): Frame {
  const offset = scale(axis, amount)
  return { ...f, position: add(f.position, offset), target: moveTarget ? add(f.target, offset) : [...f.target] }
}

function orbitFrame(start: Frame, deg: number): Frame {
  const rel = sub(start.position, start.target)
  const a = (deg * Math.PI) / 180
  const x = rel[0] * Math.cos(a) + rel[2] * Math.sin(a)
  const z = -rel[0] * Math.sin(a) + rel[2] * Math.cos(a)
  return { ...start, position: [start.target[0] + x, start.position[1], start.target[2] + z] }
}

/**
 * 실제 100% 시점의 종료 프레임.
 * - fixed: 시작과 동일(조명·화각만 종료 프레임 값 사용 가능)
 * - dolly/truck/pedestal: 사용자 종료 위치를 움직임 축으로 투영해 순수한 움직임으로 보정
 * - orbit: 사용자 종료 프레임 그대로
 * - 종료 프레임 미지정: 종류별 자동 이동량
 */
export function resolveEndFrame(motion: MotionSettings): Frame | null {
  const { start, end, type } = motion
  if (!isValidFrame(start)) return null
  if (type === 'fixed') return end && isValidFrame(end) ? { ...start, fov: end.fov, lighting: end.lighting } : { ...start }
  if (!isValidFrame(end)) return autoEnd(type, start)
  if (type === 'orbit') return end

  const axis = motionAxis(type, start)
  let amount = dot(sub(end.position, start.position), axis)
  if (type === 'dolly') {
    // 시선 지점을 지나치지 않도록 제한
    const maxForward = Math.hypot(...sub(start.target, start.position)) - MIN_TARGET_DISTANCE
    amount = Math.min(amount, maxForward)
  }
  return { ...translateFrame(start, axis, amount, type !== 'dolly'), fov: end.fov, lighting: end.lighting, aspect: end.aspect }
}

export function lerpLighting(a: LightingSettings, b: LightingSettings, t: number): LightingSettings {
  const delta = wrapAngle(b.direction - a.direction)
  return {
    preset: t < 0.5 ? a.preset : b.preset,
    tone: t < 0.5 ? a.tone : b.tone,
    intensity: lerp(a.intensity, b.intensity, t),
    direction: wrapAngle(a.direction + delta * t),
  }
}

export interface EvaluatedPose extends ShotPose {
  quaternion: [number, number, number, number]
  /** 색온도 보간 결과 (0~1 RGB) */
  lightColor: Vec3
  progress: number
}

const _m = new Matrix4()
const _q = new Quaternion()
const _eye = new Vector3()
const _target = new Vector3()
const _up = new Vector3(0, 1, 0)

export function lookAtQuaternion(position: Vec3, target: Vec3): [number, number, number, number] {
  _m.lookAt(_eye.set(...position), _target.set(...target), _up)
  _q.setFromRotationMatrix(_m)
  return [_q.x, _q.y, _q.z, _q.w]
}

/** 타임라인 진행률(0~1)에 따른 정확한 카메라 상태 */
export function evaluateMotion(motion: MotionSettings, progress: number): EvaluatedPose | null {
  const start = motion.start
  const end = resolveEndFrame(motion)
  if (!isValidFrame(start) || !end) return null
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const t = smoothstep(p)

  let position: Vec3
  let target: Vec3
  if (motion.type === 'orbit') {
    target = lerp3(start.target, end.target, t)
    const rs = sub(start.position, start.target)
    const re = sub(end.position, end.target)
    const a0 = Math.atan2(rs[0], rs[2])
    let da = Math.atan2(re[0], re[2]) - a0
    if (da > Math.PI) da -= Math.PI * 2
    if (da < -Math.PI) da += Math.PI * 2
    const radius = lerp(Math.hypot(rs[0], rs[2]), Math.hypot(re[0], re[2]), t)
    const a = a0 + da * t
    position = [target[0] + Math.sin(a) * radius, lerp(start.position[1], end.position[1], t), target[2] + Math.cos(a) * radius]
  } else {
    position = lerp3(start.position, end.position, t)
    target = lerp3(start.target, end.target, t)
  }

  const lighting = lerpLighting(start.lighting, end.lighting, t)
  const lightColor = start.lighting.tone === end.lighting.tone ? toneColor(start.lighting.tone) : mixToneColor(start.lighting.tone, end.lighting.tone, t)
  return {
    position,
    target,
    fov: lerp(start.fov, end.fov, t),
    lighting,
    lightColor,
    quaternion: lookAtQuaternion(position, target),
    progress: p,
  }
}

export function canPlay(motion: MotionSettings): boolean {
  return isValidFrame(motion.start)
}
