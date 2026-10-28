import { describe, expect, it } from 'vitest'
import { DEFAULT_LIGHTING, LIGHTING_PRESETS, applyLightingPreset, clampLighting, keyLightPosition, lightRigState, toneColor } from './lighting'

describe('조명 설정', () => {
  it('프리셋 적용 시 방향만 바뀌고 밝기·색온도는 유지', () => {
    const l = applyLightingPreset({ ...DEFAULT_LIGHTING, intensity: 6, tone: 'cool' }, 'side')
    expect(l).toEqual({ preset: 'side', intensity: 6, direction: 90, tone: 'cool' })
  })
  it('정면광은 피사체 앞(+z), 역광은 뒤(-z)에서 비춘다', () => {
    expect(keyLightPosition({ ...DEFAULT_LIGHTING, preset: 'front', direction: 0 })[2]).toBeGreaterThan(2)
    expect(keyLightPosition({ ...DEFAULT_LIGHTING, preset: 'back', direction: 180 })[2]).toBeLessThan(-2)
  })
  it('렘브란트는 45° 측상방', () => {
    const p = keyLightPosition(applyLightingPreset(DEFAULT_LIGHTING, 'rembrandt'))
    expect(p[0]).toBeCloseTo(p[2])
    expect(p[1]).toBeGreaterThan(3)
  })
  it('방향을 바꾸면 라이트 위치가 회전한다', () => {
    const a = keyLightPosition({ ...DEFAULT_LIGHTING, direction: 0 })
    const b = keyLightPosition({ ...DEFAULT_LIGHTING, direction: -90 })
    expect(b[0]).toBeCloseTo(-a[2])
    expect(b[1]).toBeCloseTo(a[1])
  })
  it('밝기와 색온도는 렌더 상태에 반영된다', () => {
    const warm = lightRigState({ ...DEFAULT_LIGHTING, intensity: 2, tone: 'warm' })
    const cool = lightRigState({ ...DEFAULT_LIGHTING, intensity: 4, tone: 'cool' })
    expect(cool.keyIntensity).toBeCloseTo(warm.keyIntensity * 2)
    expect(warm.keyColor[0]).toBeGreaterThan(warm.keyColor[2])
    expect(cool.keyColor[2]).toBeGreaterThan(cool.keyColor[0])
    expect(toneColor('neutral')).toHaveLength(3)
  })
  it('밝기 범위 보정', () => {
    expect(clampLighting({ ...DEFAULT_LIGHTING, intensity: 20, direction: 200 })).toMatchObject({ intensity: 8, direction: -160 })
    expect(Object.keys(LIGHTING_PRESETS)).toEqual(['front', 'side', 'back', 'rembrandt'])
  })
})
