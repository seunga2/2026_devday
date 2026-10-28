import { useEffect, useRef, useState } from 'react'
import { captureShot, downloadBlob } from '../lib/capture'
import { LIGHTING_PRESETS } from '../lib/lighting'
import { playback } from '../lib/playback'
import { viewTargets } from '../scene/views'
import { activeCut, useActiveCut, useStore } from '../store/store'
import { currentShotPose, usePlaybackStatus } from './hooks'
import { Button, Icon, Segmented, cx } from './ui'

/** 촬영 카메라 화면이 그려질 DOM 영역을 등록 */
export function ShotViewport({ className, showGrid }: { className?: string; showGrid: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const aspect = useActiveCut().aspect
  useEffect(() => {
    const el = ref.current!
    viewTargets.shots.add(el)
    return () => void viewTargets.shots.delete(el)
  }, [])
  return (
    <div ref={ref} className={className} data-testid="shot-viewport">
      {/* 비율 프레임 + 3분할 가이드 (렌더러도 동일 비율로 레터박스) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={cx('relative max-h-full max-w-full ring-1 ring-accent/40', aspect === '9:16' ? 'aspect-[9/16] h-full' : 'aspect-video w-full')}>
          {showGrid && (
            <div className="absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
            </div>
          )}
          <ModeBadge />
        </div>
      </div>
    </div>
  )
}

function ModeBadge() {
  const status = usePlaybackStatus()
  const pct = useRef<HTMLSpanElement>(null)
  useEffect(() => playback.onProgress((p) => pct.current && (pct.current.textContent = `${Math.round(p * 100)}%`)), [])
  const motion = status !== 'idle'
  return (
    <div className={cx('absolute left-2 top-2 flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider', motion ? 'bg-amber-400/90 text-black' : 'bg-black/55 text-accent')}>
      <span className={cx('h-1.5 w-1.5 rounded-full', motion ? 'bg-black' : 'animate-pulse bg-accent')} />
      {motion ? 'MOTION' : 'LIVE'}
      <span ref={pct} className={motion ? '' : 'hidden'} />
    </div>
  )
}

export function ShotInfo() {
  const cut = useActiveCut()
  const { camera, lighting } = cut
  return (
    <span className="truncate font-mono text-[11px] text-mute">
      {camera.distance.toFixed(1)}m · {camera.height.toFixed(2)}m 높이 · {Math.round(camera.angle)}° · FOV {Math.round(camera.fov)}° · {LIGHTING_PRESETS[lighting.preset].label} {lighting.intensity.toFixed(1)}
    </span>
  )
}

/** 현재 촬영 화면 PNG 저장 (편집 모드면 현재 구도, 모션 모드면 타임라인 위치) */
export function useSnapshot() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const s = useStore.getState()
      const cut = activeCut(s)
      const pose = currentShotPose(cut)
      const blob = await captureShot(pose, cut.aspect, { lightColor: pose.lightColor })
      const idx = s.cuts.indexOf(cut) + 1
      downloadBlob(blob, `cut-${String(idx).padStart(2, '0')}-frame${playback.status === 'idle' ? '' : `-${Math.round(playback.progress * 100)}pct`}.png`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNG 저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }
  return { run, busy, error }
}

export function AspectToggle() {
  const aspect = useActiveCut().aspect
  const setAspect = useStore((s) => s.setAspect)
  return (
    <div className="w-28">
      <Segmented
        size="sm"
        ariaLabel="화면 비율"
        value={aspect}
        onChange={setAspect}
        options={[
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ]}
      />
    </div>
  )
}

/** 데스크톱: 오른쪽 상단 촬영 미리보기 */
export function PreviewPanel() {
  const [grid, setGrid] = useState(true)
  const snap = useSnapshot()
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-panel px-3 py-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Icon name="film" className="h-4 w-4 text-accent" /> 촬영 미리보기
        </h2>
        <div className="flex items-center gap-1.5">
          <AspectToggle />
          <Button variant={grid ? 'outline' : 'ghost'} className="px-2" aria-pressed={grid} onClick={() => setGrid(!grid)} title="3분할 가이드">
            <Icon name="grid" className="h-3.5 w-3.5" />
          </Button>
          <Button className="px-2" onClick={snap.run} disabled={snap.busy} title="현재 촬영 화면 PNG 저장">
            <Icon name="image" className="h-3.5 w-3.5" /> PNG
          </Button>
        </div>
      </header>
      <ShotViewport showGrid={grid} className="relative aspect-video w-full" />
      <div className="flex items-center justify-between gap-2 border-t border-line bg-panel px-3 py-1.5">
        <ShotInfo />
      </div>
      {snap.error && <p className="bg-panel px-3 pb-2 text-[11px] text-red-300">{snap.error}</p>}
    </section>
  )
}
