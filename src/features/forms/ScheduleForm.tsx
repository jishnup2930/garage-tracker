import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Reminder } from '../../types'
import { useGarage } from '../../store/AppStore'
import { useFormat } from '../../hooks/useFormat'
import { addReminders } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { dueFor, standardSchedule } from '../../lib/schedules'
import { cn } from '../../lib/cn'

/** One tap to add the usual service reminders for a vehicle. Items it already has are skipped. */
export function ScheduleForm({ formId, vehicleId, onSaved }: { formId: string; vehicleId?: string; onSaved: (n: number) => void }) {
  const { data, update } = useGarage()
  const f = useFormat()
  const v = data.vehicles.find((x) => x.id === vehicleId) ?? data.vehicles[0]
  const items = v ? standardSchedule(v) : []
  // Already covered: same title, or (except "Custom") the same reminder category, e.g. a manual "Oil change".
  const has = (title: string) => {
    const cat = items.find((i) => i.title === title)?.category
    return data.reminders.some((r) => r.vehicleId === v?.id && r.status === 'active' && (r.title === title || (cat !== 'Custom' && r.category === cat)))
  }
  const [picked, setPicked] = useState(() => new Set(items.filter((i) => !has(i.title)).map((i) => i.title)))
  if (!v) return null

  const every = (km?: number, months?: number) =>
    [km && `every ${f.dist(km)}`, months && `${km ? 'or ' : 'every '}${months % 12 === 0 ? `${months / 12} ${months === 12 ? 'year' : 'years'}` : `${months} months`}`].filter(Boolean).join(' ')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const rs: Reminder[] = items
      .filter((i) => picked.has(i.title) && !has(i.title))
      .map((i) => ({ id: uid(), vehicleId: v.id, title: i.title, category: i.category, ...dueFor(i, v.currentOdometer), leadTime: data.settings.defaultLeadTime, status: 'active', notifiedKeys: [], createdAt: nowIso() }))
    if (update((d) => addReminders(d, rs))) onSaved(rs.length)
  }

  return (
    <form id={formId} onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Usual intervals for a {v.fuelType === 'Electric' ? 'electric ' : ''}
        {v.type.toLowerCase()}, counted from today and {f.dist(v.currentOdometer)}. Every maker is different, so check your owner's manual and edit any reminder later.
      </p>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {items.map((i) => {
          const done = has(i.title)
          const on = picked.has(i.title)
          return (
            <li key={i.title}>
              <label className={cn('flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-text', done && 'cursor-default opacity-60')}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on && !done}
                  disabled={done}
                  onChange={() => setPicked((s) => {
                    const n = new Set(s)
                    if (n.has(i.title)) n.delete(i.title)
                    else n.add(i.title)
                    return n
                  })}
                />
                <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-md border', on && !done ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                  {on && !done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{i.title}</span>
                  <span className="block text-xs text-muted">{done ? 'Already set' : every(i.km, i.months)}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </form>
  )
}
