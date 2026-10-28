/**
 * 단일 WebGL Canvas(상단 작업 영역 전체)에 scissor로 두 뷰를 그린다.
 *  - 탐색 뷰: exploreCamera (OrbitControls + WASD/QE)
 *  - 촬영 뷰: shotCamera (스토어의 카메라 설정 또는 재생 중인 모션 포즈)
 * 같은 Scene을 공유하므로 WebGL 컨텍스트·지오메트리가 중복되지 않는다.
 * 재생 중 카메라 포즈는 이 루프에서 직접 갱신하므로 React 리렌더링이 없다.
 */
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Color, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { getSceneHandle } from '../lib/capture'
import { lightRigState } from '../lib/lighting'
import { evaluateMotion, poseFromSettings } from '../lib/motion'
import { playback } from '../lib/playback'
import { activeCut, useStore } from '../store/store'
import { CameraGizmo } from './CameraRig'
import { LightingRig } from './LightingRig'
import { Studio3D } from './Studio3D'
import { EXPLORE_HOME, exploreCamera, shotCamera, viewTargets } from './views'

const EXPLORE_BG = new Color('#15181c')
const SHOT_BG = new Color('#0b0d0f')
const _fwd = new Vector3()
const _right = new Vector3()
const _move = new Vector3()

type Rect = { x: number; y: number; w: number; h: number }

/** DOM 요소 영역을 캔버스 좌표(좌하단 원점)로 변환 */
function visibleRect(el: HTMLElement | null, canvas: DOMRect): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2 || r.bottom < canvas.top || r.top > canvas.bottom || r.right < canvas.left || r.left > canvas.right) return null
  return { x: r.left - canvas.left, y: canvas.bottom - r.bottom, w: r.width, h: r.height }
}

/** 지정 비율로 레터박스 */
function fitAspect(r: Rect, aspect: number): Rect {
  if (r.w / r.h > aspect) {
    const w = r.h * aspect
    return { x: r.x + (r.w - w) / 2, y: r.y, w, h: r.h }
  }
  const h = r.w / aspect
  return { x: r.x, y: r.y + (r.h - h) / 2, w: r.w, h }
}

function RenderLoop({ keys }: { keys: React.RefObject<Set<string>> }) {
  const gizmo = useRef<{ sync: () => void } | null>(null)
  const { gl, scene } = useThree()

  useEffect(() => {
    gl.autoClear = false
    scene.background = null
  }, [gl, scene])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    playback.tick(dt)

    // 1) 촬영 카메라 포즈·조명 결정
    const cut = activeCut(useStore.getState())
    const aspect = cut.aspect === '9:16' ? 9 / 16 : 16 / 9
    const motionPose = playback.status === 'idle' ? null : evaluateMotion(cut.motion, playback.progress)
    const pose = motionPose ?? poseFromSettings(cut.camera, cut.lighting)
    shotCamera.position.set(...pose.position)
    shotCamera.lookAt(...pose.target)
    shotCamera.fov = pose.fov
    shotCamera.aspect = aspect
    shotCamera.updateProjectionMatrix()
    shotCamera.updateMatrixWorld()
    getSceneHandle()?.applyLightRig(lightRigState(pose.lighting, motionPose?.lightColor))
    gizmo.current?.sync()

    // 2) 탐색 카메라 키보드 이동 (뷰포트 포커스 시에만 keys가 채워짐)
    // 누르고 있는 키 + 한 프레임 안에 눌렀다 뗀 키(탭)를 모두 반영
    const k = new Set([...keys.current!, ...exploreTaps])
    const tapped = exploreTaps.size > 0
    exploreTaps.clear()
    const controls = state.controls as unknown as OrbitControlsImpl | null
    if (k.size && controls) {
      const speed = (k.has('shift') ? 6 : 3) * (tapped ? Math.max(dt, 0.05) : dt)
      exploreCamera.getWorldDirection(_fwd).setY(0).normalize()
      _right.crossVectors(_fwd, exploreCamera.up).normalize()
      _move.set(0, 0, 0)
      if (k.has('w')) _move.add(_fwd)
      if (k.has('s')) _move.sub(_fwd)
      if (k.has('d')) _move.add(_right)
      if (k.has('a')) _move.sub(_right)
      if (_move.lengthSq() > 0) _move.normalize().multiplyScalar(speed)
      if (k.has('e')) _move.y += speed
      if (k.has('q')) _move.y -= speed
      exploreCamera.position.add(_move)
      controls.target.add(_move)
      if (exploreCamera.position.y < 0.2) {
        const fix = 0.2 - exploreCamera.position.y
        exploreCamera.position.y += fix
        controls.target.y += fix
      }
    }

    // 3) 두 뷰 렌더링 (그림자 맵은 프레임당 한 번만 갱신)
    const canvasRect = gl.domElement.getBoundingClientRect()
    gl.setScissorTest(false)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true

    const exploreRect = visibleRect(viewTargets.explore, canvasRect)
    if (exploreRect) {
      exploreCamera.aspect = exploreRect.w / exploreRect.h
      exploreCamera.updateProjectionMatrix()
      draw(exploreRect, EXPLORE_BG, exploreCamera)
    }
    for (const el of viewTargets.shots) {
      const r = visibleRect(el, canvasRect)
      if (r) draw(fitAspect(r, aspect), SHOT_BG, shotCamera)
    }
    gl.setScissorTest(false)

    function draw(r: Rect, bg: Color, camera: typeof shotCamera) {
      gl.setViewport(r.x, r.y, r.w, r.h)
      gl.setScissor(r.x, r.y, r.w, r.h)
      gl.setScissorTest(true)
      gl.setClearColor(bg, 1)
      gl.clear()
      gl.render(scene, camera)
    }
  }, 1)

  return <CameraGizmo gizmoRef={gizmo} />
}

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'shift'])

