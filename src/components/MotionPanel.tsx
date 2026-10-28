import { useEffect, useMemo, useRef } from 'react'
import type { Duration, MotionType } from '../types/scene'
import { DURATIONS, MOTION_TYPES, canPlay, evaluateMotion } from '../lib/motion'
import { playback } from '../lib/playback'
import { useActiveCut, useStore, type FrameSlot } from '../store/store'
import { usePlaybackStatus, useShotThumbnail } from './hooks'
import { Button, Icon, Panel, Segmented, cx } from './ui'

function FrameCard({ slot }: { slot: FrameSlot }) {
  const cut = useActiveCut()
  const saveFrame = useStore((s) => s.saveFrame)
  const clearFrame = useStore((s) => s.clearFrame)
  const status = usePlaybackStatus()
  const saved = cut.motion[slot]
  // 썸네일은 저장값이 아닌 "모션 0% / 100%" 실제 렌더링
  const pose = useMemo(() => evaluateMotion(cut.motion, slot === 'start' ? 0 : 1), [cut.motion, slot])
  const thumb = useShotThumbnail(pose, cut.aspect)
  const isStart = slot === 'start'
  const auto = !isStart && !saved && cut.motion.start && cut.motion.type !== 'fixed'

  return (
    <div className="flex min-w-0 flex-1 gap-3 rounded-lg border border-line bg-well p-2.5">
      <div className={cx('relative shrink-0 overflow-hidden rounded-md bg-black/40 ring-1 ring-line', cut.aspect === '9:16' ? 'h-24 w-[54px]' : 'h-[68px] w-[120px]')}>
        {thumb ? (
          <img src={thumb} alt={`${isStart ? '시작' : '종료'} 프레임 썸네일`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-mute">{pose ? '렌더링…' : '없음'}</div>
        )}
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 font-mono text-[9px] text-ink">{isStart ? '0%' : '100%'}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-[0.14em] text-accent">{isStart ? 'START FRAME' : 'END FRAME'}</div>
          <div className="truncate text-[11px] text-mute">
            {saved ? `저장됨 · FOV ${Math.round(saved.fov)}°` : auto ? `자동 계산 (${MOTION_TYPES[cut.motion.type].label})` : isStart ? '현재 구도를 시작점으로 저장하세요' : cut.motion.type === 'fixed' ? '고정 촬영: 시작과 동일' : '시작 프레임을 먼저 저장하세요'}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant={saved ? 'outline' : 'primary'} className="px-2 py-1 text-[11px]" onClick={() => saveFrame(slot)} title={status === 'idle' ? '현재 촬영 구도 저장' : '타임라인 위치의 구도 저장'}>
            <Icon name="save" className="h-3.5 w-3.5" /> {saved ? '다시 저장' : `${isStart ? '시작' : '종료'} 저장`}
          </Button>
          {saved && (
            <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => clearFrame(slot)}>
              지우기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Timeline({ disabled }: { disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const duration = useActiveCut().motion.duration
  // 재생 중 진행률은 DOM을 직접 갱신 (React 리렌더링 없음)
  useEffect(
    () =>
      playback.onProgress((p) => {
        if (input.current) {
          input.current.value = String(p)
          input.current.style.setProperty('--pct', `${p * 100}%`)
        }
        if (label.current) label.current.textContent = `${(p * playback.duration).toFixed(1)} / ${playback.duration.toFixed(1)}s · ${Math.round(p * 100)}%`
      }),
    [duration],
  )
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <input
        ref={input}
        type="range"
        min={0}
        max={1}
        step={0.001}
        defaultValue={0}
        disabled={disabled}
        aria-label="타임라인"
        onInput={(e) => playback.seek(Number((e.target as HTMLInputElement).value))}
        className="range w-full"
      />
      <div className="flex justify-between font-mono text-[10px] text-mute">
        <span>START</span>
        <span ref={label} className="text-soft" />
        <span>END</span>
      </div>
    </div>
  )
}

export function MotionPanel() {
  const cut = useActiveCut()
  const setType = useStore((s) => s.setMotionType)
  const setDuration = useStore((s) => s.setDuration)
  const status = usePlaybackStatus()
  const playable = canPlay(cut.motion)

  return (
    <Panel
      title={<span className="font-mono tracking-[0.18em] text-accent">CAMERA MOTION</span>}
      right={
        <span className={cx('rounded px-2 py-0.5 text-[11px] font-semibold', status === 'idle' ? 'bg-accent/10 text-accent' : 'bg-amber-400/15 text-amber-300')}>
          {status === 'idle' ? '카메라 편집 모드' : status === 'playing' ? '모션 재생 중' : '모션 미리보기'}
        </span>
      }
    >
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="space-y-2.5">
          <Segmented<MotionType>
            ariaLabel="카메라 움직임"
            size="sm"
            value={cut.motion.type}
            onChange={setType}
            options={(Object.keys(MOTION_TYPES) as MotionType[]).map((k) => ({ value: k, label: MOTION_TYPES[k].label, title: MOTION_TYPES[k].hint }))}
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-soft">길이</span>
            <div className="w-40">
              <Segmented<Duration> ariaLabel="영상 길이" size="sm" value={cut.motion.duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: `${d}초` }))} />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-mute">{MOTION_TYPES[cut.motion.type].hint}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FrameCard slot="start" />
          <FrameCard slot="end" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
        <div className="flex gap-1.5">
          <Button variant="primary" className="w-24" disabled={!playable} onClick={() => playback.toggle()}>
            <Icon name={status === 'playing' ? 'pause' : 'play'} className="h-3.5 w-3.5" />
            {status === 'playing' ? '일시정지' : '재생'}
          </Button>
          <Button disabled={!playable} onClick={() => playback.restart()} title="처음부터 재생">
            <Icon name="restart" className="h-3.5 w-3.5" /> 재시작
          </Button>
          <Button variant="ghost" disabled={status === 'idle'} onClick={() => playback.stop()} title="슬라이더 구도로 돌아가기">
            <Icon name="edit" className="h-3.5 w-3.5" /> 편집
          </Button>
        </div>
        <Timeline disabled={!playable} />
      </div>
      {!playable && <p className="px-3 pb-2.5 text-[11px] text-amber-300/90">시작 프레임을 저장하면 모션을 재생할 수 있습니다.</p>}
    </Panel>
  )
}
