import { useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Trash2, Wrench, Fuel, Wallet, BellRing, Gauge, CalendarDays } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { Panel, Readout, Readouts } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Plate } from '../../components/ui/Badge'
import { Segmented } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { VehicleThumb } from '../../components/VehicleThumb'
import { ExpenseBars } from '../../components/charts/ExpenseBars'
import { QuickAdd } from '../../components/layout/QuickAdd'
import { MaintenanceLog } from '../records/MaintenanceLog'
import { FuelLog } from '../records/FuelLog'
import { CostList } from '../records/CostList'
import { ReminderList } from '../records/ReminderList'
import { useVehicleSummaries } from './summary'
import { NextDue } from './NextDue'
import { useDeleteVehicle } from '../forms/useDeleteVehicle'
import { fuelStats, trackedDistance } from '../../lib/calc'
import { navigate } from '../../lib/router'
import type { ChartRange } from '../../types'

type Tab = 'overview' | 'maintenance' | 'fuel' | 'expenses' | 'reminders'

export function VehicleDetail({ id }: { id: string }) {
  const { data, lines, reminders } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const remove = useDeleteVehicle()
  const summaries = useVehicleSummaries()
  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState<ChartRange>('12m')
  const v = data.vehicles.find((x) => x.id === id)

  const own = useMemo(
    () => ({
      maintenance: data.maintenance.filter((m) => m.vehicleId === id).sort((a, b) => b.date.localeCompare(a.date)),
      fuel: data.fuel.filter((x) => x.vehicleId === id),
      lines: lines.filter((l) => l.vehicleId === id),
      reminders: reminders.filter((r) => r.reminder.vehicleId === id),
    }),
    [data.maintenance, data.fuel, lines, reminders, id],
  )
  const stats = useMemo(() => fuelStats(own.fuel), [own.fuel])

  if (!v)
    return (
      <EmptyState icon={Gauge} title="Vehicle not found" message="It may have been deleted. Head back to your garage to pick another." action={<Button variant="dark" onClick={() => navigate('garage')}>Back to My Garage</Button>} />
    )

  const s = summaries.get(v.id)!
  const dist = trackedDistance(v, data)
  const empty = (icon: typeof Wrench, title: string, message: string, kind: 'maintenance' | 'fuel' | 'expense' | 'reminder', label: string) => (
    <EmptyState icon={icon} title={title} message={message} action={<Button onClick={() => openForm({ kind, vehicleId: v.id })}>{label}</Button>} />
  )

  return (
    <>
      <a href="#/garage" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> My Garage
      </a>
      <div className="mb-6 grid gap-5 md:grid-cols-[280px_1fr] md:items-end">
        <VehicleThumb vehicle={v} className={`w-full rounded-[22px] border border-line ${v.image ? 'aspect-[16/10]' : 'aspect-[3/1] lg:aspect-[16/10]'}`} iconClass="size-16" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {v.registrationNumber && <Plate className="text-[12px]">{v.registrationNumber}</Plate>}
            <span>{v.type}</span>
            <span>{v.fuelType}</span>
            {v.purchaseDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" /> Since {f.date(v.purchaseDate)}
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-[34px] leading-none font-semibold tracking-[-0.02em] sm:text-[44px]">{v.nickname}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {v.type}, {v.fuelType}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <QuickAdd vehicleId={v.id} />
            <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => openForm({ kind: 'vehicle', id: v.id })}>
              Edit
            </Button>
            <Button variant="ghost" className="text-danger hover:text-danger" icon={<Trash2 className="size-4" />} onClick={async () => (await remove(v.id)) && navigate('garage')}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <Segmented
          label="Vehicle sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'maintenance', label: `Maintenance (${own.maintenance.length})` },
            { value: 'fuel', label: `Fuel (${own.fuel.length})` },
            { value: 'expenses', label: `Expenses (${own.lines.length})` },
            { value: 'reminders', label: `Reminders (${own.reminders.filter((r) => r.reminder.status === 'active').length})` },
          ]}
        />
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <Readouts>
            <Readout label="Odometer" color="green" icon={<Gauge />} value={<span className="tabular">{f.num(v.currentOdometer)}</span>} foot={f.u.distance} />
            <Readout label="Total spent" color="blue" icon={<Wallet />} value={f.money(s.total)} foot={dist ? `${f.moneyExact(s.total / dist)} per ${f.u.distance} over ${f.dist(dist)} tracked` : 'Since you started tracking'} />
            <Readout label="Fuel" color="orange" icon={<Fuel />} value={f.money(s.fuel)} foot={stats.averageMileage ? `Averaging ${f.mileage(stats.averageMileage, v.fuelType, stats.mode)}${stats.estimated ? ' (estimate)' : ''}` : 'Two refills needed for mileage'} />
            <Readout label="Maintenance" color="purple" icon={<Wrench />} value={f.money(s.maintenance)} foot={`${own.maintenance.length} ${own.maintenance.length === 1 ? 'service' : 'services'} logged`} />
          </Readouts>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <Panel title="Spending" action={<Segmented label="Range" value={range} onChange={setRange} options={[{ value: '30d', label: '30 days' }, { value: '6m', label: '6 months' }, { value: '12m', label: '12 months' }]} />}>
              {own.lines.length ? <ExpenseBars lines={own.lines} range={range} height={220} /> : <p className="py-10 text-center text-sm text-muted">Costs you log for {v.nickname} will chart here.</p>}
            </Panel>
            <Panel title="Service status">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">Next maintenance</dt>
                  <dd className="mt-1">
                    <NextDue r={s.next} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Last service</dt>
                  <dd className="mt-1 font-medium">{s.lastService ? `${s.lastService.category}, ${f.date(s.lastService.date)}` : <span className="font-normal text-faint">None logged yet</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{stats.mode === 'battery' ? 'Latest range' : 'Latest mileage'}</dt>
                  <dd className="mt-1 font-medium">{stats.latestMileage ? f.mileage(stats.latestMileage, v.fuelType, stats.mode) : <span className="font-normal text-faint">Needs two refills</span>}</dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" className="mt-5 w-full" icon={<Wrench className="size-3.5" />} onClick={() => openForm({ kind: 'maintenance', vehicleId: v.id })}>
                Log maintenance
              </Button>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <Panel title="Maintenance history" action={own.maintenance.length > 0 && <Button size="sm" onClick={() => openForm({ kind: 'maintenance', vehicleId: v.id })}>Log maintenance</Button>}>
          {own.maintenance.length ? <MaintenanceLog records={own.maintenance} showVehicle={false} /> : empty(Wrench, 'No services logged yet', `Record ${v.nickname}'s next oil change or service and we'll work out when the next one is due.`, 'maintenance', 'Log maintenance')}
        </Panel>
      )}
      {tab === 'fuel' && (
        <Panel title="Fuel history" action={own.fuel.length > 0 && <Button size="sm" onClick={() => openForm({ kind: 'fuel', vehicleId: v.id })}>Log a refill</Button>}>
          {own.fuel.length ? <FuelLog entries={own.fuel} showVehicle={false} /> : empty(Fuel, 'No refills yet', 'Log what you paid and the odometer reading. After two refills you will see mileage.', 'fuel', 'Log a refill')}
        </Panel>
      )}
      {tab === 'expenses' && (
        <Panel title="All costs" action={own.lines.length > 0 && <Button size="sm" onClick={() => openForm({ kind: 'expense', vehicleId: v.id })}>Add an expense</Button>}>
          {own.lines.length ? <CostList lines={own.lines} showVehicle={false} /> : empty(Wallet, 'Nothing spent yet', 'Insurance, parking, tolls and repairs go here. Fuel and maintenance appear automatically.', 'expense', 'Add an expense')}
        </Panel>
      )}
      {tab === 'reminders' && (
        <Panel title="Reminders" action={own.reminders.length > 0 && <Button size="sm" onClick={() => openForm({ kind: 'reminder', vehicleId: v.id })}>New reminder</Button>}>
          {own.reminders.length ? <ReminderList items={own.reminders} showVehicle={false} /> : empty(BellRing, 'No reminders yet', 'Insurance, registration, pollution certificate, or anything else with a due date.', 'reminder', 'New reminder')}
        </Panel>
      )}
    </>
  )
}
