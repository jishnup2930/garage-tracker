import { ChevronRight } from 'lucide-react'
import type { Paper } from '../../types'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { daysSince } from '../../lib/schedules'
import { cn } from '../../lib/cn'

/** Papers with how long each is still valid. Tapping one opens it for editing. */
export function PaperList({ papers }: { papers: Paper[] }) {
  const { today } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const sorted = [...papers].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
  return (
    <ul className="-mx-2 divide-y divide-line">
      {sorted.map((p) => {
        const left = -daysSince(p.expiryDate, today)
        const status = left < 0 ? `Expired ${-left} ${left === -1 ? 'day' : 'days'} ago` : left === 0 ? 'Expires today' : `Valid for ${left} ${left === 1 ? 'more day' : 'more days'}`
        return (
          <li key={p.id}>
            <button className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface-2" onClick={() => openForm({ kind: 'paper', id: p.id })}>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.type}</span>
                <span className="block truncate text-xs text-muted">{[p.provider, p.number].filter(Boolean).join(', ') || 'No number saved'}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-medium tabular">{f.date(p.expiryDate)}</span>
                <span className={cn('block text-xs', left < 0 ? 'text-danger' : left <= 30 ? 'text-warn' : 'text-muted')}>{status}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-faint" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
