import { PerspectiveCamera } from 'three'

/** 레이어 0: 촬영 대상 / 레이어 1: 탐색 화면 전용 기즈모(촬영·캡처에서 제외) */
export const GIZMO_LAYER = 1

/** 촬영 카메라: 실제 결과 화면. 레이어 0만 렌더링 */
export const shotCamera = new PerspectiveCamera(42, 16 / 9, 0.05, 100)

/** 탐색 카메라: 자유 시점. 기즈모 레이어 포함 */
export const exploreCamera = new PerspectiveCamera(50, 1, 0.05, 200)
exploreCamera.position.set(6.5, 5.2, 7.5)
exploreCamera.layers.enable(GIZMO_LAYER)
export const EXPLORE_HOME = { position: [6.5, 5.2, 7.5] as const, target: [0, 1, -0.5] as const }

/**
 * 단일 WebGL Canvas가 그릴 DOM 영역.
 * shot은 여러 후보(데스크톱 패널, 모바일 미니 미리보기) 중 화면에 보이는 것을 사용한다.
 */
export const viewTargets = {
  explore: null as HTMLElement | null,
  shots: new Set<HTMLElement>(),
}
