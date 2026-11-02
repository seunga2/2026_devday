import { describe, expect, it } from 'vitest'
import { DEFAULT_CAMERA, cameraFromGround, cameraPosition, cameraTarget, clampCamera, fovToFocalLength, tiltDegrees, wrapAngle } from './camera'

describe('촬영 카메라 위치·시점 계산', () => {
  it('정면(0°)은 +z 방향, 측면(90°)은 +x 방향에 위치한다', () => {
    const front = cameraPosition({ ...DEFAULT_CAMERA, angle: 0, distance: 4, height: 1.6 })
    expect(front[0]).toBeCloseTo(0)
    expect(front[1]).toBe(1.6)
    expect(front[2]).toBeCloseTo(4)
    const side = cameraPosition({ ...DEFAULT_CAMERA, angle: 90, distance: 4 })
    expect(side[0]).toBeCloseTo(4)
    expect(side[2]).toBeCloseTo(0)
  })
  it('후면(180°)은 피사체 뒤쪽에 위치한다', () => {
    expect(cameraPosition({ ...DEFAULT_CAMERA, angle: 180, distance: 3 })[2]).toBeCloseTo(-3)
  })
  it('시선 지점은 피사체 위 시선 높이', () => {
    expect(cameraTarget({ ...DEFAULT_CAMERA, targetHeight: 1.4 })).toEqual([0, 1.4, 0])
  })
  it('수평 거리는 distance와 같다', () => {
    const p = cameraPosition({ ...DEFAULT_CAMERA, angle: 37, distance: 5.2 })
    expect(Math.hypot(p[0], p[2])).toBeCloseTo(5.2)
  })
  it('범위를 벗어난 값은 보정하고 각도는 -180~180으로 정규화', () => {
    const c = clampCamera({ distance: 100, height: -1, angle: 270, targetHeight: 9, fov: 5, focus: [20, -1] })
    expect(c).toEqual({ distance: 9, height: 0.3, angle: -90, targetHeight: 2.2, fov: 15, focus: [6.5, -1] })
    expect(wrapAngle(-190)).toBe(170)
    expect(wrapAngle(180)).toBe(180)
  })
  it('하이앵글은 양수 틸트, FOV→초점거리 환산', () => {
    expect(tiltDegrees([0, 3, 3], [0, 0, 0])).toBeCloseTo(45)
    expect(tiltDegrees([0, 1, 3], [0, 1, 0])).toBeCloseTo(0)
    expect(fovToFocalLength(2 * Math.atan(12 / 50) * (180 / Math.PI))).toBeCloseTo(50)
  })
  it('피사체 기준점(focus)을 옮기면 카메라·시선이 함께 이동', () => {
    const c = { ...DEFAULT_CAMERA, angle: 0, distance: 3, focus: [2, -1] as [number, number] }
    expect(cameraPosition(c)).toEqual([2, c.height, 2])
    expect(cameraTarget(c)).toEqual([2, c.targetHeight, -1])
  })
  it('삼각대를 바닥 위치로 옮기면 거리·각도가 역산된다', () => {
    const c = { ...DEFAULT_CAMERA, focus: [1, 1] as [number, number] }
    expect(cameraFromGround(c, 1, 5)).toEqual({ distance: 4, angle: 0 })
    const r = cameraFromGround(c, 4, 1)
    expect(r.distance).toBeCloseTo(3)
    expect(r.angle).toBeCloseTo(90)
    // 역산한 값으로 다시 계산하면 같은 위치
    const p = cameraPosition({ ...c, ...cameraFromGround(c, -2.3, 3.7) })
    expect(p[0]).toBeCloseTo(-2.3, 1)
    expect(p[2]).toBeCloseTo(3.7, 1)
  })
})
