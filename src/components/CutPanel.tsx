import { useMemo } from 'react'
import type { Cut } from '../types/scene'
import { LIGHTING_PRESETS } from '../lib/lighting'
import { MOTION_TYPES, evaluateMotion } from '../lib/motion'
import { useStore } from '../store/store'
import { motionWithFallback, useShotThumbnail } from './hooks'
import { Button, Icon, cx } from './ui'

function CutCard({ cut, index, active }: { cut: Cut; index: number; active: boolean }) {
  const select = useStore((s) => s.selectCut)
  const rename = useStore((s) => s.renameCut)
  const duplicate = useStore((s) => s.duplicateCut)
  const remove = useStore((s) => s.deleteCut)
  const pose = useMemo(() => evaluateMotion(motionWithFallback(cut), 0), [cut])
  const thumb = useShotThumbnail(pose, cut.aspect)

  return (
    <li
      className={cx('group flex gap-3 rounded-lg border p-2.5 transition-colors', active ? 'border-accent/60 bg-accent/[0.06]' : 'border-line bg-well hover:border-white/20')}
      data-testid="cut-card"
    >
      <button type="button" onClick={() => select(cut.id)} className="relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-md bg-black/40 ring-1 ring-line" aria-label={`${cut.name} 선택`}>
        {thumb && <img src={thumb} alt="" className="h-full w-full object-contain" />}
        <span className="absolute left-1 top-1 rounded bg-black/70 px-1 font-mono text-[9px] text-accent">{String(index + 1).padStart(2, '0')}</span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <input
          value={cut.name}
          onChange={(e) => rename(cut.id, e.target.value)}
          onFocus={() => !active && select(cut.id)}
          aria-label="CUT 이름"
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-ink hover:border-line focus:border-accent/60 focus:outline-none"
        />
        <div className="truncate px-1 text-[11px] text-mute">
          {MOTION_TYPES[cut.motion.type].label} · {cut.motion.duration}s · {cut.aspect} · {LIGHTING_PRESETS[cut.lighting.preset].label}
          {cut.prompt.edited && ' · 프롬프트 수정됨'}
        </div>
        <div className="flex gap-1">
          {!active && (
            <Button className="px-2 py-0.5 text-[11px]" onClick={() => select(cut.id)}>
              불러오기
            </Button>
          )}
          <Button variant="ghost" className="px-2 py-0.5 text-[11px]" onClick={() => duplicate(cut.id)}>
            <Icon name="duplicate" className="h-3.5 w-3.5" /> 복제
          </Button>
          <Button
            variant="ghost"
            className="px-2 py-0.5 text-[11px] hover:text-red-300"
            onClick={() => window.confirm(`'${cut.name}'을(를) 삭제할까요?`) && remove(cut.id)}
          >
            <Icon name="trash" className="h-3.5 w-3.5" /> 삭제
          </Button>
        </div>
      </div>
    </li>
  )
}

export function CutPanel() {
  const cuts = useStore((s) => s.cuts)
  const activeId = useStore((s) => s.activeCutId)
  const addCut = useStore((s) => s.addCut)
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-soft">
          선택한 CUT을 편집하면 <b className="text-accent">자동 저장</b>됩니다. 카메라·조명·모션·프레임·장면 설명·프롬프트가 CUT별로 보관됩니다.
        </p>
        <Button variant="primary" onClick={addCut}>
          <Icon name="plus" className="h-3.5 w-3.5" /> 새 CUT
        </Button>
      </div>
      <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {cuts.map((c, i) => (
          <CutCard key={c.id} cut={c} index={i} active={c.id === activeId} />
        ))}
      </ul>
    </div>
  )
}