/** 탐색 뷰포트 DOM에 OrbitControls·키보드 이동을 연결 */
export function useExploreInput(el: HTMLElement | null, keys: React.RefObject<Set<string>>) {
  useEffect(() => {
    if (!el) return
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (!MOVE_KEYS.has(key) || e.ctrlKey || e.metaKey || e.altKey) return
      keys.current!.add(key)
      exploreTaps.add(key)
      if (key !== 'shift') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keys.current!.delete(e.key.toLowerCase())
    const clear = () => keys.current!.clear()
    const focus = () => el.focus({ preventScroll: true })
    el.addEventListener('keydown', down)
    el.addEventListener('keyup', up)
    el.addEventListener('blur', clear)
    el.addEventListener('pointerdown', focus)
    return () => {
      el.removeEventListener('keydown', down)
      el.removeEventListener('keyup', up)
      el.removeEventListener('blur', clear)
      el.removeEventListener('pointerdown', focus)
      clear()
    }
  }, [el, keys])
}

export const exploreKeys = { current: new Set<string>() }
const exploreTaps = new Set<string>()

let resetExplore: (() => void) | null = null
export const resetExploreView = () => resetExplore?.()

function ExploreControls({ el }: { el: HTMLElement }) {
  const ref = useRef<OrbitControlsImpl>(null)
  useEffect(() => {
    resetExplore = () => {
      exploreCamera.position.set(...EXPLORE_HOME.position)
      ref.current?.target.set(...EXPLORE_HOME.target)
      ref.current?.update()
    }
    resetExplore()
    return () => void (resetExplore = null)
  }, [])
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      camera={exploreCamera}
      domElement={el}
      enableDamping
      dampingFactor={0.12}
      minDistance={0.8}
      maxDistance={22}
      maxPolarAngle={Math.PI * 0.495}
    />
  )
}

export function Viewports({ exploreEl }: { exploreEl: HTMLElement | null }) {
  const [lost, setLost] = useState(false)
  useExploreInput(exploreEl, exploreKeys)
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {lost && (
        <div className="absolute inset-x-0 top-4 z-30 mx-auto w-fit rounded-md bg-red-900/90 px-4 py-2 text-sm text-red-50">
          WebGL 연결이 끊겼습니다. 페이지를 새로고침해 주세요.
        </div>
      )}
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => setLost(true))
          gl.domElement.addEventListener('webglcontextrestored', () => setLost(false))
        }}
        style={{ pointerEvents: 'none' }}
      >
        <Studio3D />
        <LightingRig />
        <RenderLoop keys={exploreKeys} />
        {exploreEl && <ExploreControls el={exploreEl} />}
      </Canvas>
    </div>
  )
}
