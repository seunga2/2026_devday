import { ACTOR_OUTFITS, MAX_ACTORS } from '../lib/schema'
import { useActiveCut, useStore } from '../store/store'
import { Button, Icon, Label, Slider, cx } from './ui'

export function ActorPanel() {
  const cut = useActiveCut()
  const selectedId = useStore((s) => s.selectedActorId)
  const addActor = useStore((s) => s.addActor)
  const updateActor = useStore((s) => s.updateActor)
  const removeActor = useStore((s) => s.removeActor)
  const selectActor = useStore((s) => s.selectActor)
  const focusActor = useStore((s) => s.focusActor)
  const selected = cut.actors.find((a) => a.id === selectedId) ?? null
  const [fx, fz] = cut.camera.focus

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          인물 {cut.actors.length}/{MAX_ACTORS}
        </Label>
        <Button variant="ghost" className="-mt-1.5 px-2 py-1 text-[11px]" disabled={cut.actors.length >= MAX_ACTORS} onClick={addActor}>
          <Icon name="plus" className="h-3.5 w-3.5" /> 인물 추가
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-mute">3D 화면에서 인물과 카메라 삼각대를 끌어 옮길 수 있습니다. 카메라는 '피사체' 기준점을 중심으로 회전합니다.</p>

      <ul className="space-y-1.5">
        {cut.actors.map((a) => {
          const o = ACTOR_OUTFITS[a.outfit] ?? ACTOR_OUTFITS[0]
          const isFocus = Math.abs(a.x - fx) < 0.01 && Math.abs(a.z - fz) < 0.01
          return (
            <li
              key={a.id}
              className={cx('flex items-center gap-2 rounded-2xl border px-2.5 py-1.5', a.id === selectedId ? 'border-accent/60 bg-accent/[0.06]' : 'border-line bg-well')}
            >
              <button type="button" onClick={() => selectActor(a.id === selectedId ? null : a.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={a.id === selectedId}>
                <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20" style={{ background: o.top }} />
                <span className="truncate text-[12px] text-ink">{a.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-mute">
                  {a.x.toFixed(1)}, {a.z.toFixed(1)}
                </span>
              </button>
              <Button
                variant={isFocus ? 'primary' : 'ghost'}
                className="px-2 py-0.5 text-[10.5px]"
                onClick={() => focusActor(a.id)}
                title="촬영 카메라가 이 인물을 중심으로 회전·거리 계산"
                aria-pressed={isFocus}
              >
                {isFocus ? '피사체' : '피사체로'}
              </Button>
              <Button variant="ghost" className="px-1.5 py-0.5 hover:text-red-300" onClick={() => removeActor(a.id)} aria-label={`${a.name} 삭제`}>
                <Icon name="trash" className="h-3.5 w-3.5" />
              </Button>
            </li>
          )
        })}
        {cut.actors.length === 0 && <li className="rounded-2xl border border-dashed border-line px-3 py-2 text-[11px] text-mute">인물이 없습니다. 빈 공간 촬영도 가능합니다.</li>}
      </ul>

      {selected && (
        <div className="space-y-3 rounded-2xl border border-line bg-well p-3">
          <input
            value={selected.name}
            onChange={(e) => updateActor(selected.id, { name: e.target.value })}
            aria-label="인물 이름"
            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-ink hover:border-line focus:border-accent/60 focus:outline-none"
          />
          <Slider label="바라보는 방향" unit="°" digits={0} value={selected.rotation} min={-180} max={180} step={1} onChange={(rotation) => updateActor(selected.id, { rotation })} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="좌우 위치 X" unit="m" value={selected.x} min={-6.5} max={6.5} step={0.1} onChange={(x) => updateActor(selected.id, { x })} />
            <Slider label="앞뒤 위치 Z" unit="m" value={selected.z} min={-6.5} max={6.5} step={0.1} onChange={(z) => updateActor(selected.id, { z })} />
          </div>
          <div>
            <div className="mb-1 text-[12px] text-soft">의상</div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="의상">
              {ACTOR_OUTFITS.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={selected.outfit === i}
                  title={o.label}
                  onClick={() => updateActor(selected.id, { outfit: i })}
                  className={cx('h-7 w-7 rounded-full ring-offset-2 ring-offset-well transition', selected.outfit === i ? 'ring-2 ring-white' : 'ring-1 ring-white/20 hover:ring-white/50')}
                  style={{ background: `linear-gradient(135deg, ${o.top} 55%, ${o.bottom} 55%)` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
