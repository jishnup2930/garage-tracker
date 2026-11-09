import { useMemo } from 'react'
import { Fuel, Plus, Gauge, Activity, Coins } from 'lucide-react'
import { format, parseISO, subMonths } from 'date-fns'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { PageHeader, Panel, Readout, Readouts } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar, useFilters } from '../../components/FilterBar'
import { FuelLog } from '../records/FuelLog'
import { fuelStats, monthKey, sum, todayStr } from '../../lib/calc'
import { SimpleBars, TrendLine } from '../../components/charts'

/** How much to trust the average: full tanks are exact, refill-to-refill gets better with more refills. */
export function mileageBasis(s: { estimated: boolean; refills: number; mode: string }) {
  if (s.mode === 'battery') return `from ${s.refills} charges`
  if (!s.estimated) return 'from full tanks'
  return s.refills < 5 ? `rough, from ${s.refills} refills` : `estimate from ${s.refills} refills`
}

export function FuelPage() {
  const { data } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const { filters, setFilters, match, matchRange } = useFilters({ vehicleId: data.vehicles.length === 1 ? data.vehicles[0].id : '' })
  const entries = useMemo(() => data.fuel.filter((e) => match(e, e.fuelStation, e.notes, e.fuelType)), [data.fuel, match])
  const vehicle = data.vehicles.find((v) => v.id === filters.vehicleId)
  // Mileage ignores the search box: hiding refills mid-series would overstate it.
  const stats = useMemo(() => fuelStats(data.fuel.filter(matchRange)), [data.fuel, matchRange])
  const thisMonth = sum(entries.filter((e) => monthKey(e.date) === todayStr().slice(0, 7)).map((e) => e.totalCost))
  const units = new Set(entries.map((e) => f.u.volume(e.fuelType)))
  const unit = units.size === 1 ? [...units][0] : null

  const monthly = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => format(subMonths(now, 11 - i), 'yyyy-MM'))
    return months.map((m) => {
      const es = entries.filter((e) => monthKey(e.date) === m)
      return { label: format(parseISO(`${m}-01`), 'MMM'), spend: sum(es.map((e) => e.totalCost)), quantity: sum(es.map((e) => e.quantity)) }
    })
  }, [entries])
  const priceTrend = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ label: f.date(e.date), price: e.pricePerUnit })), [entries, f])
  const segs = stats.segments.map((s) => ({ label: f.date(s.date), mileage: Math.round(s.mileage * 10) / 10, cpk: Math.round((s.cost / s.distance) * 100) / 100 }))

  const perVehicle = useMemo(
    () =>
      data.vehicles
        .map((v) => ({ v, s: fuelStats(data.fuel.filter((e) => e.vehicleId === v.id && matchRange(e))) }))
        .filter((x) => x.s.totalCost > 0),
    [data.vehicles, data.fuel, matchRange],
  )

  const add = <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'fuel', vehicleId: filters.vehicleId || undefined })}>{vehicle?.fuelType === 'Electric' ? 'Log a charge' : 'Log a refill'}</Button>
  if (!data.fuel.length)
    return (
      <>
        <PageHeader title="Fuel & Mileage" subtitle="Refills, real-world mileage and what every kilometre costs you." />
        <Panel>
          <EmptyState icon={Fuel} title="No refills logged yet" message="Log what you paid and the odometer reading each time you fill up. After two refills you'll see mileage and cost per kilometre." action={add} />
        </Panel>
      </>
    )

  const eff = vehicle ? f.effUnit(vehicle.fuelType, stats.mode) : ''
  const range = !!vehicle && stats.mode === 'battery'
  const ev = vehicle?.fuelType === 'Electric'
  const mil = (n: number) => f.num(n, range ? 0 : 1)
  return (
    <>
      <PageHeader title="Fuel & Mileage" subtitle="Refills, real-world mileage and what every kilometre costs you." actions={add} />
      <FilterBar filters={filters} setFilters={setFilters} />
      <div className="space-y-5">
        <Readouts>
          <Readout label={ev ? 'Charging this month' : 'Fuel this month'} color="orange" icon={<Fuel />} value={f.money(thisMonth)} foot={`${f.money(stats.totalCost)} in the selected range`} />
          <Readout label={`Fuel cost per ${f.u.distance}`} color="blue" icon={<Coins />} value={vehicle && stats.costPerDistance ? f.moneyExact(stats.costPerDistance) : '—'} foot={vehicle ? (stats.costPerDistance ? `Over ${f.dist(sum(stats.segments.map((s) => s.distance)))} driven` : 'Needs two refills') : 'Choose a vehicle above'} />
          <Readout label={range ? 'Range per full charge' : 'Average mileage'} color="green" icon={<Gauge />} value={vehicle && stats.averageMileage ? mil(stats.averageMileage) : '—'} foot={vehicle ? (stats.averageMileage ? `${eff}, ${mileageBasis(stats)}` : 'Needs two refills') : 'Choose a vehicle above'} />
          <Readout label={range ? 'Latest range' : 'Latest mileage'} color="purple" icon={<Activity />} value={vehicle && stats.latestMileage ? mil(stats.latestMileage) : '—'} foot={vehicle ? (stats.latestMileage ? (stats.estimated ? `${eff}, varies with tank level` : eff) : 'Needs two refills') : 'Choose a vehicle above'} />
        </Readouts>

        {!vehicle && perVehicle.length > 1 && (
          <Panel title="Mileage by vehicle">
            <ul className="divide-y divide-line text-sm">
              {perVehicle.map(({ v, s }) => (
                <li key={v.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <button className="min-w-0 truncate text-left font-semibold hover:underline" onClick={() => setFilters({ ...filters, vehicleId: v.id })}>
                      {v.nickname}
                    </button>
                    <span className="shrink-0 font-semibold tabular">{f.money(s.totalCost)}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {s.averageMileage ? f.mileage(s.averageMileage, v.fuelType, s.mode) : 'Mileage needs two refills'}
                    {s.costPerDistance ? `, ${f.moneyExact(s.costPerDistance)} per ${f.u.distance}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={ev ? 'Monthly charging spend' : 'Monthly fuel spending'}>
            <SimpleBars data={monthly} x="label" y="spend" name={ev ? 'Charging spend' : 'Fuel spend'} fmt={f.money} tickFmt={f.moneyCompact} />
          </Panel>
          {/* Charts that only make sense for one vehicle are left out until one is chosen. */}
          {unit && (
            <Panel title={`${ev ? 'Energy' : 'Fuel'} used per month (${unit})`}>
              <SimpleBars data={monthly} x="label" y="quantity" name={`Quantity (${unit})`} color="var(--series-1)" fmt={(n) => `${f.num(n, 1)} ${unit}`} tickFmt={(n) => f.num(n)} />
            </Panel>
          )}
          {vehicle && (
            <>
              <Panel title={`${range ? 'Range' : 'Mileage'} trend (${eff})`}>
                {segs.length >= 2 ? <TrendLine data={segs} x="label" y="mileage" name={range ? 'Range' : 'Mileage'} color="var(--series-3)" fmt={(n) => `${f.num(n, 1)} ${eff}`} tickFmt={(n) => f.num(n, 1)} /> : <p className="py-16 text-center text-sm text-muted">Log a few more {ev ? 'charges' : 'refills'} to see how this changes.</p>}
              </Panel>
              <Panel title={`Cost per ${f.u.distance}`}>
                {segs.length >= 2 ? <TrendLine data={segs} x="label" y="cpk" name={`Cost per ${f.u.distance}`} color="var(--series-1)" fmt={f.moneyExact} /> : <p className="py-16 text-center text-sm text-muted">Log a few more {ev ? 'charges' : 'refills'} to see cost per distance.</p>}
              </Panel>
            </>
          )}
          {priceTrend.length >= 2 && units.size === 1 && (
            <Panel title={`Price per ${unit} trend`} className="lg:col-span-2">
              <TrendLine data={priceTrend} x="label" y="price" name={`Price per ${unit}`} color="var(--series-4)" fmt={f.moneyExact} />
            </Panel>
          )}
        </div>

        <Panel title={ev ? 'Charging history' : 'Refill history'}>{entries.length ? <FuelLog entries={entries} showVehicle={!vehicle} /> : <p className="py-10 text-center text-sm text-muted">No refills match these filters.</p>}</Panel>
      </div>
    </>
  )
}
