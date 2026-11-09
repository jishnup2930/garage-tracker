import { useMemo, useState } from 'react'
import { Plus, Wallet, Sparkles } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { Delta, PageHeader, Panel, Readout, Readouts } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar, useFilters } from '../../components/FilterBar'
import { ExpenseBars } from '../../components/charts/ExpenseBars'
import { Donut } from '../../components/charts/Donut'
import { SimpleBars } from '../../components/charts/Lines'
import { PairBars } from '../../components/charts/PairBars'
import { CAT_COLOR, vehicleColor } from '../../components/charts/theme'
import { CostList } from '../records/CostList'
import { useExpenseAggregates } from './useExpenseData'
import { insights, monthTotal, monthsSpanned, totalOf, type ChartCategory } from '../../lib/calc'
import { EXPENSE_CATEGORIES } from '../../types'

export function ExpensesPage() {
  const { data, lines } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const { filters, setFilters, match } = useFilters()
  const [category, setCategory] = useState('')
  const filtered = useMemo(() => lines.filter((l) => match(l, l.description, l.notes, l.category) && (!category || l.category === category)), [lines, match, category])
  const agg = useExpenseAggregates(filtered, data.vehicles)
  const tips = useMemo(() => insights(filtered, data.vehicles, f.money), [filtered, data.vehicles, f.money])

  const total = totalOf(filtered)
  const months = monthsSpanned(filtered)
  const cat = (c: string) => totalOf(filtered.filter((l) => l.category === c))
  const add = <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'expense', vehicleId: filters.vehicleId || undefined })}>Add an expense</Button>

  if (!lines.length)
    return (
      <>
        <PageHeader title="Expenses" subtitle="Exactly what each vehicle costs you, from fuel to parking." />
        <Panel>
          <EmptyState icon={Wallet} title="Nothing spent yet" message="Add insurance, repairs, parking or tolls. Fuel and maintenance you log show up here automatically, counted once." action={add} />
        </Panel>
      </>
    )

  return (
    <>
      <PageHeader title="Expenses" subtitle="Exactly what each vehicle costs you, from fuel to parking. Fuel and maintenance come from their own logs and are counted once." actions={add} />
      <FilterBar filters={filters} setFilters={setFilters}>
        <div className="w-full sm:w-44">
          <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <div className="space-y-5">
        <Readouts>
          <Readout label="Total" value={f.money(total)} foot={`${filtered.length} entries`} />
          <Readout label="This month" value={f.money(monthTotal(filtered, 0))} foot={<Delta now={monthTotal(filtered, 0)} prev={monthTotal(filtered, 1)} fmt={f.money} />} />
          <Readout label="Last month" value={f.money(monthTotal(filtered, 1))} foot="Previous calendar month" />
          <Readout label="Monthly average" value={months ? f.money(total / months) : '—'} foot={months ? `Across ${months} ${months === 1 ? 'month' : 'months'}` : 'No data'} />
        </Readouts>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[22px] border border-line bg-line text-sm">
          {(['Fuel', 'Maintenance', 'Repairs'] as const).map((c) => (
            <div key={c} className="bg-surface p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span className="size-2 rounded-[3px]" style={{ background: CAT_COLOR[c] }} />
                {c}
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular sm:text-xl">{f.money(cat(c))}</p>
            </div>
          ))}
        </div>

        {tips.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {tips.map((t) => (
              <li key={t} className="flex items-start gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Monthly trend" className="lg:col-span-2">
            <ExpenseBars lines={filtered} range="12m" />
          </Panel>
          <Panel title="By category">{agg.byCategory.length ? <Donut data={agg.byCategory} colorOf={(d) => CAT_COLOR[d.name as ChartCategory]} /> : <Empty />}</Panel>
          <Panel title="By vehicle">
            {agg.byVehicle.length ? <Donut data={agg.byVehicle} colorOf={(d) => vehicleColor(data.vehicles.findIndex((v) => v.id === d.id))} /> : <Empty />}
          </Panel>
          <Panel title="Fuel vs maintenance">
            <PairBars data={agg.fuelVsMaint} fmt={f.money} tickFmt={f.moneyCompact} />
          </Panel>
          <Panel title="Yearly overview">{agg.yearly.length ? <SimpleBars data={agg.yearly} x="label" y="total" name="Spent" color="var(--series-7)" fmt={f.money} tickFmt={f.moneyCompact} height={256} /> : <Empty />}</Panel>
        </div>

        <Panel title="All entries" action={<span className="text-sm text-muted">Tap an entry to edit it</span>}>
          {filtered.length ? <CostList lines={filtered} /> : <Empty />}
        </Panel>
      </div>
    </>
  )
}

const Empty = () => <p className="py-12 text-center text-sm text-muted">Nothing matches these filters.</p>
