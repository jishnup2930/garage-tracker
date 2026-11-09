import { describe, expect, it } from 'vitest'
import type { FuelEntry, Reminder, Vehicle } from '../types'
import { alertStage, costLines, evaluateReminder, expenseSeries, fuelStats, mileageSegments, totalOf } from './calc'
import { parseAppData } from './storage'
import { emptyData } from './schema'

const f = (odometer: number, quantity: number, isFullTank: boolean, totalCost = quantity * 100): FuelEntry => ({
  id: `f${odometer}`,
  vehicleId: 'v',
  date: '2026-01-01',
  odometer,
  fuelType: 'Petrol',
  quantity,
  pricePerUnit: 100,
  totalCost,
  isFullTank,
  createdAt: '',
})

const vehicle = { id: 'v', currentOdometer: 25000 } as Vehicle
const rem = (p: Partial<Reminder>): Reminder => ({
  id: 'r',
  vehicleId: 'v',
  title: 'Oil',
  category: 'Oil change',
  leadTime: 7,
  status: 'active',
  notifiedKeys: [],
  createdAt: '',
  ...p,
})

describe('mileage', () => {
  it('needs two full tanks', () => {
    expect(mileageSegments([f(1000, 10, true)])).toEqual([])
    expect(mileageSegments([f(1000, 10, false), f(1200, 10, false)])).toEqual([])
  })
  it('uses distance / fuel added since last full tank, including partials', () => {
    const segs = mileageSegments([f(1000, 30, true), f(1150, 5, false), f(1400, 15, true)])
    expect(segs).toHaveLength(1)
    expect(segs[0].distance).toBe(400)
    expect(segs[0].mileage).toBe(20)
  })
  it('ignores entry order and zero-distance segments', () => {
    const segs = mileageSegments([f(1300, 10, true), f(1000, 10, true), f(1300, 10, true)])
    expect(segs.map((s) => s.mileage)).toEqual([30])
  })
})

describe('mileage without full tanks', () => {
  // ₹500, ₹500, ₹400, ₹500 at ₹100/L: the last refill's fuel isn't used yet, so it isn't counted.
  const money = [f(10000, 5, false), f(10220, 5, false), f(10450, 4, false), f(10640, 5, false)]
  it('averages distance over fuel bought before the latest refill', () => {
    const s = fuelStats(money)
    expect(s.estimated).toBe(true)
    expect(s.averageMileage).toBeCloseTo(640 / 14)
    expect(s.costPerDistance).toBeCloseTo(1400 / 640)
    expect(s.segments.map((x) => x.mileage)).toEqual([44, 46, 47.5])
  })
  it('needs two refills at different readings', () => {
    expect(fuelStats([f(10000, 5, false)]).averageMileage).toBeNull()
    expect(fuelStats([f(10000, 5, false), f(10000, 3, false)]).averageMileage).toBeNull()
  })
  it('uses exact full-tank figures when they cover most of the distance', () => {
    const s = fuelStats([f(1000, 30, true), f(1150, 5, false), f(1400, 15, true), f(1450, 3, false)])
    expect(s.estimated).toBe(false)
    expect(s.averageMileage).toBe(20)
  })
  it('gives the same answer whatever order refills are stored in', () => {
    expect(fuelStats([...money].reverse()).averageMileage).toBeCloseTo(640 / 14)
  })
  it('carries fuel from same-odometer refills into the next gap', () => {
    const s = fuelStats([f(1000, 5, false), f(1000, 3, false), f(1200, 4, false)])
    expect(s.segments.map((x) => x.mileage)).toEqual([25])
  })
  it('stays exact for up to two partial refills after the last full one', () => {
    const s = fuelStats([f(1000, 30, true), f(1400, 20, true), f(1500, 5, false), f(1600, 5, false)])
    expect(s.estimated).toBe(false)
    expect(s.averageMileage).toBe(20)
  })
  it('switches to the estimate once the user stops filling to full', () => {
    const s = fuelStats([f(1000, 30, true), f(1400, 20, true), f(1500, 5, false), f(1600, 5, false), f(1700, 5, false)])
    expect(s.estimated).toBe(true)
    expect(s.averageMileage).toBeCloseTo(700 / 60)
  })
  it('falls back to the estimate when full tanks are rare', () => {
    const s = fuelStats([f(1000, 10, true), f(1100, 2, true), f(1500, 10, false), f(2000, 10, false)])
    expect(s.estimated).toBe(true)
    expect(s.averageMileage).toBeCloseTo(1000 / 22)
  })
})

