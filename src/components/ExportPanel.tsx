import { useState } from 'react'
import { captureShot, downloadBlob } from '../lib/capture'
import { buildExportZip, exportFileName, isExportRunning, runExclusive, type ExportProgress } from '../lib/export'
import { activeCut, useStore } from '../store/store'
import { Button, Icon, cx } from './ui'

type State = { kind: 'idle' } | { kind: 'running'; progress: ExportProgress } | { kind: 'done'; file: string } | { kind: 'error'; message: string }

export function ExportPanel() {
  const cutCount = useStore((s) => s.cuts.length)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const running = state.kind === 'running'

  const run = async (scope: 'current' | 'all') => {
    // 빠른 연속 클릭: 렌더 전이라도 동기 잠금으로 중복 실행을 막는다
    if (running || isExportRunning()) return
    // 내보내기 시작 시점의 데이터 스냅샷 (진행 중 편집과 무관)
    const s = useStore.getState()
    const current = activeCut(s)
    const cuts = scope === 'all' ? s.cuts : [current]
    const file = exportFileName(s.projectName, scope, current)
    setState({ kind: 'running', progress: { percent: 0, message: '준비 중' } })
    try {
      const blob = await runExclusive(() =>
        buildExportZip(cuts, { projectName: s.projectName, capture: captureShot, onProgress: (progress) => setState({ kind: 'running', progress }) }),
      )
      downloadBlob(blob, file)
      setState({ kind: 'done', file })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : '알 수 없는 오류로 내보내기에 실패했습니다.' })
    }
  }

  return (
    <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* 파스텔 색 블록: 밝은 면 위에서는 검정 알약이 주요 버튼 */}
      <div className="space-y-4 rounded-3xl bg-block-lime p-5 text-black sm:p-6">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-black/60">Export</div>
          <h3 className="mt-1 text-[22px] font-light leading-tight tracking-[-0.02em]">영상 제작 자료 내보내기</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="block-primary" className="py-3" disabled={running} onClick={() => run('current')}>
            <Icon name="zip" /> 현재 CUT 내보내기
          </Button>
          <Button variant="block-secondary" className="py-3" disabled={running} onClick={() => run('all')}>
            <Icon name="zip" /> 전체 CUT 내보내기 ({cutCount})
          </Button>
        </div>
        <div className="min-h-[52px] rounded-2xl bg-white/55 px-4 py-2.5" aria-live="polite">
          {state.kind === 'idle' && <p className="text-[12px] text-black/70">시작·종료 프레임 PNG, 영상 프롬프트, 설정 JSON을 ZIP으로 저장합니다.</p>}
          {state.kind === 'running' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px] text-black/80">
                <span>{state.progress.message}</span>
                <span className="font-mono">{state.progress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
                <div className="h-full rounded-full bg-black transition-[width]" style={{ width: `${state.progress.percent}%` }} />
              </div>
            </div>
          )}
          {state.kind === 'done' && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-black">
              <Icon name="check" /> {state.file} 다운로드를 시작했습니다.
            </p>
          )}
          {state.kind === 'error' && <p className={cx('text-[12px] font-medium text-red-700')}>내보내기 실패: {state.message}</p>}
        </div>
      </div>
      <pre className="overflow-x-auto rounded-3xl border border-line bg-well px-3 py-2 font-mono text-[11px] leading-relaxed text-soft">
        {`scene-preview-export/
├─ cut-01/
│  ├─ start-frame.png      모션 0% 시점 (UI 없이 촬영 화면만)
│  ├─ end-frame.png        모션 100% 시점
│  ├─ video-prompt.txt     사용자 수정본 우선
│  └─ scene-settings.json
├─ cut-02/ …
└─ README.txt
16:9 → 1920×1080 · 9:16 → 1080×1920`}
      </pre>
    </div>
  )
}
