import { useEffect, useMemo, useState } from 'react'
import { Search, Car, Wrench, Fuel, Wallet, BellRing } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useGarage } from '../../store/AppStore'
import { useUI, type FormKind } from '../../store/ui'
import { navigate } from '../../lib/router'
import { useFormat } from '../../hooks/useFormat'
import { cn } from '../../lib/cn'

interface Hit {
  key: string
  icon: typeof Car
  title: string
  sub: string
  go: () => void
}

/** Searches across every record type. Open with Ctrl/Cmd+K or "/". */
export function SearchDialog() {
  const { data, vehicleById } = useGarage()
  const { searchOpen, setSearchOpen, openForm } = useUI()
  const f = useFormat()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement).tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    const has = (...xs: (string | number | undefined)[]) => xs.some((x) => x != null && String(x).toLowerCase().includes(t))
    const vName = (id: string) => vehicleById.get(id)?.nickname ?? ''
    const edit = (kind: FormKind, id: string) => () => (setSearchOpen(false), openForm({ kind, id }))
    return [
      ...data.vehicles.filter((v) => has(v.nickname, v.brand, v.model, v.registrationNumber)).map((v) => ({ key: v.id, icon: Car, title: v.nickname, sub: `${v.type}${v.registrationNumber ? `, ${v.registrationNumber}` : ''}`, go: () => (setSearchOpen(false), navigate('garage', v.id)) })),
      ...data.reminders.filter((r) => has(r.title, r.category, r.notes, vName(r.vehicleId))).map((r) => ({ key: r.id, icon: BellRing, title: r.title, sub: `Reminder for ${vName(r.vehicleId)}${r.dueDate ? `, due ${f.date(r.dueDate)}` : ''}`, go: edit('reminder', r.id) })),
      ...data.maintenance.filter((m) => has(m.category, m.description, m.serviceProvider, m.notes, vName(m.vehicleId))).map((m) => ({ key: m.id, icon: Wrench, title: m.category, sub: `${vName(m.vehicleId)}, ${f.date(m.date)}, ${f.money(m.amount)}`, go: edit('maintenance', m.id) })),
      ...data.expenses.filter((e) => has(e.description, e.category, e.notes, vName(e.vehicleId))).map((e) => ({ key: e.id, icon: Wallet, title: e.description, sub: `${e.category}, ${vName(e.vehicleId)}, ${f.date(e.date)}, ${f.money(e.amount)}`, go: edit('expense', e.id) })),
      ...data.fuel.filter((x) => has(x.fuelStation, x.notes, vName(x.vehicleId))).map((x) => ({ key: x.id, icon: Fuel, title: x.fuelStation ?? 'Refill', sub: `${vName(x.vehicleId)}, ${f.date(x.date)}, ${f.money(x.totalCost)}`, go: edit('fuel', x.id) })),
    ].slice(0, 40)
  }, [q, data, vehicleById, f, openForm, setSearchOpen])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    if (!searchOpen) setQ('')
  }, [searchOpen])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, hits.length - 1)))
    if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)))
    if (e.key === 'Enter' && hits[active]) (e.preventDefault(), hits[active].go())
  }

  return (
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search your garage" size="md">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Vehicles, services, expenses, reminders"
          aria-label="Search"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-results"
          aria-activedescendant={hits[active] ? `hit-${hits[active].key}` : undefined}
          className="h-12 w-full rounded-xl border border-line bg-surface-2 pr-4 pl-10 text-base focus:border-fg focus:outline-none"
        />
      </div>
      <ul id="search-results" role="listbox" className="mt-3 max-h-[50dvh] overflow-y-auto">
        {q && !hits.length && <li className="py-8 text-center text-sm text-muted">Nothing matches "{q}". Try a vehicle name, garage or category.</li>}
        {hits.map((h, i) => (
          <li key={h.key} id={`hit-${h.key}`} role="option" aria-selected={i === active}>
            <button onClick={h.go} onMouseMove={() => setActive(i)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === active && 'bg-surface-2')}>
              <h.icon aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{h.title}</span>
                <span className="block truncate text-xs text-muted">{h.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