describe('electric range from battery %', () => {
  const c = (odometer: number, from: number, to: number, cost = 0): FuelEntry => ({ ...f(odometer, 0, to === 100, cost), fuelType: 'Electric', batteryFrom: from, batteryTo: to })
  it('uses the exact charge used between charges', () => {
    // 100% -> drove 80 km -> 20% left: 80 km on 80% = 100 km per full charge
    const s = fuelStats([c(1000, 30, 100), c(1080, 20, 100), c(1150, 30, 90)])
    expect(s.mode).toBe('battery')
    expect(s.segments.map((x) => x.mileage)).toEqual([100, 100])
    expect(s.averageMileage).toBeCloseTo(100)
    expect(s.costPerDistance).toBeNull()
  })
  it('works with partial top-ups and costs only paid charges', () => {
    // 90% -> 50 km -> 40%: 50 km on 50% ; 80% -> 60 km -> 20%: 60 km on 60%
    const s = fuelStats([c(0, 10, 90, 20), c(50, 40, 80, 0), c(110, 20, 60, 0)])
    expect(s.averageMileage).toBeCloseTo(100)
    expect(s.costPerDistance).toBeCloseTo(20 / 50)
  })
  it('skips gaps where the battery reading went up without a charge', () => {
    expect(fuelStats([c(0, 10, 50), c(30, 60, 90)]).mode).not.toBe('battery')
  })
})

describe('reminders', () => {
  it('date states, no off-by-one', () => {
    expect(evaluateReminder(rem({ dueDate: '2026-11-09' }), vehicle, '2026-11-09').state).toBe('today')
    expect(evaluateReminder(rem({ dueDate: '2026-11-08' }), vehicle, '2026-11-09')).toMatchObject({ state: 'overdue', daysLeft: -1 })
    expect(evaluateReminder(rem({ dueDate: '2026-11-16' }), vehicle, '2026-11-09').state).toBe('soon')
    expect(evaluateReminder(rem({ dueDate: '2026-11-17' }), vehicle, '2026-11-09').state).toBe('upcoming')
  })
  it('mileage states and the worse of both conditions wins', () => {
    expect(evaluateReminder(rem({ dueOdometer: 30000 }), vehicle, '2026-11-09').state).toBe('upcoming')
    expect(evaluateReminder(rem({ dueOdometer: 25400 }), vehicle, '2026-11-09').state).toBe('soon')
    expect(evaluateReminder(rem({ dueOdometer: 24900, dueDate: '2027-01-15' }), vehicle, '2026-11-09').state).toBe('overdue')
  })
  it('alerts once per stage', () => {
    const r = rem({ dueDate: '2026-11-09' })
    const key = alertStage(r, evaluateReminder(r, vehicle, '2026-11-09'), '2026-11-09')
    expect(key).toBe('today:2026-11-09|')
    const after = { ...r, notifiedKeys: [key!] }
    expect(alertStage(after, evaluateReminder(after, vehicle, '2026-11-09'), '2026-11-09')).toBeNull()
    expect(alertStage({ ...r, snoozedUntil: '2026-11-10' }, evaluateReminder(r, vehicle, '2026-11-09'), '2026-11-09')).toBeNull()
  })
})

describe('expenses', () => {
  it('counts fuel and maintenance exactly once', () => {
    const lines = costLines({
      fuel: [f(1000, 10, true, 1000)],
      maintenance: [{ id: 'm', vehicleId: 'v', category: 'Engine oil change', date: '2026-01-02', odometer: 1000, amount: 500, createdAt: '' }],
      expenses: [{ id: 'e', vehicleId: 'v', category: 'Insurance', amount: 2000, date: '2026-01-03', description: 'x', createdAt: '' }],
    })
    expect(totalOf(lines)).toBe(3500)
    const rows = expenseSeries(lines, '6m', new Date(2026, 2, 15))
    expect(rows.map((r) => r.key)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'])
    expect(rows[3]).toMatchObject({ Fuel: 1000, Maintenance: 500, Insurance: 2000, total: 3500 })
  })
})

describe('storage', () => {
  it('migrates v1 and rejects garbage', () => {
    const v1 = { ...emptyData(), version: 1, user: { id: 'u', firstName: 'A', createdAt: 'x', currency: 'USD' } }
    expect(parseAppData(v1).settings.currency).toBe('USD')
    expect(() => parseAppData({ ...emptyData(), vehicles: [{ id: 1 }] })).toThrow(/vehicles/)
    expect(() => parseAppData({ ...emptyData(), version: 99 })).toThrow(/newer/)
  })
})

import { toCsv } from './csv'
describe('csv', () => {
  it('escapes quotes, commas and formulas', () => {
    expect(toCsv(['a', 'b'], [['x,"y"', '=SUM(1)'], [-5, null]])).toBe('a,b\r\n"x,""y""",\'=SUM(1)\r\n-5,')
  })
})
