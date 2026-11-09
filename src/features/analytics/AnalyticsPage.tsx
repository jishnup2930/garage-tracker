import { useMemo } from 'react'
import { ChartColumn, Download, Wallet, CalendarDays, Car, Wrench } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useFormat } from '../../hooks/useFormat'
import { PageHeader, Panel, Readout, Readouts } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { CAT_COLOR, vehicleColor } from '../../components/charts/theme'
import { useExpenseAggregates } from '../expenses/useExpenseData'
import { fuelStats, sum, totalOf, trackedDistance, todayStr, type ChartCategory } from '../../lib/calc'
import { toCsv } from '../../lib/csv'
import { downloadFile } from '../../lib/storage'
import { useToast } from '../../components/ui/Toast'
import { Donut, ExpenseBars, SimpleBars, TrendLine } from '../../components/charts'

export function AnalyticsPage() {
  const { data, lines, vehicleById } = useGarage()
  const f = useFormat()
  const toast = useToast()
  const agg = useExpenseAggregates(lines, data.vehicles)
  const year = todayStr().slice(0, 4)

  const rows = useMemo(
    () =>
      data.vehicles.map((v, i) => {
        const own = lines.filter((l) => l.vehicleId === v.id)
        const total = totalOf(own)
        const dist = trackedDistance(v, data)
        const fs = fuelStats(data.fuel.filter((e) => e.vehicleId === v.id))
        return {
          v,
          color: vehicleColor(i),
          total,
          fuel: totalOf(own.filter((l) => l.category === 'Fuel')),
          maint: totalOf(own.filter((l) => l.category === 'Maintenance')),
          dist,
          cpk: dist ? total / dist : null,
          fs,
        }
      }),
    [data, lines],
  )
  const maintByCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of data.maintenance) m.set(r.category, (m.get(r.category) ?? 0) + r.amount)
    return [...m.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [data.maintenance])
  const topVehicle = [...rows].sort((a, b) => b.total - a.total)[0]
  const topJob = [...data.maintenance].sort((a, b) => b.amount - a.amount)[0]

  const exportCsv = (kind: 'expenses' | 'maintenance') => {
    const name = (id: string) => vehicleById.get(id)?.nickname ?? ''
    const csv =
      kind === 'expenses'
        ? toCsv(['Date', 'Vehicle', 'Category', 'Source', 'Description', 'Amount', 'Currency', 'Notes'], lines.map((l) => [l.date, name(l.vehicleId), l.category, l.source, l.description, l.amount, data.settings.currency, l.notes]))
        : toCsv(
            ['Date', 'Vehicle', 'Category', 'Description', 'Odometer', 'Amount', 'Currency', 'Service provider', 'Next due date', 'Next due odometer', 'Notes'],
            [...data.maintenance].sort((a, b) => b.date.localeCompare(a.date)).map((m) => [m.date, name(m.vehicleId), m.category, m.description, m.odometer, m.amount, data.settings.currency, m.serviceProvider, m.nextDueDate, m.nextDueOdometer, m.notes]),
          )
    downloadFile(`garage-${kind}-${todayStr()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8')
    toast.success(`Exported ${kind} as CSV`)
  }

  const actions = (
    <>
      <Button variant="outline" icon={<Download className="size-4" />} disabled={!lines.length} onClick={() => exportCsv('expenses')}>
        Expenses CSV
      </Button>
      <Button variant="outline" icon={<Download className="size-4" />} disabled={!data.maintenance.length} onClick={() => exportCsv('maintenance')}>
        Maintenance CSV
      </Button>
    </>
  )

  if (!lines.length)
    return (
      <>
        <PageHeader title="Analytics" subtitle="The true cost of owning each of your vehicles." />
        <Panel>
          <EmptyState icon={ChartColumn} title="Nothing to analyse yet" message="Analytics are worked out only from what you log. Add a few refills, services or expenses and this page fills in." />
        </Panel>
      </>
    )

  const withMileage = rows.filter((r) => r.fs.segments.length >= 2)
  return (
    <>
      <PageHeader title="Analytics" subtitle="The true cost of owning each of your vehicles, from everything you've logged." actions={actions} />
      <div className="space-y-5">
        <Readouts>
          <Readout label="Total ownership cost" color="blue" icon={<Wallet />} value={f.money(totalOf(lines))} foot="Since you started tracking" />
          <Readout label={`Spent in ${year}`} color="green" icon={<CalendarDays />} value={f.money(totalOf(lines.filter((l) => l.date.startsWith(year))))} foot="This calendar year" />
          <Readout label="Highest spending" color="orange" icon={<Car />} value={<span className="line-clamp-2 block text-xl leading-tight sm:text-2xl">{topVehicle?.total ? topVehicle.v.nickname : '—'}</span>} foot={topVehicle?.total ? f.money(topVehicle.total) : undefined} />
          <Readout label="Priciest maintenance" color="purple" icon={<Wrench />} value={<span className="block truncate">{topJob ? f.money(topJob.amount) : '—'}</span>} foot={topJob ? `${topJob.category}, ${vehicleById.get(topJob.vehicleId)?.nickname}` : 'None logged'} />
        </Readouts>

        <Panel title="Cost per vehicle" bodyClass="pt-2">
          {/* Phones: one block per vehicle instead of an 8-column table. */}
          <ul className="divide-y divide-line sm:hidden">
            {rows.map((r) => (
              <li key={r.v.id} className="py-3">
                <a href={`#/garage/${r.v.id}`} className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} />
                    <span className="truncate">{r.v.nickname}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular">{f.money(r.total)}</span>
                </a>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-muted">Fuel</dt><dd className="tabular">{f.money(r.fuel)}</dd></div>
                  <div><dt className="text-muted">Maintenance</dt><dd className="tabular">{f.money(r.maint)}</dd></div>
                  <div><dt className="text-muted">Other</dt><dd className="tabular">{f.money(r.total - r.fuel - r.maint)}</dd></div>
                  <div><dt className="text-muted">Per {f.u.distance}</dt><dd className="tabular">{r.cpk ? f.moneyExact(r.cpk) : '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-muted">{r.fs.mode === 'battery' ? 'Range' : 'Avg mileage'}</dt><dd className="tabular">{r.fs.averageMileage ? f.mileage(r.fs.averageMileage, r.v.fuelType, r.fs.mode) : '—'}</dd></div>
                </dl>
              </li>
            ))}
            <li className="flex justify-between pt-3 text-sm font-semibold">
              <span>All vehicles</span>
              <span className="tabular">{f.money(sum(rows.map((r) => r.total)))}</span>
            </li>
          </ul>
          <div className="-mx-5 hidden overflow-x-auto sm:-mx-6 sm:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pl-5 font-medium sm:pl-6">Vehicle</th>
                  <th className="py-2 text-right font-medium">Fuel</th>
                  <th className="py-2 text-right font-medium">Maintenance</th>
                  <th className="py-2 text-right font-medium">Other</th>
                  <th className="py-2 text-right font-medium">Total</th>
                  <th className="py-2 text-right font-medium">Distance tracked</th>
                  <th className="py-2 text-right font-medium">Per {f.u.distance}</th>
                  <th className="py-2 pr-5 text-right font-medium sm:pr-6">Avg mileage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.v.id} className="border-b border-line/70 last:border-0">
                    <td className="py-3 pl-5 sm:pl-6">
                      <a href={`#/garage/${r.v.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                        <span className="size-2.5 rounded-[3px]" style={{ background: r.color }} />
                        {r.v.nickname}
                      </a>
                    </td>
                    <td className="py-3 text-right tabular">{f.money(r.fuel)}</td>
                    <td className="py-3 text-right tabular">{f.money(r.maint)}</td>
                    <td className="py-3 text-right tabular">{f.money(r.total - r.fuel - r.maint)}</td>
                    <td className="py-3 text-right font-semibold tabular">{f.money(r.total)}</td>
                    <td className="py-3 text-right tabular text-muted">{r.dist ? f.dist(r.dist) : '—'}</td>
                    <td className="py-3 text-right tabular">{r.cpk ? f.moneyExact(r.cpk) : '—'}</td>
                    <td className="py-3 pr-5 text-right tabular sm:pr-6">{r.fs.averageMileage ? f.mileage(r.fs.averageMileage, r.v.fuelType, r.fs.mode) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-sm font-semibold">
                  <td className="pt-3 pl-5 sm:pl-6">All vehicles</td>
                  <td className="pt-3 text-right tabular">{f.money(sum(rows.map((r) => r.fuel)))}</td>
                  <td className="pt-3 text-right tabular">{f.money(sum(rows.map((r) => r.maint)))}</td>
                  <td className="pt-3 text-right tabular">{f.money(sum(rows.map((r) => r.total - r.fuel - r.maint)))}</td>
                  <td className="pt-3 text-right tabular">{f.money(sum(rows.map((r) => r.total)))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Monthly spending" className="lg:col-span-2">
            <ExpenseBars lines={lines} range="12m" />
          </Panel>
          <Panel title="Category breakdown">
            <Donut data={agg.byCategory} colorOf={(d) => CAT_COLOR[d.name as ChartCategory]} />
          </Panel>
          <Panel title="Maintenance spending by type">
            {maintByCat.length ? <SimpleBars layout="vertical" data={maintByCat} x="label" y="total" name="Spent" color="var(--series-2)" fmt={f.money} tickFmt={f.moneyCompact} height={Math.max(160, maintByCat.length * 36)} /> : <p className="py-12 text-center text-sm text-muted">No maintenance logged yet.</p>}
          </Panel>
          <Panel title="Yearly spending">
            <SimpleBars data={agg.yearly} x="label" y="total" name="Spent" color="var(--tone-blue)" fmt={f.money} tickFmt={f.moneyCompact} />
          </Panel>
          <Panel title="Spending by vehicle">
            {agg.byVehicle.length ? <Donut data={agg.byVehicle} colorOf={(d) => vehicleColor(data.vehicles.findIndex((v) => v.id === d.id))} /> : <p className="py-12 text-center text-sm text-muted">No spending yet.</p>}
          </Panel>
        </div>

        <Panel title="Fuel efficiency trends">
          {withMileage.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {withMileage.map((r) => (
                <div key={r.v.id}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <span className="size-2.5 rounded-[3px]" style={{ background: r.color }} />
                    {r.v.nickname}
                    <span className="font-normal text-muted">({f.effUnit(r.v.fuelType, r.fs.mode)})</span>
                  </p>
                  <TrendLine data={r.fs.segments.map((s) => ({ label: f.date(s.date), mileage: Math.round(s.mileage * 10) / 10 }))} x="label" y="mileage" name="Mileage" color={r.color} fmt={(n) => `${f.num(n, 1)} ${f.effUnit(r.v.fuelType, r.fs.mode)}`} tickFmt={(n) => f.num(n)} height={180} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">Mileage trends appear once a vehicle has a few more refills logged.</p>
          )}
        </Panel>
      </div>
    </>
  )
}
