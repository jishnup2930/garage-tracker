import { useState } from 'react'
import type { CostLine } from '../../types'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { chartCategory } from '../../lib/calc'
import { CAT_COLOR } from '../../components/charts/theme'

/** Every spend, from fuel, maintenance and manual expenses. Opens the record's own form to edit. */
export function CostList({ lines, showVehicle = true, limit }: { lines: CostLine[]; showVehicle?: boolean; limit?: number }) {
  const { vehicleById } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const [count, setCount] = useState(limit ?? 40)
  const shown = lines.slice(0, count)
  return (
    <>
    <ul className="-mx-2">
      {shown.map((l) => (
        <li key={`${l.source}-${l.id}`}>
          <button onClick={() => openForm({ kind: l.source, id: l.id })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
            <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ background: CAT_COLOR[chartCategory(l.category)] }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{l.description}</span>
              <span className="block truncate text-xs text-muted">
                {l.category}
                {showVehicle ? `, ${vehicleById.get(l.vehicleId)?.nickname ?? 'Removed vehicle'}` : ''}, {f.date(l.date)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular">{f.money(l.amount)}</span>
          </button>
        </li>
      ))}
    </ul>
    {!limit && lines.length > count && <ShowMore left={lines.length - count} onClick={() => setCount((c) => c + 40)} />}
    </>
  )
}

export function ShowMore({ left, onClick }: { left: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-3 h-10 w-full rounded-xl border border-line text-sm font-semibold text-muted hover:border-faint hover:text-fg">
      Show more ({left} left)
    </button>
  )
}
