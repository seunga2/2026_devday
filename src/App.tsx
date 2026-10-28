import { useCallback, useState } from 'react'
import { CameraControls } from './components/CameraControls'
import { CutPanel } from './components/CutPanel'
import { ExportPanel } from './components/ExportPanel'
import { Header } from './components/Header'
import { useMediaQuery } from './components/hooks'
import { LightingPanel } from './components/LightingPanel'
import { MotionPanel } from './components/MotionPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { PromptPanel } from './components/PromptPanel'
import { Studio } from './components/Studio'
import { Panel, cx } from './components/ui'
import { Viewports } from './scene/Viewports'
import { useStore } from './store/store'

function SettingsPanel({ className }: { className?: string }) {
  return (
    <Panel title="촬영 설정" right={<span className="text-[11px] text-accent">실시간 반영</span>} className={cx('flex flex-col', className)}>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3.5">
        <CameraControls />
        <div className="border-t border-line" />
        <LightingPanel />
      </div>
    </Panel>
  )
}

const TABS = [
  { key: 'cuts', label: '촬영 CUT' },
  { key: 'prompt', label: '영상 프롬프트' },
  { key: 'export', label: 'EXPORT' },
] as const
type TabKey = (typeof TABS)[number]['key']

function BottomTabs() {
  const [tab, setTab] = useState<TabKey>('cuts')
  const count = useStore((s) => s.cuts.length)
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div role="tablist" className="flex gap-1 border-b border-line px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              '-mb-px rounded-t-md border-b-2 px-3.5 py-2 text-[13px] font-semibold transition-colors',
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-soft hover:text-ink',
            )}
          >
            {t.label}
            {t.key === 'cuts' && <span className="ml-1.5 rounded bg-white/10 px-1.5 font-mono text-[10px]">{count}</span>}
          </button>
        ))}
      </div>
      {/* 탭 전환 시 상태 유지를 위해 모두 마운트한 채 숨김 처리 */}
      {TABS.map((t) => (
        <div key={t.key} role="tabpanel" hidden={tab !== t.key}>
          {t.key === 'cuts' ? <CutPanel /> : t.key === 'prompt' ? <PromptPanel /> : <ExportPanel />}
        </div>
      ))}
    </section>
  )
}

export default function App() {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [exploreEl, setExploreEl] = useState<HTMLDivElement | null>(null)
  const onElement = useCallback((el: HTMLDivElement | null) => setExploreEl(el), [])

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header />
      <main className="mx-auto max-w-[1800px] space-y-4 p-3 sm:p-4">
        {/* 작업 영역: 단일 WebGL Canvas가 이 영역 전체를 덮고 탐색·촬영 뷰를 그린다 */}
        <section
          className={cx(
            'relative isolate',
            desktop ? 'grid h-[calc(100vh-88px)] min-h-[600px] grid-cols-[minmax(0,1fr)_minmax(360px,420px)] gap-4' : 'sticky top-14 z-30 -mx-3 h-[52vh] min-h-[300px] bg-bg px-3 pb-2 sm:-mx-4 sm:px-4',
          )}
        >
          <Viewports exploreEl={exploreEl} />
          <div className="relative z-10 h-full min-h-0">
            <Studio onElement={onElement} compact={!desktop} />
          </div>
          {desktop && (
            <div className="relative z-10 flex min-h-0 flex-col gap-3">
              <PreviewPanel />
              <SettingsPanel className="min-h-0 flex-1" />
            </div>
          )}
        </section>
        {!desktop && <SettingsPanel />}
        <MotionPanel />
        <BottomTabs />
        <footer className="pb-4 text-center text-[11px] text-mute">Scene Preview · 3D Video Previsualization Studio · 프롬프트는 규칙 기반 템플릿으로 생성됩니다 (AI 미사용)</footer>
      </main>
    </div>
  )
}
