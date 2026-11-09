import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import type {
  AppData,
  ChartRange,
  CostLine,
  DateStr,
  ExpenseCategory,
  FuelEntry,
  Reminder,
  Vehicle,
} from '../types'

export const todayStr = (d = new Date()): DateStr => format(d, 'yyyy-MM-dd')
export const monthKey = (d: DateStr) => d.slice(0, 7)
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
export const round2 = (n: number) => Math.round(n * 100) / 100

/** Every spend in one list. Fuel and maintenance records are the only source for those categories. */
export function costLines(d: Pick<AppData, 'fuel' | 'maintenance' | 'expenses'>): CostLine[] {
  return [
    // Home charges with no known cost aren't spending.
    ...d.fuel.filter((f) => f.totalCost > 0).map<CostLine>((f) => ({
      id: f.id,
      source: 'fuel',
      vehicleId: f.vehicleId,
      date: f.date,
      category: 'Fuel',
      amount: f.totalCost,
      description: f.fuelStation ? `${f.fuelType === 'Electric' ? 'Charging' : 'Fuel'} at ${f.fuelStation}` : f.fuelType === 'Electric' ? 'Charging' : 'Fuel refill',
      notes: f.notes,
    })),
    ...d.maintenance.map<CostLine>((m) => ({
      id: m.id,
      source: 'maintenance',
      vehicleId: m.vehicleId,
      date: m.date,
      category: 'Maintenance',
      amount: m.amount,
      description: m.description ? `${m.category} – ${m.description}` : m.category,
      notes: m.notes,
    })),
    ...d.expenses.map<CostLine>((e) => ({
        id: e.id,
        source: 'expense',
        vehicleId: e.vehicleId,
        date: e.date,
        category: e.category,
        amount: e.amount,
        description: e.description,
        notes: e.notes,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date))
}

export const totalOf = (lines: CostLine[]) => sum(lines.map((l) => l.amount))

export function monthTotal(lines: CostLine[], monthsAgo: number, now = new Date(), category?: ExpenseCategory) {
  const key = format(subMonths(now, monthsAgo), 'yyyy-MM')
  return totalOf(lines.filter((l) => monthKey(l.date) === key && (!category || l.category === category)))
}

export function inRange(date: DateStr, from?: DateStr, to?: DateStr) {
  return (!from || date >= from) && (!to || date <= to)
}

// ---------- Reminders ----------

export type ReminderState = 'upcoming' | 'soon' | 'today' | 'overdue' | 'completed'
export const DISTANCE_SOON = 500
const RANK: Record<ReminderState, number> = { completed: -1, upcoming: 0, soon: 1, today: 2, overdue: 3 }

export interface ReminderEval {
  state: ReminderState
  daysLeft?: number
  distanceLeft?: number
}

export function evaluateReminder(r: Reminder, vehicle: Vehicle | undefined, today: DateStr = todayStr()): ReminderEval {
  if (r.status === 'completed') return { state: 'completed' }
  let state: ReminderState = 'upcoming'
  const bump = (s: ReminderState) => {
    if (RANK[s] > RANK[state]) state = s
  }
  let daysLeft: number | undefined
  let distanceLeft: number | undefined
  if (r.dueDate) {
    daysLeft = differenceInCalendarDays(parseISO(r.dueDate), parseISO(today))
    bump(daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft <= r.leadTime ? 'soon' : 'upcoming')
  }
  if (r.dueOdometer != null && vehicle) {
    distanceLeft = r.dueOdometer - vehicle.currentOdometer
    bump(distanceLeft < 0 ? 'overdue' : distanceLeft === 0 ? 'today' : distanceLeft <= DISTANCE_SOON ? 'soon' : 'upcoming')
  }
  return { state, daysLeft, distanceLeft }
}

/** Sort key: most urgent first. Undated mileage reminders sort by distance as a rough day estimate. */
export function urgency(e: ReminderEval) {
  return -RANK[e.state] * 1e6 + (e.daysLeft ?? (e.distanceLeft != null ? e.distanceLeft / 40 : 1e5))
}

export function isSnoozed(r: Reminder, today: DateStr = todayStr()) {
  return !!r.snoozedUntil && r.snoozedUntil > today
}

export const snoozeUntil = (days: number, today: DateStr = todayStr()) => todayStr(addDays(parseISO(today), days))

/** The alert stage to send now, or null if this reminder needs no new alert. */
export function alertStage(r: Reminder, e: ReminderEval, today: DateStr = todayStr()): string | null {
  if (r.status !== 'active' || isSnoozed(r, today)) return null
  if (e.state === 'upcoming' || e.state === 'completed') return null
  const target = `${r.dueDate ?? ''}|${r.dueOdometer ?? ''}`
  const key = `${e.state}:${target}`
  return r.notifiedKeys.includes(key) ? null : key
}

// ---------- Fuel & mileage ----------

export interface MileageSegment {
  date: DateStr
  odometer: number
  distance: number
  quantity: number
  cost: number
  mileage: number
}

/**
 * Full-tank to full-tank method. Fuel from partial fills in between is added to the segment,
 * and the first full tank only marks the start. Segments without a positive distance are skipped.
 */
export function mileageSegments(entries: FuelEntry[]): MileageSegment[] {
  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date))
  const out: MileageSegment[] = []
  let start: FuelEntry | null = null
  let qty = 0
  let cost = 0
  for (const e of sorted) {
    if (start) {
      qty += e.quantity
      cost += e.totalCost
    }
    if (e.isFullTank) {
      if (start && e.odometer > start.odometer && qty > 0) {
        const distance = e.odometer - start.odometer
        out.push({ date: e.date, odometer: e.odometer, distance, quantity: qty, cost, mileage: distance / qty })
      }
      start = e
      qty = 0
      cost = 0
    }
  }
  return out
}

