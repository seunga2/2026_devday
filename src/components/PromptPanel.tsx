import { useMemo, useState } from 'react'
import { downloadBlob } from '../lib/capture'
import { generatePrompt } from '../lib/prompt'
import { useActiveCut, useStore } from '../store/store'
import { Button, Icon, Label, cx } from './ui'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 클립보드 API가 막힌 환경 대비
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

const MOOD_CHIPS = ['따뜻한', '영화 같은', '고요한', '긴장감 있는', '쓸쓸한', '몽환적인', '로맨틱한', '어두운']

export function PromptPanel() {
  const cut = useActiveCut()
  const setAction = useStore((s) => s.setAction)
  const setMood = useStore((s) => s.setMood)
  const editPrompt = useStore((s) => s.editPrompt)
  const resetPrompt = useStore((s) => s.resetPrompt)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  const generated = useMemo(() => generatePrompt(cut), [cut])
  const value = cut.prompt.edited ? cut.prompt.text : generated

  const copy = async () => {
    setCopied((await copyText(value)) ? 'ok' : 'fail')
    setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-3">
        <div>
          <Label>인물 행동</Label>
          <textarea
            value={cut.action}
            onChange={(e) => setAction(e.target.value)}
            rows={3}
            placeholder="예) 인물이 창밖을 바라보다 천천히 미소 짓는다"
            className="w-full resize-y rounded-lg border border-line bg-well px-3 py-2 text-[13px] text-ink placeholder:text-mute focus:border-accent/60 focus:outline-none"
          />
        </div>
        <div>
          <Label>영상 분위기</Label>
          <textarea
            value={cut.mood}
            onChange={(e) => setMood(e.target.value)}
            rows={2}
            placeholder="예) 따뜻하고 영화 같은 분위기"
            className="w-full resize-y rounded-lg border border-line bg-well px-3 py-2 text-[13px] text-ink placeholder:text-mute focus:border-accent/60 focus:outline-none"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {MOOD_CHIPS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(cut.mood.includes(m) ? cut.mood.replace(m, '').replace(/\s{2,}/g, ' ').trim() : `${cut.mood} ${m}`.trim())}
                className={cx('rounded-full border px-2 py-0.5 text-[11px]', cut.mood.includes(m) ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-soft hover:text-ink')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <p className="rounded-lg border border-line bg-well px-3 py-2 text-[11px] leading-relaxed text-mute">
          프롬프트는 카메라 거리·높이·화각·움직임·시작/종료 구도·길이·조명 설정과 위 입력을 <b className="text-soft">규칙 기반 템플릿</b>으로 조합해 만듭니다. AI 모델이 생성한 문장이 아닙니다. 한국어 입력은 주요 키워드만 영어로 변환되고, 변환되지 않은 문장은 원문 그대로 포함됩니다.
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>
            영상 프롬프트 (English) ·{' '}
            <span className={cut.prompt.edited ? 'text-amber-300' : 'text-accent'}>{cut.prompt.edited ? '직접 수정됨 — 자동 갱신 안 함' : '템플릿 자동 생성 — 설정 변경 시 자동 갱신'}</span>
          </Label>
          <div className="flex gap-1.5">
            {cut.prompt.edited && (
              <Button variant="ghost" onClick={() => window.confirm('수정한 내용을 버리고 자동 생성 프롬프트로 되돌릴까요?') && resetPrompt()}>
                <Icon name="wand" className="h-3.5 w-3.5" /> 자동 생성으로 되돌리기
              </Button>
            )}
            <Button onClick={copy}>
              <Icon name={copied === 'ok' ? 'check' : 'copy'} className="h-3.5 w-3.5" /> {copied === 'ok' ? '복사됨' : copied === 'fail' ? '복사 실패' : '복사'}
            </Button>
            <Button onClick={() => downloadBlob(new Blob([value + '\n'], { type: 'text/plain;charset=utf-8' }), `${cut.name.replace(/\s+/g, '-')}-video-prompt.txt`)}>
              <Icon name="download" className="h-3.5 w-3.5" /> TXT
            </Button>
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => editPrompt(e.target.value)}
          rows={11}
          aria-label="영상 프롬프트"
          spellCheck={false}
          className="min-h-[220px] w-full flex-1 resize-y rounded-lg border border-line bg-well px-3 py-2 font-mono text-[12px] leading-relaxed text-ink focus:border-accent/60 focus:outline-none"
        />
        <div className="text-right font-mono text-[10px] text-mute">{value.length} chars · CUT별 저장 · ZIP 내보내기에 포함</div>
      </div>
    </div>
  )
}
