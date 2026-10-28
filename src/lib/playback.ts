/**
 * 재생 컨트롤러. React state와 분리되어 있어 재생 중 매 프레임 리렌더링이 발생하지 않는다.
 * - status 변경(재생/일시정지/정지)만 구독자에게 알린다.
 * - progress는 onProgress 리스너(DOM 직접 갱신용)에만 전달한다.
 * - status === 'idle' 은 "카메라 편집 모드"(슬라이더 값이 그대로 화면에 반영)
 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused'

type Listener = () => void
type ProgressListener = (progress: number) => void

export class PlaybackController {
  status: PlaybackStatus = 'idle'
  progress = 0
  duration: number
  private listeners = new Set<Listener>()
  private progressListeners = new Set<ProgressListener>()

  constructor(duration = 5) {
    this.duration = duration
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => void this.listeners.delete(l)
  }

  onProgress = (l: ProgressListener) => {
    this.progressListeners.add(l)
    l(this.progress)
    return () => void this.progressListeners.delete(l)
  }

  getStatus = () => this.status

  private setStatus(s: PlaybackStatus) {
    if (this.status === s) return
    this.status = s
    this.listeners.forEach((l) => l())
  }

  private setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))
    this.progressListeners.forEach((l) => l(this.progress))
  }

  setDuration(seconds: number) {
    if (seconds > 0) this.duration = seconds
  }

  play() {
    if (this.progress >= 1) this.setProgress(0)
    this.setStatus('playing')
  }

  pause() {
    if (this.status === 'playing') this.setStatus('paused')
  }

  toggle() {
    if (this.status === 'playing') this.pause()
    else this.play()
  }

  restart() {
    this.setProgress(0)
    this.setStatus('playing')
  }

  /** 타임라인 이동: 모션 미리보기 모드(일시정지)로 전환 */
  seek(progress: number) {
    this.setProgress(progress)
    if (this.status !== 'playing') this.setStatus('paused')
  }

  /** 카메라 편집 모드로 복귀 */
  stop() {
    this.setProgress(0)
    this.setStatus('idle')
  }

  /** 렌더 루프에서 호출. 재생 중일 때만 진행 */
  tick(deltaSeconds: number) {
    if (this.status !== 'playing') return
    const next = this.progress + Math.max(0, deltaSeconds) / this.duration
    if (next >= 1) {
      this.setProgress(1)
      this.setStatus('paused')
    } else {
      this.setProgress(next)
    }
  }
}

export const playback = new PlaybackController()
