import { useEffect, useRef, useState } from 'react'
import { resetExploreView } from '../scene/Viewports'
import { viewTargets } from '../scene/views'
import { useActiveCut } from '../store/store'
import { AspectToggle, ShotViewport, useSnapshot } from './PreviewPanel'
import { Button, Icon, cx } from './ui'

/**
 * 3D 탐색 화면 영역. 실제 렌더링은 Viewports의 공유 Canvas가 이 영역에 그린다.
 * 좁은 화면(compact)에서는 촬영 미리보기를 내부에 고정 표시한다.
 */
export function Studio({ onElement, compact }: { onElement: (el: HTMLDivElement | null) => void; compact: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const aspect = useActiveCut().aspect
  const snap = useSnapshot()

  useEffect(() => {
    viewTargets.explore = ref.current
    onElement(ref.current)
    return () => {
      viewTargets.explore = null
      onElement(null)
    }
  }, [onElement])

  // 감싸는 영역의 크기를 명시해야 aspect 박스의 %가 계산된다
  const miniWrap = expanded ? 'inset-3 justify-center' : aspect === '9:16' ? 'bottom-3 right-3 h-[50%] justify-end' : 'bottom-3 right-3 w-[48%]'
  const miniSize = aspect === '9:16' ? (expanded ? 'h-[85%] aspect-[9/16]' : 'h-full aspect-[9/16]') : 'w-full aspect-video'

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-line">
      <div
        ref={ref}
        tabIndex={0}
        role="application"
        aria-label="3D 스튜디오 탐색 화면. 드래그로 회전, 우클릭 드래그로 이동, 휠로 확대, WASD 이동, Q/E 높이"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 cursor-grab touch-none outline-none active:cursor-grabbing"
        data-testid="explore-viewport"
      />
      {/* 오버레이 */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold tracking-wider text-ink backdrop-blur">3D 스튜디오 · 자유 탐색</span>
        <span className={cx('rounded-md px-2 py-1 text-[10px] font-semibold', focused ? 'bg-accent/20 text-accent' : 'bg-black/45 text-mute')}>
          {focused ? '키보드 이동 활성' : '클릭하면 키보드 이동'}
        </span>
      </div>
      <div className="absolute right-3 top-3">
        <Button variant="outline" className="bg-black/50 px-2 backdrop-blur" onClick={() => resetExploreView()} title="탐색 시점 초기화">
          <Icon name="home" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">시점 초기화</span>
        </Button>
      </div>
      <div className={cx('pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 text-[10px] text-soft', compact && 'max-w-[45%]', compact && expanded && 'hidden')}>
        {[
          ['드래그', '회전'],
          ['우클릭', '이동'],
          ['휠', '확대'],
          ['WASD', '이동'],
          ['Q/E', '높이'],
        ].map(([k, v]) => (
          <span key={k} className="rounded bg-black/55 px-1.5 py-0.5 backdrop-blur">
            <b className="font-mono text-ink">{k}</b> {v}
          </span>
        ))}
      </div>

      {compact && (
        <div className={cx('absolute flex flex-col items-end gap-1', miniWrap, expanded && 'items-center')}>
          <div className={cx('relative overflow-hidden rounded-lg border border-accent/50 shadow-2xl', miniSize)}>
            <ShotViewport showGrid={expanded} className="absolute inset-0" />
            <div className="absolute right-1 top-1 flex gap-1">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="rounded bg-black/60 p-1 text-ink hover:text-accent"
                aria-label={expanded ? '촬영 미리보기 축소' : '촬영 미리보기 확대'}
              >
                <Icon name={expanded ? 'shrink' : 'expand'} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {expanded && (
            <div className="flex items-center gap-1.5">
              <AspectToggle />
              <Button className="bg-black/60 px-2" onClick={snap.run} disabled={snap.busy}>
                <Icon name="image" className="h-3.5 w-3.5" /> PNG
              </Button>
            </div>
          )}
          {snap.error && <p className="rounded bg-black/70 px-2 py-1 text-[11px] text-red-300">{snap.error}</p>}
        </div>
      )}
    </div>
  )
}
