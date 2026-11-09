import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[62ch] text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A bordered surface for a group of related content. */
export function Panel({ title, action, children, className, bodyClass }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('min-w-0 rounded-[22px] border border-line bg-surface', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
          {title && <h2 className="font-display text-[17px] font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn('p-5 sm:px-6', title ? 'pt-4' : undefined, bodyClass)}>{children}</div>
    </section>
  )
}

/** A row of stat tiles. */
export function Readouts({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)}>{children}</div>
}

export type Tone = 'green' | 'blue' | 'orange' | 'purple' | 'red'

/** Stat tile: coloured icon badge, big value, label, footnote. `color` picks the category colour. */
export function Readout({ label, value, icon, foot, tone, color = 'green' }: { label: string; value: ReactNode; icon: ReactNode; foot?: ReactNode; tone?: 'alert'; color?: Tone }) {
  return (
    <div className={cn('tone-wash min-w-0 rounded-[20px] border border-line p-4 sm:p-5', `tone-${color}`)}>
      <span aria-hidden className="icon-chip size-10 rounded-xl [&>svg]:size-5">
        {icon}
      </span>
      <div className={cn('mt-3 font-display text-[24px] leading-none font-semibold tracking-tight sm:text-[30px]', tone === 'alert' && 'text-danger')}>{value}</div>
      <p className="mt-1.5 text-[13px] font-medium">{label}</p>
      {foot && <div className="mt-1 text-xs text-muted">{foot}</div>}
    </div>
  )
}

/** Change vs previous period. For spending, up is not "good", so we use neutral wording, not green/red. */
export function Delta({ now, prev, fmt, suffix = 'vs last month' }: { now: number; prev: number; fmt: (n: number) => string; suffix?: string }) {
  if (!prev && !now) return <span>Nothing logged yet</span>
  if (!prev) return <span>Nothing last month</span>
  const diff = now - prev
  if (Math.abs(diff) < 0.5) return <span>Same as last month</span>
  return (
    <span>
      <span className={cn('font-semibold', diff > 0 ? 'text-fg' : 'text-ok')}>
        {diff > 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
      </span>{' '}
      {suffix}
    </span>
  )
}
