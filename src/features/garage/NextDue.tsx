import type { EvaluatedReminder } from '../../store/AppStore'
import { useFormat } from '../../hooks/useFormat'
import { dueText } from '../../lib/format'
import { statusDot } from '../../components/ui/Badge'
import { cn } from '../../lib/cn'

/** "Engine oil change · in 5 days / 420 km" style summary of the nearest reminder. */
export function dueSummary(r: EvaluatedReminder, f: ReturnType<typeof useFormat>) {
  const parts: string[] = []
  const { daysLeft, distanceLeft } = r.eval
  if (daysLeft != null) parts.push(dueText(daysLeft))
  if (distanceLeft != null) parts.push(distanceLeft < 0 ? `${f.dist(-distanceLeft)} over` : `${f.dist(distanceLeft)} to go`)
  return parts.join(' or ')
}

export function NextDue({ r, className }: { r?: EvaluatedReminder; className?: string }) {
  const f = useFormat()
  if (!r) return <span className={cn('text-faint', className)}>Nothing scheduled</span>
  return (
    <span className={cn('flex min-w-0 items-start gap-1.5', className)}>
      <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', statusDot[r.eval.state])} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{r.reminder.title}</span>
        <span className={cn('block truncate text-xs', r.eval.state === 'overdue' ? 'text-danger' : r.eval.state === 'upcoming' ? 'text-muted' : 'text-warn')}>{dueSummary(r, f)}</span>
      </span>
    </span>
  )
}