/**
 * Refill-to-refill method for people who fill by amount, not to full: the fuel bought at one refill
 * is used up by the next, so each gap is (distance to next refill) / (fuel bought at this one).
 * Tank-level differences make single gaps noisy but they cancel out over many refills.
 */
export function intervalSegments(entries: FuelEntry[]): MileageSegment[] {
  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date))
  const out: MileageSegment[] = []
  let qty = 0
  let cost = 0
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const distance = i ? e.odometer - sorted[i - 1].odometer : 0
    if (i && distance > 0 && qty > 0) {
      out.push({ date: e.date, odometer: e.odometer, distance, quantity: qty, cost, mileage: distance / qty })
      qty = 0
      cost = 0
    }
    // Same-odometer refills (distance 0) pile into the next gap.
    qty += e.quantity
    cost += e.totalCost
  }
  return out
}

/**
 * Electric charges logged by battery %. Charge used between two charges is exact:
 * (level after this charge) − (level before the next one). `mileage` here is km per full (100%) charge,
 * and `quantity` is the battery % used.
 */
export function batterySegments(entries: FuelEntry[]): MileageSegment[] {
  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date))
  const out: MileageSegment[] = []
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]
    const b = sorted[i]
    if (a.batteryTo == null || b.batteryFrom == null) continue
    const used = a.batteryTo - b.batteryFrom
    const distance = b.odometer - a.odometer
    if (used > 0 && distance > 0) out.push({ date: b.date, odometer: b.odometer, distance, quantity: used, cost: a.totalCost, mileage: (distance / used) * 100 })
  }
  return out
}

const costPer = (segs: MileageSegment[]) => {
  const paid = segs.filter((s) => s.cost > 0)
  const d = sum(paid.map((s) => s.distance))
  return d > 0 ? sum(paid.map((s) => s.cost)) / d : null
}

/** Expects one vehicle's refills. */
export function fuelStats(entries: FuelEntry[]) {
  const battery = batterySegments(entries)
  if (battery.length) {
    const dist = sum(battery.map((s) => s.distance))
    return {
      segments: battery,
      /** 'battery': averageMileage/latestMileage are km per full charge (range). */
      mode: 'battery' as const,
      estimated: false,
      refills: entries.length,
      averageMileage: (dist / sum(battery.map((s) => s.quantity))) * 100,
      latestMileage: battery[battery.length - 1].mileage,
      // Only charges with a known cost count towards cost per km.
      costPerDistance: costPer(battery),
      totalQuantity: sum(entries.map((e) => e.quantity)),
      totalCost: sum(entries.map((e) => e.totalCost)),
    }
  }
  const full = mileageSegments(entries)
  const odos = entries.map((e) => e.odometer)
  const span = odos.length ? Math.max(...odos) - Math.min(...odos) : 0
  // Full-to-full stretches are exact. Use them only while they cover at least half the logged distance
  // and the user is still filling to full (at most 2 refills since the last full one); otherwise new
  // refills would show nothing until the old full-tank history is outweighed.
  const lastFull = Math.max(-Infinity, ...entries.filter((e) => e.isFullTank).map((e) => e.odometer))
  const sinceFull = entries.filter((e) => e.odometer > lastFull).length
  const exact = full.length > 0 && sum(full.map((s) => s.distance)) * 2 >= span && sinceFull <= 2
  const segs = exact ? full : intervalSegments(entries)
  const dist = sum(segs.map((s) => s.distance))
  const qty = sum(segs.map((s) => s.quantity))
  return {
    segments: segs,
    mode: (exact ? 'full' : 'interval') as 'full' | 'interval' | 'battery',
    /** True when mileage comes from refill-to-refill gaps rather than full tanks. */
    estimated: !exact,
    refills: entries.length,
    averageMileage: qty > 0 ? dist / qty : null,
    latestMileage: segs.length ? segs[segs.length - 1].mileage : null,
    costPerDistance: dist > 0 ? sum(segs.map((s) => s.cost)) / dist : null,
    totalQuantity: sum(entries.map((e) => e.quantity)),
    totalCost: sum(entries.map((e) => e.totalCost)),
  }
}

