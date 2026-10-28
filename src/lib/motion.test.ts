import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { Frame, MotionSettings } from '../types/scene'
import { DEFAULT_CAMERA, distance3 } from './camera'
import { DEFAULT_LIGHTING } from './lighting'
import { AUTO_MOTION, evaluateMotion, frameFromSettings, resolveEndFrame, smoothstep } from './motion'

const start: Frame = frameFromSettings({ ...DEFAULT_CAMERA, angle: 0, distance: 5, height: 1.5, targetHeight: 1.5 }, DEFAULT_LIGHTING, '16:9')
const m = (p: Partial<MotionSettings>): MotionSettings => ({ type: 'dolly', duration: 5, start, end: null, ...p })

describe('카메라 모션 보간', () => {
  it('0%와 100%는 정확히 시작·종료 프레임', () => {
    const end: Frame = { ...start, position: [0, 1.5, 2], fov: 30 }
    const motion = m({ end })
    expect(evaluateMotion(motion, 0)!.position).toEqual(start.position)
    const e = evaluateMotion(motion, 1)!
    expect(e.position[2]).toBeCloseTo(2)
    expect(e.fov).toBe(30)
  })
  it('smoothstep 이징: 50% 지점은 중간, 25% 지점은 선형보다 느림', () => {
    const motion = m({ end: { ...start, position: [0, 1.5, 1] } })
    expect(evaluateMotion(motion, 0.5)!.position[2]).toBeCloseTo(3)
    expect(evaluateMotion(motion, 0.25)!.position[2]).toBeGreaterThan(5 - 4 * 0.25)
    expect(smoothstep(-1)).toBe(0)
    expect(smoothstep(2)).toBe(1)
  })
  it('진행률은 0~1로 제한되고 NaN은 0', () => {
    const motion = m({})
    expect(evaluateMotion(motion, 5)!.progress).toBe(1)
    expect(evaluateMotion(motion, NaN)!.progress).toBe(0)
  })
  it('종료 프레임 미지정 시 종류별 자동 종료 프레임', () => {
    expect(resolveEndFrame(m({ type: 'dolly' }))!.position[2]).toBeCloseTo(5 - 5 * AUTO_MOTION.dollyRatio)
    const truck = resolveEndFrame(m({ type: 'truck' }))!
    expect(truck.position[0]).toBeCloseTo(AUTO_MOTION.truck) // 화면 오른쪽(+x)
    expect(truck.target[0]).toBeCloseTo(AUTO_MOTION.truck) // 시선도 함께 평행 이동
    const ped = resolveEndFrame(m({ type: 'pedestal' }))!
    expect(ped.position[1]).toBeCloseTo(1.5 + AUTO_MOTION.pedestal)
    const orbit = resolveEndFrame(m({ type: 'orbit' }))!
    expect(distance3(orbit.position, orbit.target)).toBeCloseTo(5)
    expect(Math.atan2(orbit.position[0], orbit.position[2]) * (180 / Math.PI)).toBeCloseTo(60)
  })
  it('Fixed는 전 구간 시작 위치 유지', () => {
    const motion = m({ type: 'fixed', end: { ...start, position: [3, 3, 3] } })
    expect(evaluateMotion(motion, 0.7)!.position).toEqual(start.position)
  })
  it('Dolly 종료 위치는 시선 축으로 투영되고 시선 지점을 넘지 않는다', () => {
    const r = resolveEndFrame(m({ type: 'dolly', end: { ...start, position: [2, 0.3, -10] } }))!
    expect(r.position[0]).toBeCloseTo(0)
    expect(r.position[1]).toBeCloseTo(1.5)
    expect(r.position[2]).toBeCloseTo(0.3)
  })
  it('Orbit은 반경을 유지하며 원호로 이동', () => {
    const motion = m({ type: 'orbit', end: { ...start, position: [5, 1.5, 0] } })
    for (const t of [0.2, 0.5, 0.8]) {
      const p = evaluateMotion(motion, t)!
      expect(Math.hypot(p.position[0] - p.target[0], p.position[2] - p.target[2])).toBeCloseTo(5)
    }
  })
  it('회전(quaternion)은 시선 방향과 일치', () => {
    const motion = m({ type: 'truck' })
    for (const t of [0, 0.4, 1]) {
      const p = evaluateMotion(motion, t)!
      const dir = new Vector3(0, 0, -1).applyQuaternion(new Quaternion(...p.quaternion))
      const expected = new Vector3(...p.target).sub(new Vector3(...p.position)).normalize()
      expect(dir.distanceTo(expected)).toBeLessThan(1e-6)
    }
  })
  it('조명 밝기·방향도 보간되며 방향은 최단 경로', () => {
    const end: Frame = { ...start, lighting: { ...DEFAULT_LIGHTING, intensity: 7.5, direction: -170 } }
    const s = { ...start, lighting: { ...DEFAULT_LIGHTING, intensity: 1.5, direction: 170 } }
    const p = evaluateMotion(m({ type: 'orbit', start: s, end }), 0.5)!
    expect(p.lighting.intensity).toBeCloseTo(4.5)
    expect(Math.abs(p.lighting.direction)).toBeCloseTo(180)
  })
  it('시작 프레임이 없으면 평가 불가', () => {
    expect(evaluateMotion(m({ start: null }), 0.5)).toBeNull()
  })
})
