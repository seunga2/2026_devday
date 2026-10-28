/**
 * 촬영 카메라 화면만 PNG/JPEG로 렌더링한다 (UI·탐색용 기즈모 제외).
 * 메인 Canvas와 같은 Scene을 사용하되, 해상도·비율을 자유롭게 정하기 위해
 * 캡처 전용 렌더러를 처음 필요할 때 1개만 만들어 재사용한다.
 */
import { PerspectiveCamera, WebGLRenderer, type Scene } from 'three'
import type { Aspect, ShotPose, Vec3 } from '../types/scene'
import { lightRigState, type LightRigState } from './lighting'

export interface SceneHandle {
  scene: Scene
  /** 메인 렌더러 설정(톤매핑·색공간) 복제를 위해 사용 */
  gl: WebGLRenderer
  applyLightRig(state: LightRigState): void
  currentLightRig(): LightRigState
}

let handle: SceneHandle | null = null
const readyListeners = new Set<() => void>()

export function registerScene(h: SceneHandle | null) {
  handle = h
  readyListeners.forEach((l) => l())
}
export const getSceneHandle = () => handle
export function onSceneReady(l: () => void) {
  readyListeners.add(l)
  return () => void readyListeners.delete(l)
}

export function frameSize(aspect: Aspect, longEdge = 1920): { width: number; height: number } {
  const short = Math.round((longEdge * 9) / 16)
  return aspect === '9:16' ? { width: short, height: longEdge } : { width: longEdge, height: short }
}

export interface CaptureOptions {
  longEdge?: number
  type?: 'image/png' | 'image/jpeg'
  quality?: number
  /** 모션 보간된 색온도 */
  lightColor?: Vec3
}

export type CaptureFn = (pose: ShotPose, aspect: Aspect, opts?: CaptureOptions) => Promise<Blob>

/**
 * 라이트 상태를 임시로 바꿔 렌더링한 뒤 반드시 원래 상태로 되돌린다.
 * (렌더 함수만 주입받으므로 WebGL 없이 테스트 가능)
 */
export function withPoseLighting<T>(h: Pick<SceneHandle, 'applyLightRig' | 'currentLightRig'>, pose: ShotPose, color: Vec3 | undefined, render: () => T): T {
  const previous = h.currentLightRig()
  try {
    h.applyLightRig(lightRigState(pose.lighting, color))
    return render()
  } finally {
    h.applyLightRig(previous)
  }
}

let captureRenderer: WebGLRenderer | null = null
let captureQueue: Promise<unknown> = Promise.resolve()

function getCaptureRenderer(main: WebGLRenderer): WebGLRenderer {
  if (!captureRenderer || captureRenderer.getContext().isContextLost()) {
    captureRenderer?.dispose()
    captureRenderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false })
    captureRenderer.setPixelRatio(1)
    captureRenderer.setClearColor('#0b0d0f', 1)
  }
  captureRenderer.toneMapping = main.toneMapping
  captureRenderer.toneMappingExposure = main.toneMappingExposure
  captureRenderer.outputColorSpace = main.outputColorSpace
  captureRenderer.shadowMap.enabled = main.shadowMap.enabled
  captureRenderer.shadowMap.type = main.shadowMap.type
  return captureRenderer
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b && b.size > 0 ? resolve(b) : reject(new Error('이미지 인코딩에 실패했습니다.'))), type, quality),
  )
}

const _camera = new PerspectiveCamera()

/** 실제 WebGL 렌더링 캡처 (브라우저 전용). 동시 호출은 순차 처리 */
export const captureShot: CaptureFn = (pose, aspect, opts = {}) => {
  const job = captureQueue.then(async () => {
    const h = handle
    if (!h) throw new Error('3D 장면이 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.')
    if (h.gl.getContext().isContextLost()) throw new Error('WebGL 연결이 끊겼습니다. 페이지를 새로고침한 뒤 다시 시도하세요.')
    const { width, height } = frameSize(aspect, opts.longEdge)
    const r = getCaptureRenderer(h.gl)
    r.setSize(width, height, false)

    _camera.fov = pose.fov
    _camera.aspect = width / height
    _camera.near = 0.05
    _camera.far = 100
    _camera.layers.set(0) // 촬영 레이어만: 기즈모(레이어 1) 제외
    _camera.position.set(...pose.position)
    _camera.lookAt(...pose.target)
    _camera.updateProjectionMatrix()
    _camera.updateMatrixWorld()

    withPoseLighting(h, pose, opts.lightColor, () => {
      h.scene.updateMatrixWorld(true)
      r.render(h.scene, _camera)
    })
    if (r.getContext().isContextLost()) throw new Error('렌더링 중 WebGL 연결이 끊겼습니다.')
    return canvasToBlob(r.domElement, opts.type ?? 'image/png', opts.quality)
  })
  captureQueue = job.catch(() => undefined)
  return job
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
