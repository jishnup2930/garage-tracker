import { useMemo, useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useGarage } from '../store/AppStore'
import { Select } from './ui/Field'
import { inRange } from '../lib/calc'

export interface Filters {
  vehicleId: string
  from: string
  to: string
  q: string
}
export const emptyFilters: Filters = { vehicleId: '', from: '', to: '', q: '' }

export function useFilters(initial: Partial<Filters> = {}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters, ...initial })
  const match = useMemo(
    () =>
      (r: { vehicleId: string; date: string }, ...text: (string | number | undefined)[]) =>
        (!filters.vehicleId || r.vehicleId === filters.vehicleId) &&
        inRange(r.date, filters.from || undefined, filters.to || undefined) &&
        (!filters.q || text.some((t) => t != null && String(t).toLowerCase().includes(filters.q.toLowerCase()))),
    [filters],
  )
  /** Vehicle + date only. For calculations that break if refills are removed from the middle by a search. */
  const matchRange = useMemo(
    () => (r: { vehicleId: string; date: string }) => (!filters.vehicleId || r.vehicleId === filters.vehicleId) && inRange(r.date, filters.from || undefined, filters.to || undefined),
    [filters],
  )
  return { filters, setFilters, match, matchRange }
}

// 16px text on phones: iOS zooms into smaller fields.
const field = 'h-10 rounded-xl border border-line bg-surface px-3 text-base sm:text-sm focus:border-fg focus:outline-none'

/** One row of filters above a list or chart. On phones, dates and extra filters fold behind a "Filters" button. */
export function FilterBar({ filters, setFilters, search = true, children }: { filters: Filters; setFilters: (f: Filters) => void; search?: boolean; children?: ReactNode }) {
  const { data } = useGarage()
  const set = (p: Partial<Filters>) => setFilters({ ...filters, ...p })
  const active = filters.vehicleId || filters.from || filters.to || filters.q
  const [open, setOpen] = useState(false)
  const dated = !!(filters.from || filters.to)
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search" aria-label="Search records" className={`${field} w-full pl-9`} />
        </div>
      )}
      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
        <Select aria-label="Vehicle" value={filters.vehicleId} onChange={(e) => set({ vehicleId: e.target.value })} className="h-10">
          <option value="">All vehicles</option>
          {data.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nickname}
            </option>
          ))}
        </Select>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn('relative flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold sm:hidden', open ? 'border-fg bg-fg text-bg' : 'border-line bg-surface')}
      >
        <SlidersHorizontal aria-hidden className="size-4" /> Filters
        {dated && !open && <span aria-label="Date filter on" className="absolute -top-1 -right-1 size-2.5 rounded-full bg-accent ring-2 ring-bg" />}
      </button>
      {/* `sm:contents` drops this wrapper on wider screens so everything sits in one row. */}
      <div className={cn('w-full flex-wrap items-center gap-2 sm:contents', open ? 'flex' : 'hidden')}>
        <label className="flex w-full min-w-0 items-center gap-2 text-xs text-muted sm:w-auto">
          <span className="w-9 sm:w-auto">From</span>
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className={`${field} min-w-0 flex-1`} />
        </label>
        <label className="flex w-full min-w-0 items-center gap-2 text-xs text-muted sm:w-auto">
          <span className="w-9 sm:w-auto">To</span>
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={`${field} min-w-0 flex-1`} />
        </label>
        {children}
      </div>
      {active && (
        <button onClick={() => setFilters({ ...emptyFilters })} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-4" /> Clear
        </button>
      )}
    </div>
  )
}
