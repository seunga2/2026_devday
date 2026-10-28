import { useEffect, useRef, useState } from 'react'
import { attachAutosave, initialLoadSource, useStore } from '../store/store'
import { Button, Icon, cx } from './ui'

type SaveState = { error: string | null; at: number | null; manual: boolean }

export function Header() {
  const projectName = useStore((s) => s.projectName)
  const setProjectName = useStore((s) => s.setProjectName)
  const resetActiveCut = useStore((s) => s.resetActiveCut)
  const [save, setSave] = useState<SaveState>({ error: null, at: null, manual: false })
  const auto = useRef<ReturnType<typeof attachAutosave> | null>(null)

  useEffect(() => {
    const a = attachAutosave(useStore, (error, at) => setSave((s) => ({ error, at, manual: s.manual })))
    auto.current = a
    const beforeUnload = () => a.flush()
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      a.dispose()
    }
  }, [])

  const saveNow = () => {
    auto.current?.flush()
    setSave((s) => ({ ...s, manual: true }))
    setTimeout(() => setSave((s) => ({ ...s, manual: false })), 1800)
  }

  const time = save.at ? new Date(save.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-[#0e1012]/95 px-4 backdrop-blur">
      <div className="flex shrink-0 items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3l4 7M21 12h-8M16.5 19.8L12.5 13M7.5 19.8l4-6.8M3 12h8M7.5 4.2l4 6.8" />
        </svg>
        <span className="text-[17px] font-bold tracking-tight text-ink">
          scene<span className="font-light text-soft">preview</span>
        </span>
        <span className="hidden rounded border border-accent/50 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-accent sm:inline">STUDIO</span>
      </div>
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        aria-label="프로젝트 이름"
        className="hidden min-w-0 max-w-64 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-soft hover:border-line focus:border-accent/60 focus:text-ink focus:outline-none md:block"
      />
      <div className="ml-auto flex items-center gap-2">
        <span className={cx('hidden text-[11px] sm:inline', save.error ? 'text-red-300' : 'text-mute')} role="status">
          {save.error
            ? save.error
            : save.manual
              ? '프로젝트를 저장했습니다'
              : time
                ? `자동 저장됨 ${time}`
                : initialLoadSource === 'legacy'
                  ? '기존 버전 데이터를 불러왔습니다'
                  : initialLoadSource === 'current'
                    ? '저장된 프로젝트를 불러왔습니다'
                    : '변경 사항은 자동 저장됩니다'}
        </span>
        <Button onClick={saveNow} title="브라우저(LocalStorage)에 즉시 저장">
          <Icon name={save.manual ? 'check' : 'save'} className="h-3.5 w-3.5" /> 저장
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.confirm('현재 CUT의 카메라·조명·모션 설정을 초기값으로 되돌릴까요? (장면 설명과 직접 수정한 프롬프트는 유지됩니다)') && resetActiveCut()}
          title="현재 CUT 설정 초기화"
        >
          <Icon name="reset" className="h-3.5 w-3.5" /> 초기화
        </Button>
      </div>
    </header>
  )
}
