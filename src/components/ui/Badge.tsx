import { CircleCheck, Clock, CalendarClock, AlertOctagon, CircleDot } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ReminderState } from '../../lib/calc'
import { cn } from '../../lib/cn'

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted', className)}>{children}</span>
}

const STATUS: Record<ReminderState, { label: string; cls: string; icon: typeof Clock }> = {
  upcoming: { label: 'Upcoming', cls: 'bg-surface-2 text-muted', icon: CircleDot },
  soon: { label: 'Due soon', cls: 'bg-warn/12 text-warn', icon: Clock },
  today: { label: 'Due today', cls: 'bg-warn/18 text-warn', icon: CalendarClock },
  overdue: { label: 'Overdue', cls: 'bg-danger/12 text-danger', icon: AlertOctagon },
  completed: { label: 'Completed', cls: 'bg-ok/12 text-ok', icon: CircleCheck },
}

/** Status always carries an icon and a word, never colour alone. */
export function StatusBadge({ state }: { state: ReminderState }) {
  const s = STATUS[state]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', s.cls)}>
      <s.icon aria-hidden className="size-3.5" />
      {s.label}
    </span>
  )
}

export const statusDot: Record<ReminderState, string> = {
  upcoming: 'bg-faint',
  soon: 'bg-warn',
  today: 'bg-warn',
  overdue: 'bg-danger',
  completed: 'bg-ok',
}

export function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('plate inline-block text-[11px] text-fg', className)}>{children}</span>
}