/** Distance covered across all records for a vehicle, or null when there's no span yet. */
export function trackedDistance(v: Vehicle, d: Pick<AppData, 'fuel' | 'maintenance'>) {
  const odos = [
    ...d.fuel.filter((f) => f.vehicleId === v.id).map((f) => f.odometer),
    ...d.maintenance.filter((m) => m.vehicleId === v.id).map((m) => m.odometer),
    v.currentOdometer,
  ]
  const span = Math.max(...odos) - Math.min(...odos)
  return span > 0 ? span : null
}

// ---------- Charts ----------

export const CHART_CATEGORIES = ['Fuel', 'Maintenance', 'Repairs', 'Insurance', 'Registration', 'Accessories', 'Other'] as const
export type ChartCategory = (typeof CHART_CATEGORIES)[number]
export const chartCategory = (c: ExpenseCategory): ChartCategory =>
  (CHART_CATEGORIES as readonly string[]).includes(c) ? (c as ChartCategory) : 'Other'

export type SeriesRow = { key: string; label: string; total: number } & Record<ChartCategory, number>

export function expenseSeries(lines: CostLine[], range: ChartRange, now = new Date()): SeriesRow[] {
  const daily = range === '7d' || range === '30d'
  const n = range === '7d' ? 7 : range === '30d' ? 30 : range === '6m' ? 6 : 12
  const rows: SeriesRow[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = daily ? subDays(now, i) : startOfMonth(subMonths(now, i))
    const row = {
      key: daily ? format(d, 'yyyy-MM-dd') : format(d, 'yyyy-MM'),
      label: daily ? format(d, range === '7d' ? 'EEE' : 'd MMM') : format(d, 'MMM yy'),
      total: 0,
    } as SeriesRow
    for (const c of CHART_CATEGORIES) row[c] = 0
    rows.push(row)
  }
  const idx = new Map(rows.map((r, i) => [r.key, i]))
  for (const l of lines) {
    const i = idx.get(daily ? l.date : monthKey(l.date))
    if (i === undefined) continue
    rows[i][chartCategory(l.category)] += l.amount
    rows[i].total += l.amount
  }
  return rows
}

export function byCategory(lines: CostLine[]) {
  const m = new Map<ExpenseCategory, number>()
  for (const l of lines) m.set(l.category, (m.get(l.category) ?? 0) + l.amount)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function monthsSpanned(lines: CostLine[], now = new Date()) {
  if (!lines.length) return 0
  const first = lines.reduce((a, l) => (l.date < a ? l.date : a), lines[0].date)
  return differenceInCalendarMonths(now, parseISO(first)) + 1
}

// ---------- Insights (only from recorded data) ----------

export function insights(lines: CostLine[], vehicles: Vehicle[], fmt: (n: number) => string, now = new Date()) {
  const out: string[] = []
  const year = format(now, 'yyyy')
  const nameOf = (id: string) => vehicles.find((v) => v.id === id)?.nickname ?? 'A removed vehicle'

  const yearLines = lines.filter((l) => l.date.startsWith(year))
  const perVehicle = new Map<string, number>()
  for (const l of yearLines.filter((x) => x.category !== 'Fuel'))
    perVehicle.set(l.vehicleId, (perVehicle.get(l.vehicleId) ?? 0) + l.amount)
  if (perVehicle.size >= 2) {
    const [top] = [...perVehicle.entries()].sort((a, b) => b[1] - a[1])
    out.push(`${nameOf(top[0])} is your most expensive vehicle to maintain this year, at ${fmt(top[1])} excluding fuel.`)
  }

  const total = totalOf(lines)
  const fuel = totalOf(lines.filter((l) => l.category === 'Fuel'))
  if (total > 0 && fuel > 0) out.push(`Fuel accounts for ${Math.round((fuel / total) * 100)}% of your total vehicle expenses.`)

  const mThis = monthTotal(lines, 0, now, 'Maintenance')
  const mLast = monthTotal(lines, 1, now, 'Maintenance')
  if (mThis > 0 && mLast > 0 && mThis !== mLast)
    out.push(`You spent ${fmt(Math.abs(mThis - mLast))} ${mThis > mLast ? 'more' : 'less'} on maintenance this month than last month.`)

  const fThis = monthTotal(lines, 0, now, 'Fuel')
  const fLast = monthTotal(lines, 1, now, 'Fuel')
  if (fThis > 0 && fLast > 0) {
    const pct = Math.round(((fThis - fLast) / fLast) * 100)
    if (pct >= 10) out.push(`Looks like you've been spending a little more on fuel this month (+${pct}%).`)
    else if (pct <= -10) out.push(`Fuel spending is down ${-pct}% compared with last month. Nice!`)
  }

  const months = monthsSpanned(lines, now)
  if (months >= 2) out.push(`Your average monthly garage expense is ${fmt(total / months)}.`)
  return out
}
