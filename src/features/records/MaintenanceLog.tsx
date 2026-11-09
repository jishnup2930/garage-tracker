import { Paperclip } from 'lucide-react'
import type { Maintenance } from '../../types'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { StatusBadge } from '../../components/ui/Badge'

/** Service logbook: a dated timeline, newest first, each entry stamped with its cost. */
export function MaintenanceLog({ records, showVehicle = true }: { records: Maintenance[]; showVehicle?: boolean }) {
  const { vehicleById, reminders } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  return (
    <ol className="relative">
      {records.map((m, i) => {
        const next = reminders.find((r) => r.reminder.maintenanceId === m.id)
        const v = vehicleById.get(m.vehicleId)
        return (
          <li key={m.id} className="relative grid grid-cols-[20px_1fr] gap-x-3 sm:grid-cols-[92px_20px_1fr]">
            <p className="hidden pt-3.5 text-right text-xs font-medium text-muted tabular sm:block">{f.date(m.date)}</p>
            <div className="relative flex justify-center">
              {i < records.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 w-px bg-line" />}
              <span aria-hidden className="relative mt-4 grid size-5 place-items-center rounded-full border-2 border-surface bg-fg">
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
            </div>
            <button onClick={() => openForm({ kind: 'maintenance', id: m.id })} className="group mb-2 min-w-0 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold group-hover:underline">{m.category}</p>
                  <p className="text-[13px] text-muted">
                    <span className="sm:hidden">{f.date(m.date)}, </span>
                    {showVehicle && v ? `${v.nickname}, ` : ''}
                    <span className="tabular">{f.dist(m.odometer)}</span>
                    {m.serviceProvider ? `, ${m.serviceProvider}` : ''}
                  </p>
                </div>
                <p className="shrink-0 font-display font-semibold tabular">{f.money(m.amount)}</p>
              </div>
              {m.description && <p className="mt-1 text-sm">{m.description}</p>}
              {(next || m.receipt) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {next && (
                    <>
                      <StatusBadge state={next.eval.state} />
                      <span>
                        Next{next.reminder.dueOdometer != null ? ` at ${f.dist(next.reminder.dueOdometer)}` : ''}
                        {next.reminder.dueOdometer != null && next.reminder.dueDate ? ' or' : ''}
                        {next.reminder.dueDate ? ` on ${f.date(next.reminder.dueDate)}` : ''}
                      </span>
                    </>
                  )}
                  {m.receipt && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="size-3" /> Receipt
                    </span>
                  )}
                </div>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

