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
import { TrendLine, SimpleBars } from '../../components/charts/Lines'
import { FuelLog } from '../records/FuelLog'
import { fuelStats, monthKey, sum, todayStr } from '../../lib/calc'

export function FuelPage() {
  const { data } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const { filters, setFilters, match } = useFilters({ vehicleId: data.vehicles.length === 1 ? data.vehicles[0].id : '' })
  const entries = useMemo(() => data.fuel.filter((e) => match(e, e.fuelStation, e.notes, e.fuelType)), [data.fuel, match])
  const vehicle = data.vehicles.find((v) => v.id === filters.vehicleId)
  const stats = useMemo(() => fuelStats(entries), [entries])
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
        .map((v) => ({ v, s: fuelStats(data.fuel.filter((e) => e.vehicleId === v.id && match(e))) }))
        .filter((x) => x.s.totalCost > 0),
    [data.vehicles, data.fuel, match],
  )

  const add = <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'fuel', vehicleId: filters.vehicleId || undefined })}>Log a refill</Button>
  if (!data.fuel.length)
    return (
      <>
        <PageHeader title="Fuel & Mileage" subtitle="Refills, real-world mileage and what every kilometre costs you." />
        <Panel>
          <EmptyState icon={Fuel} title="No refills logged yet" message="Log each refill with its odometer reading. After two full fills you'll see real mileage, not guesses." action={add} />
        </Panel>
      </>
    )

  const eff = vehicle ? f.u.efficiency(vehicle.fuelType) : ''
  return (
    <>
      <PageHeader title="Fuel & Mileage" subtitle="Refills, real-world mileage and what every kilometre costs you." actions={add} />
      <FilterBar filters={filters} setFilters={setFilters} />
      <div className="space-y-5">
        <Readouts>
          <Readout label="Fuel this month" color="orange" icon={<Fuel />} value={f.money(thisMonth)} foot={`${f.money(stats.totalCost)} in the selected range`} />
          <Readout label="Average mileage" color="green" icon={<Gauge />} value={vehicle ? (stats.averageMileage ? `${f.num(stats.averageMileage, 1)}` : '—') : '—'} foot={vehicle ? (stats.averageMileage ? eff : 'Needs two full fills') : 'Choose a vehicle above'} />
          <Readout label="Latest mileage" color="purple" icon={<Activity />} value={vehicle && stats.latestMileage ? f.num(stats.latestMileage, 1) : '—'} foot={vehicle ? (stats.latestMileage ? eff : 'Needs two full fills') : 'Choose a vehicle above'} />
          <Readout label="Fuel cost per km" color="blue" icon={<Coins />} value={vehicle && stats.costPerDistance ? f.moneyExact(stats.costPerDistance) : '—'} foot={unit ? `${f.num(stats.totalQuantity, 1)} ${unit} filled` : `${entries.length} refills`} />
        </Readouts>

        {!vehicle && perVehicle.length > 1 && (
          <Panel title="Mileage by vehicle">
            <ul className="divide-y divide-line text-sm">
              {perVehicle.map(({ v, s }) => (
                <li key={v.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2.5">
                  <button className="min-w-32 flex-1 text-left font-semibold hover:underline" onClick={() => setFilters({ ...filters, vehicleId: v.id })}>
                    {v.nickname}
                  </button>
                  <span className="text-muted">Avg <span className="font-semibold text-fg tabular">{s.averageMileage ? `${f.num(s.averageMileage, 1)} ${f.u.efficiency(v.fuelType)}` : '—'}</span></span>
                  <span className="text-muted">Per {f.u.distance} <span className="font-semibold text-fg tabular">{s.costPerDistance ? f.moneyExact(s.costPerDistance) : '—'}</span></span>
                  <span className="w-24 text-right font-semibold tabular">{f.money(s.totalCost)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Monthly fuel spending">
            <SimpleBars data={monthly} x="label" y="spend" name="Fuel spend" fmt={f.money} tickFmt={f.moneyCompact} />
          </Panel>
          <Panel title={unit ? `Fuel used per month (${unit})` : 'Fuel used per month'}>
            {unit ? <SimpleBars data={monthly} x="label" y="quantity" name={`Quantity (${unit})`} color="var(--series-1)" fmt={(n) => `${f.num(n, 1)} ${unit}`} tickFmt={(n) => f.num(n)} /> : <p className="py-16 text-center text-sm text-muted">Litres and kWh can't share a chart. Choose a vehicle to see its consumption.</p>}
          </Panel>
          <Panel title={`Mileage trend${eff ? ` (${eff})` : ''}`}>
            {vehicle && segs.length >= 2 ? <TrendLine data={segs} x="label" y="mileage" name="Mileage" color="var(--series-3)" fmt={(n) => `${f.num(n, 1)} ${eff}`} tickFmt={(n) => f.num(n, 1)} /> : <p className="py-16 text-center text-sm text-muted">{vehicle ? 'Log a few more full fills to see how mileage changes.' : 'Choose a vehicle to see its mileage trend.'}</p>}
          </Panel>
          <Panel title={`Cost per ${f.u.distance}`}>
            {vehicle && segs.length >= 2 ? <TrendLine data={segs} x="label" y="cpk" name={`Cost per ${f.u.distance}`} color="var(--series-1)" fmt={f.moneyExact} /> : <p className="py-16 text-center text-sm text-muted">{vehicle ? 'Log a few more full fills to see cost per distance.' : 'Choose a vehicle to see what each kilometre costs.'}</p>}
          </Panel>
          <Panel title="Fuel price trend" className="lg:col-span-2">
            {priceTrend.length >= 2 && units.size === 1 ? <TrendLine data={priceTrend} x="label" y="price" name={`Price per ${unit}`} color="var(--series-4)" fmt={f.moneyExact} /> : <p className="py-16 text-center text-sm text-muted">{units.size > 1 ? 'Prices per litre and per kWh differ too much to chart together. Choose a vehicle.' : 'Log a couple of refills to see the price trend.'}</p>}
          </Panel>
        </div>

        <Panel title="Refill history">{entries.length ? <FuelLog entries={entries} showVehicle={!vehicle} /> : <p className="py-10 text-center text-sm text-muted">No refills match these filters.</p>}</Panel>
      </div>
    </>
  )
}
