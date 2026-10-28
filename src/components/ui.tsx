import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Panel({ title, index, right, children, className }: { title?: ReactNode; index?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-panel', className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink">
            {title}
            {index && <span className="font-mono text-[11px] font-normal text-mute">{index}</span>}
          </h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">{children}</div>
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  digits = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  digits?: number
  onChange: (v: number) => void
}) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[12px]">
        <label htmlFor={id} className="text-soft">
          {label}
        </label>
        <span className="font-mono text-ink tabular-nums">
          {value.toFixed(digits)}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
}: {
  options: { value: T; label: ReactNode; title?: string }[]
  value: T | null
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-lg border border-line bg-well p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2 py-1.5 text-[12px]',
            value === o.value ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'text-soft hover:bg-white/5 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'
export function Button({ variant = 'outline', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-[#06201b] hover:bg-accent-strong',
        variant === 'outline' && 'border border-line bg-well text-ink hover:border-accent/50 hover:text-accent',
        variant === 'ghost' && 'text-soft hover:bg-white/5 hover:text-ink',
        variant === 'danger' && 'border border-red-500/30 text-red-300 hover:bg-red-500/10',
        className,
      )}
    >
      {children}
    </button>
  )
}

const paths: Record<string, ReactNode> = {
  camera: <path d="M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  light: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" />,
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" />,
  pause: <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />,
  restart: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  save: <path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />,
  reset: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  copy: <path d="M8 8h11v12H8zM5 16V4h11" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  grid: <path d="M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />,
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  image: <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1 1 0 1 0 0-.1" />,
  check: <path d="M5 12l5 5L20 7" />,
  zip: <path d="M6 3h9l4 4v14H6zM11 3v2h2v2h-2v2h2v2h-2v3h2" />,
  wand: <path d="M4 20L16 8M14 4v3M18 8h3M17 5l2-2M11 6l1 1" />,
  film: <path d="M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4" />,
  duplicate: <path d="M8 8h12v12H8zM4 4h12v4M4 4v12h4M14 11v6M11 14h6" />,
}

export function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  )
}
