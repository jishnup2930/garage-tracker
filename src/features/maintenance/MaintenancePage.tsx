import { useMemo, useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar, useFilters } from '../../components/FilterBar'
import { MaintenanceLog } from '../records/MaintenanceLog'
import { DEFAULT_MAINTENANCE_CATEGORIES } from '../../types'
import { sum } from '../../lib/calc'

type Sort = 'newest' | 'oldest' | 'cost'

export function MaintenancePage() {
  const { data } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const { filters, setFilters, match } = useFilters()
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const categories = [...new Set([...DEFAULT_MAINTENANCE_CATEGORIES, ...data.customMaintenanceCategories, ...data.maintenance.map((m) => m.category)])]

  const records = useMemo(() => {
    const out = data.maintenance.filter((m) => match(m, m.category, m.description, m.serviceProvider, m.notes) && (!category || m.category === category))
    if (sort === 'newest') out.sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)
    if (sort === 'oldest') out.sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
    if (sort === 'cost') out.sort((a, b) => b.amount - a.amount)
    return out
  }, [data.maintenance, match, category, sort])

  const add = <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'maintenance', vehicleId: filters.vehicleId || undefined })}>Log maintenance</Button>

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Every service, part and fix, with the next one scheduled by date, distance or both." actions={data.maintenance.length > 0 && add} />
      {!data.maintenance.length ? (
        <Panel>
          <EmptyState icon={Wrench} title="No maintenance logged yet" message="Log an oil change, tyre swap or service. Add when the next one is due and we'll keep track." action={add} />
        </Panel>
      ) : (
        <>
          <FilterBar filters={filters} setFilters={setFilters}>
            <div className="w-full sm:w-52">
              <Select aria-label="Maintenance type" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10">
                <option value="">All types</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="cost">Highest cost</option>
              </Select>
            </div>
          </FilterBar>
          <Panel
            title={`${records.length} ${records.length === 1 ? 'record' : 'records'}`}
            action={<span className="text-sm text-muted">Total <span className="font-semibold text-fg tabular">{f.money(sum(records.map((r) => r.amount)))}</span></span>}
          >
            {records.length ? <MaintenanceLog records={records} /> : <p className="py-10 text-center text-sm text-muted">No records match these filters.</p>}
          </Panel>
        </>
      )}
    </>
  )
}
