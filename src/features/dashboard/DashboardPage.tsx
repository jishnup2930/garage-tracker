import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Car, Fuel, Wallet, Wrench, CalendarCheck, Sparkles, Warehouse, Gauge } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { Delta, Panel, Readout, Readouts } from '../../components/ui/Panel'
import { Odometer } from '../../components/ui/Odometer'
import { Segmented } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { VehicleCard } from '../garage/VehicleCard'
import { useVehicleSummaries } from '../garage/summary'
import { dueSummary } from '../garage/NextDue'
import { greetingWord } from '../../lib/format'
import { insights, monthTotal } from '../../lib/calc'
import type { ChartRange, CostLine } from '../../types'
import { cn } from '../../lib/cn'
import { Suggestions } from './Suggestions'
import { ExpenseBars } from '../../components/charts'

export function DashboardPage() {
  const { data, update, lines, reminders, vehicleById } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const summaries = useVehicleSummaries()
  const name = data.user?.firstName
  const range = data.settings.dashboardRange
  const setRange = (r: ChartRange) => update((d) => ({ ...d, settings: { ...d.settings, dashboardRange: r } }))

  const active = reminders.filter((r) => r.reminder.status === 'active')
  const attention = active.filter((r) => r.eval.state !== 'upcoming')
  const overdue = active.filter((r) => r.eval.state === 'overdue')
  const spendNow = monthTotal(lines, 0)
  const spendPrev = monthTotal(lines, 1)
  const fuelNow = monthTotal(lines, 0, undefined, 'Fuel')
  const fuelPrev = monthTotal(lines, 1, undefined, 'Fuel')
  const insight = useMemo(() => insights(lines, data.vehicles, f.money)[0], [lines, data.vehicles, f.money])

  const status = (() => {
    if (!data.vehicles.length) return "Your garage is waiting for its first vehicle. Let's add one!"
    const top = attention[0]
    const who = top?.vehicle?.nickname ?? 'your vehicle'
    if (overdue.length) return `${overdue.length === 1 ? 'One thing needs' : `${overdue.length} things need`} your attention. ${top.reminder.title} for ${who} is overdue.`
    if (top) return `Just a heads-up! ${who}'s ${top.reminder.title.toLowerCase()} is ${dueSummary(top, f).toLowerCase()}.`
    return 'Everything looks good today. Your vehicles are all caught up!'
  })()

  return (
    <div className="space-y-6">
      <header>
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[30px] leading-tight font-semibold tracking-[-0.025em] sm:text-[40px]">
          {greetingWord()}
          {name ? `, ${name}` : ''}
        </motion.h1>
        <p className="mt-1 max-w-[62ch] text-[15px] text-muted sm:text-base">{status}</p>
      </header>

      <Suggestions />

      <Readouts>
        <Readout label="Vehicles" color="green" icon={<Car />} value={<Odometer value={String(data.vehicles.length)} />} foot={data.vehicles.length ? `${f.dist(data.vehicles.reduce((a, v) => a + v.currentOdometer, 0))} on the clocks` : 'None added yet'} />
        <Readout label="Spent this month" color="blue" icon={<Wallet />} value={<Odometer value={f.money(spendNow)} />} foot={<Delta now={spendNow} prev={spendPrev} fmt={f.money} />} />
        <Readout label="Fuel this month" color="orange" icon={<Fuel />} value={<Odometer value={f.money(fuelNow)} />} foot={<Delta now={fuelNow} prev={fuelPrev} fmt={f.money} />} />
        <Readout
          label="Upcoming maintenance"
          color="purple"
          icon={<Wrench />}
          tone={overdue.length ? 'alert' : undefined}
          value={<Odometer value={String(active.length)} />}
          foot={overdue.length ? `${overdue.length} overdue` : attention.length ? `${attention.length} due soon` : active.length ? 'Nothing due soon' : 'Nothing scheduled'}
        />
      </Readouts>

      {data.vehicles.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-line">
          <EmptyState
            icon={Warehouse}
            title="Your garage is waiting for its first vehicle"
            message="Add one and this page fills up with what's due, what you've spent and how far you've gone."
            action={<Button onClick={() => openForm({ kind: 'vehicle' })}>Add a vehicle</Button>}
          />
        </div>
      ) : (
        <section aria-labelledby="garage-h">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="garage-h" className="font-display text-[17px] font-semibold tracking-tight">
              My Garage
            </h2>
            <a href="#/garage" className="text-sm font-semibold text-muted hover:text-fg">
              See all
            </a>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {data.vehicles.slice(0, 3).map((v) => (
              <div key={v.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
                <VehicleCard vehicle={v} summary={summaries.get(v.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel
          title="Spending"
          action={
            <Segmented
              label="Chart range"
              value={range}
              onChange={setRange}
              options={[
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '6m', label: '6M' },
                { value: '12m', label: '12M' },
              ]}
            />
          }
        >
          {lines.length ? (
            <>
              <ExpenseBars lines={lines} range={range} />
              {insight && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                  <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  {insight}
                </p>
              )}
            </>
          ) : (
            <p className="py-14 text-center text-sm text-muted">Log a refill, a service or an expense and your spending will chart here.</p>
          )}
        </Panel>

        <Panel title="Up next" action={<a href="#/reminders" className="text-sm font-semibold text-muted hover:text-fg">All reminders</a>}>
          {active.length ? (
            <ul className="space-y-1">
              {active.slice(0, 5).map((r) => (
                <li key={r.reminder.id}>
                  <button onClick={() => openForm({ kind: 'reminder', id: r.reminder.id })} className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.reminder.title}</span>
                      <span className="line-clamp-2 block text-xs text-muted">
                        {r.vehicle?.nickname}, {dueSummary(r, f).toLowerCase()}
                      </span>
                    </span>
                    <StatusBadge state={r.eval.state} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center">
              <CalendarCheck className="mx-auto mb-2 size-6 text-faint" />
              <p className="text-sm text-muted">Nothing scheduled. Set reminders for services, insurance or registration.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => openForm({ kind: 'reminder' })}>
                New reminder
              </Button>
            </div>
          )}
        </Panel>
      </div>

      {lines.length > 0 && (
        <Panel title="Recent activity">
          <ol className="relative space-y-1">
            {lines.slice(0, 6).map((l) => (
              <li key={`${l.source}-${l.id}`} className="flex items-center gap-1">
                <span aria-hidden className={cn('icon-chip size-9 rounded-full', l.source === 'fuel' ? 'tone-orange' : l.source === 'maintenance' ? 'tone-purple' : 'tone-blue')}>
                  {l.source === 'fuel' ? <Fuel className="size-4" /> : l.source === 'maintenance' ? <Wrench className="size-4" /> : <Wallet className="size-4" />}
                </span>
                <button onClick={() => openForm({ kind: l.source, id: l.id })} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{activityLabel(l)}</span>
                    <span className="block truncate text-xs text-muted">
                      {vehicleById.get(l.vehicleId)?.nickname}, {f.date(l.date)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular">{f.money(l.amount)}</span>
                </button>
              </li>
            ))}
          </ol>
        </Panel>
      )}
      {data.vehicles.length > 0 && !lines.length && (
        <Panel>
          <div className="flex flex-wrap items-center gap-4">
            <Gauge className="size-8 text-faint" strokeWidth={1.4} />
            <p className="min-w-0 flex-1 text-sm text-muted">Start with your last refill or service. Everything on this page is worked out from what you log.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openForm({ kind: 'fuel' })}>
                Log a refill
              </Button>
              <Button onClick={() => openForm({ kind: 'maintenance' })}>Log maintenance</Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}

function activityLabel(l: CostLine) {
  if (l.source === 'fuel') return l.description.startsWith('Charging') ? 'Charged' : 'Added fuel'
  if (l.source === 'maintenance') return l.description
  return `${l.category}: ${l.description}`
}
