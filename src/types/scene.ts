export type Vec3 = [number, number, number]

export type LightingPreset = 'front' | 'side' | 'back' | 'rembrandt'
export type Tone = 'warm' | 'neutral' | 'cool'
export type Aspect = '16:9' | '9:16'
export type MotionType = 'fixed' | 'dolly' | 'truck' | 'pedestal' | 'orbit'
export type Duration = 3 | 5 | 8

/** 피사체(원점) 기준 촬영 카메라 구도 */
export interface CameraSettings {
  /** 피사체와의 수평 거리 (m) */
  distance: number
  /** 카메라 높이 (m) */
  height: number
  /** 수평 회전 각도 (deg, 0 = 정면) */
  angle: number
  /** 시선(바라보는 지점) 높이 (m) */
  targetHeight: number
  /** 수직 화각 (deg) */
  fov: number
}

export interface LightingSettings {
  preset: LightingPreset
  /** 키 라이트 밝기 0~8 */
  intensity: number
  /** 키 라이트 수평 방향 (deg, 0 = 피사체 정면) */
  direction: number
  tone: Tone
}

/** 시작·종료 프레임: 모션의 한 끝점 */
export interface Frame {
  position: Vec3
  target: Vec3
  fov: number
  lighting: LightingSettings
  aspect: Aspect
}

export interface MotionSettings {
  type: MotionType
  duration: Duration
  start: Frame | null
  /** null이면 움직임 종류에 따라 자동 계산 */
  end: Frame | null
}

export interface PromptState {
  text: string
  /** 사용자가 직접 수정했으면 true → 자동 생성으로 덮어쓰지 않음 */
  edited: boolean
}

export interface Cut {
  id: string
  name: string
  camera: CameraSettings
  lighting: LightingSettings
  aspect: Aspect
  motion: MotionSettings
  /** 인물 행동 */
  action: string
  /** 영상 분위기 */
  mood: string
  prompt: PromptState
  updatedAt: number
}

export const PROJECT_VERSION = 3

export interface Project {
  version: typeof PROJECT_VERSION
  projectName: string
  cuts: Cut[]
  activeCutId: string
}

/** 특정 시점의 촬영 카메라 상태 (렌더링·캡처 입력) */
export interface ShotPose {
  position: Vec3
  target: Vec3
  fov: number
  lighting: LightingSettings
}
