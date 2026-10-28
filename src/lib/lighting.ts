import type { LightingPreset, LightingSettings, Tone, Vec3 } from '../types/scene'
import { clamp, toRad, wrapAngle } from './camera'

export const LIGHTING_PRESETS: Record<LightingPreset, { label: string; direction: number; elevation: number; en: string }> = {
  front: { label: '정면광', direction: 0, elevation: 30, en: 'soft frontal key lighting' },
  side: { label: '측광', direction: 90, elevation: 15, en: 'dramatic side lighting' },
  back: { label: '역광', direction: 180, elevation: 35, en: 'backlighting with a soft fill and a glowing rim' },
  rembrandt: { label: '렘브란트', direction: 45, elevation: 45, en: 'Rembrandt lighting with a sculpted triangle of light on the cheek' },
}

export const TONES: Record<Tone, { label: string; color: string; en: string; kelvin: number }> = {
  warm: { label: 'Warm', color: '#ffc68f', en: 'warm', kelvin: 3200 },
  neutral: { label: 'Neutral', color: '#fff3e2', en: 'neutral', kelvin: 4800 },
  cool: { label: 'Cool', color: '#b6d6ff', en: 'cool', kelvin: 6500 },
}

export const DEFAULT_LIGHTING: LightingSettings = {
  preset: 'rembrandt',
  intensity: 3.5,
  direction: LIGHTING_PRESETS.rembrandt.direction,
  tone: 'warm',
}

export const LIGHT_LIMITS = { intensity: { min: 0, max: 8, step: 0.1 }, direction: { min: -180, max: 180, step: 1 } }

const KEY_LIGHT_RADIUS = 4.2
const KEY_TARGET_HEIGHT = 1.2

/** 프리셋 선택 시 방향을 프리셋 기본값으로 맞춘다. 밝기·색온도는 유지 */
export function applyLightingPreset(current: LightingSettings, preset: LightingPreset): LightingSettings {
  return { ...current, preset, direction: LIGHTING_PRESETS[preset].direction }
}

export function clampLighting(l: LightingSettings): LightingSettings {
  return {
    ...l,
    intensity: clamp(l.intensity, LIGHT_LIMITS.intensity.min, LIGHT_LIMITS.intensity.max),
    direction: wrapAngle(l.direction),
  }
}

/** 키 라이트의 월드 좌표 (피사체 원점 기준 구면 좌표) */
export function keyLightPosition(l: LightingSettings): Vec3 {
  const az = toRad(l.direction)
  const el = toRad(LIGHTING_PRESETS[l.preset].elevation)
  const r = KEY_LIGHT_RADIUS
  return [Math.sin(az) * Math.cos(el) * r, KEY_TARGET_HEIGHT + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r]
}

export const KEY_LIGHT_TARGET: Vec3 = [0, KEY_TARGET_HEIGHT, 0]

/** 0~1 RGB */
export function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function toneColor(tone: Tone): Vec3 {
  return hexToRgb(TONES[tone].color)
}

/** 모션 중 색온도 보간에 사용 */
export function mixToneColor(a: Tone, b: Tone, t: number): Vec3 {
  const ca = toneColor(a)
  const cb = toneColor(b)
  return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]
}

/** 렌더러에 적용할 실제 라이트 값 */
export interface LightRigState {
  keyPosition: Vec3
  keyIntensity: number
  keyColor: Vec3
}

export function lightRigState(l: LightingSettings, color?: Vec3): LightRigState {
  return {
    keyPosition: keyLightPosition(l),
    // 감쇠 없는(decay 0) 스포트라이트 기준 UI 밝기 → three.js intensity 보정
    keyIntensity: l.intensity * 0.6,
    keyColor: color ?? toneColor(l.tone),
  }
}
