import { Check, Clock, Pencil, RotateCcw, Trash2, MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EvaluatedReminder } from '../../store/AppStore'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { StatusBadge } from '../../components/ui/Badge'
import { Menu } from '../../components/ui/Menu'
import { Button } from '../../components/ui/Button'
import { useReminderActions } from '../reminders/useReminderActions'
import { deleteReminder } from '../../store/ops'
import { dueSummary } from '../garage/NextDue'
import { useToast } from '../../components/ui/Toast'
import { isSnoozed } from '../../lib/calc'

export function ReminderList({ items, showVehicle = true }: { items: EvaluatedReminder[]; showVehicle?: boolean }) {
  const { openForm, confirm } = useUI()
  const { update, today } = useGarage()
  const toast = useToast()
  const f = useFormat()
  const a = useReminderActions()
  const i = 'size-4 text-muted'

  const remove = async (id: string) => {
    if (await confirm({ title: 'Delete this reminder?', message: 'You will stop getting alerts for it. This cannot be undone.', confirmLabel: 'Delete', danger: true }))
      update((d) => deleteReminder(d, id)) && toast.success('Reminder deleted')
  }

  return (
    <ul className="divide-y divide-line">
      <AnimatePresence initial={false}>
        {items.map(({ reminder: r, vehicle, eval: e }) => (
          <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button onClick={() => openForm({ kind: 'reminder', id: r.id })} className="truncate text-left font-semibold hover:underline">
                  {r.title}
                </button>
                <StatusBadge state={e.state} />
                {isSnoozed(r, today) && <span className="text-xs text-muted">Snoozed until {f.date(r.snoozedUntil)}</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">
                {showVehicle && vehicle ? `${vehicle.nickname}, ` : ''}
                {r.status === 'completed'
                  ? `Done ${r.completedAt ? f.date(r.completedAt.slice(0, 10)) : ''}`
                  : [r.dueDate && f.date(r.dueDate), r.dueOdometer != null && `at ${f.dist(r.dueOdometer)}`].filter(Boolean).join(' or ') + ` (${dueSummary({ reminder: r, vehicle, eval: e }, f).toLowerCase()})`}
              </p>
            </div>
            {r.status === 'active' ? (
              <Button size="sm" variant="outline" icon={<Check className="size-3.5" />} onClick={() => a.complete(r.id)} aria-label={`Mark ${r.title} done`}>
                <span className="hidden sm:inline">Done</span>
              </Button>
            ) : (
              <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => a.reopen(r.id)}>
                <span className="hidden sm:inline">Reopen</span>
              </Button>
            )}
            <Menu
              label={`More actions for ${r.title}`}
              items={[
                ...(r.status === 'active'
                  ? [
                      { label: 'Snooze 1 day', icon: <Clock className={i} />, onSelect: () => a.snooze(r.id, 1) },
                      { label: 'Snooze 3 days', icon: <Clock className={i} />, onSelect: () => a.snooze(r.id, 3) },
                      { label: 'Snooze 1 week', icon: <Clock className={i} />, onSelect: () => a.snooze(r.id, 7) },
                    ]
                  : []),
                { label: 'Edit', icon: <Pencil className={i} />, onSelect: () => openForm({ kind: 'reminder', id: r.id }) },
                { label: 'Delete', icon: <Trash2 className="size-4" />, danger: true, onSelect: () => remove(r.id) },
              ]}
              trigger={(p) => (
                <button {...p} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
