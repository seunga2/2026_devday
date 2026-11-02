/**
 * 탐색 화면에서 삼각대(촬영 카메라)와 인물을 마우스로 끌어 바닥 위에서 옮긴다.
 * - 대상 위에서 누르면 OrbitControls 회전 대신 끌기가 시작된다.
 * - 빈 곳을 누르면 기존처럼 시점 회전.
 */
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Plane, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cameraPosition } from '../lib/camera'
import { activeCut, useStore } from '../store/store'
import { exploreCamera } from './views'

type DragTarget = { kind: 'camera' } | { kind: 'actor'; id: string }

const GROUND = new Plane(new Vector3(0, 1, 0), 0)

function findTarget(o: Object3D | null): DragTarget | null {
  for (let cur = o; cur; cur = cur.parent) if (cur.userData?.drag) return cur.userData.drag as DragTarget
  return null
}

export function DragControls({ el }: { el: HTMLElement }) {
  const { scene, controls } = useThree()

  useEffect(() => {
    const raycaster = new Raycaster()
    raycaster.layers.enableAll()
    // 기본값(1m)이면 화각 선이 너무 넓게 클릭을 가로챈다
    raycaster.params.Line.threshold = 0.03
    const ndc = new Vector2()
    const hitPoint = new Vector3()
    let drag: { target: DragTarget; offset: [number, number]; pointerId: number } | null = null

    const setRay = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, exploreCamera)
    }
    // 가장 가까운 물체가 끌기 대상일 때만 (가려진 인물은 잡지 않음)
    const pick = (): DragTarget | null => {
      const first = raycaster.intersectObjects(scene.children, true)[0]
      return first ? findTarget(first.object) : null
    }
    const ground = () => (raycaster.ray.intersectPlane(GROUND, hitPoint) ? hitPoint : null)

    const targetXZ = (t: DragTarget): [number, number] | null => {
      const cut = activeCut(useStore.getState())
      if (t.kind === 'actor') {
        const a = cut.actors.find((x) => x.id === t.id)
        return a ? [a.x, a.z] : null
      }
      const p = cameraPosition(cut.camera)
      return [p[0], p[2]]
    }

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      setRay(e)
      const t = pick()
      if (!t) return
      const g = ground()
      if (!g) return
      // OrbitControls보다 먼저 받아 회전을 막는다
      e.stopImmediatePropagation()
      e.preventDefault()
      const orbit = controls as unknown as OrbitControlsImpl | null
      if (orbit) orbit.enabled = false
      const s = useStore.getState()
      if (t.kind === 'actor') s.selectActor(t.id)
      // 잡은 지점과 물체 기준점의 차이를 유지해 튀지 않게 이동
      const origin = targetXZ(t)
      drag = { target: t, offset: origin ? [origin[0] - g.x, origin[1] - g.z] : [0, 0], pointerId: e.pointerId }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }

    const move = (e: PointerEvent) => {
      setRay(e)
      if (!drag) {
        el.style.cursor = pick() ? 'grab' : ''
        return
      }
      const g = ground()
      if (!g) return
      const x = g.x + drag.offset[0]
      const z = g.z + drag.offset[1]
      const s = useStore.getState()
      if (drag.target.kind === 'camera') s.moveCameraTo(x, z)
      else s.updateActor(drag.target.id, { x, z })
    }

    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return
      drag = null
      const orbit = controls as unknown as OrbitControlsImpl | null
      if (orbit) orbit.enabled = true
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      el.style.cursor = ''
    }

    el.addEventListener('pointerdown', down, { capture: true })
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down, { capture: true })
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.style.cursor = ''
    }
  }, [el, scene, controls])

  return null
}
