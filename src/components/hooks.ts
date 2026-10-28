import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Aspect, Cut, ShotPose } from '../types/scene'
import { captureShot, onSceneReady, getSceneHandle } from '../lib/capture'
import { evaluateMotion, frameFromSettings, poseFromSettings } from '../lib/motion'
import { playback } from '../lib/playback'

export const usePlaybackStatus = () => useSyncExternalStore(playback.subscribe, playback.getStatus)

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
  )
}

const useSceneReady = () => useSyncExternalStore(onSceneReady, () => !!getSceneHandle())

/** 시작 프레임이 없을 때는 현재 구도를 시작점으로 사용한 모션 */
export function motionWithFallback(cut: Cut) {
  return cut.motion.start ? cut.motion : { ...cut.motion, start: frameFromSettings(cut.camera, cut.lighting, cut.aspect) }
}

/** 현재 촬영 화면 포즈(편집 모드: 슬라이더 값 / 모션 모드: 타임라인 위치) */
export function currentShotPose(cut: Cut) {
  const pose = playback.status === 'idle' ? null : evaluateMotion(cut.motion, playback.progress)
  return pose ?? { ...poseFromSettings(cut.camera, cut.lighting), lightColor: undefined }
}

/**
 * 모션 0%/100% 썸네일. 실제 촬영 카메라 렌더링(JPEG 소형)이며 포즈가 바뀔 때 debounce 후 갱신.
 */
export function useShotThumbnail(pose: (ShotPose & { lightColor?: [number, number, number] }) | null, aspect: Aspect) {
  const ready = useSceneReady()
  const [url, setUrl] = useState<string | null>(null)
  const key = pose ? JSON.stringify([pose, aspect]) : ''

  useEffect(() => {
    if (!ready || !pose) {
      setUrl(null)
      return
    }
    let cancelled = false
    let made: string | null = null
    const t = setTimeout(() => {
      captureShot(pose, aspect, { longEdge: 360, type: 'image/jpeg', quality: 0.82, lightColor: pose.lightColor })
        .then((blob) => {
          if (cancelled) return
          made = URL.createObjectURL(blob)
          setUrl(made)
        })
        .catch(() => !cancelled && setUrl(null))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (made) URL.revokeObjectURL(made)
    }
    // key가 pose·aspect의 내용을 대표한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready])

  return url
}
