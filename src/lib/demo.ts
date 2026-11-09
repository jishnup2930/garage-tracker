import { addDays, subDays } from 'date-fns'
import type { AppData, Expense, FuelEntry, Maintenance, Reminder, Vehicle } from '../types'
import { round2, todayStr } from './calc'
import { nowIso, uid } from './id'

/** Optional sample garage so first-time users can explore. Every record is tagged `demo` so it can be cleared. */
export function buildDemoData(now = new Date()): Pick<AppData, 'vehicles' | 'maintenance' | 'fuel' | 'expenses' | 'reminders'> {
  let seed = 42
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const ts = nowIso()
  const day = (n: number) => todayStr(subDays(now, n))
  const ahead = (n: number) => todayStr(addDays(now, n))

  const mk = (v: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'demo'>): Vehicle => ({ ...v, id: uid(), demo: true, createdAt: ts, updatedAt: ts })
  const car = mk({ nickname: 'Honda City ZX', type: 'Car', brand: 'Honda', model: 'City ZX', registrationNumber: 'DEMO 01', fuelType: 'Petrol', currentOdometer: 0, purchaseDate: day(1400) })
  const bike = mk({ nickname: 'Royal Enfield Classic 350', type: 'Motorcycle', brand: 'Royal Enfield', model: 'Classic 350', registrationNumber: 'DEMO 02', fuelType: 'Petrol', currentOdometer: 0, purchaseDate: day(900) })
  const ev = mk({ nickname: 'Ather 450X', type: 'Scooter', brand: 'Ather', model: '450X', fuelType: 'Electric', currentOdometer: 0, purchaseDate: day(400) })

  const fuel: FuelEntry[] = []
  const addFuel = (v: Vehicle, startOdo: number, every: number, perDay: number, eff: number, price: number, cap: number) => {
    let odo = startOdo
    for (let d = 360; d >= 2; d -= every + Math.floor(rand() * 4)) {
      odo += Math.round(perDay * (every + rand() * 3))
      const full = rand() > 0.15
      const qty = round2(full ? Math.min(cap, (perDay * every) / (eff * (0.9 + rand() * 0.2))) : cap * 0.4)
      const p = round2(price + (rand() - 0.4) * price * 0.04 + ((360 - d) / 360) * price * 0.03)
      fuel.push({ id: uid(), vehicleId: v.id, date: day(d), odometer: odo, fuelType: v.fuelType, quantity: qty, pricePerUnit: p, totalCost: round2(qty * p), isFullTank: full, fuelStation: v.fuelType === 'Electric' ? 'Home charger' : rand() > 0.5 ? 'City Fuels' : 'Highway Pump', createdAt: ts, demo: true })
    }
    v.currentOdometer = odo + Math.round(perDay * 2)
  }
  addFuel(car, 31200, 12, 32, 15.5, 103, 40)
  addFuel(bike, 18400, 9, 22, 34, 103, 13)
  addFuel(ev, 4100, 5, 18, 28, 8, 3)

  const m = (v: Vehicle, category: string, daysAgo: number, amount: number, odoBack: number, next: { days?: number; km?: number }, description?: string): Maintenance => ({
    id: uid(), vehicleId: v.id, category, date: day(daysAgo), odometer: v.currentOdometer - odoBack, amount, description, serviceProvider: 'Demo Motors',
    nextDueDate: next.days != null ? ahead(next.days - daysAgo) : undefined,
    nextDueOdometer: next.km != null ? v.currentOdometer - odoBack + next.km : undefined,
    createdAt: ts, demo: true,
  })
  const maintenance: Maintenance[] = [
    m(car, 'General servicing', 300, 6200, 9500, {}, '30,000 km service'),
    m(car, 'Engine oil change', 176, 3400, 5300, { days: 180, km: 5000 }, 'Synthetic 0W-20'),
    m(car, 'Tyre rotation', 95, 600, 2900, {}),
    m(car, 'Brake pad replacement', 40, 4200, 1300, {}, 'Front pads'),
    m(bike, 'Chain lubrication', 60, 250, 1200, { days: 75 }),
    m(bike, 'General servicing', 140, 2800, 3100, { days: 180, km: 4000 }),
    m(bike, 'Engine oil change', 25, 1100, 550, { km: 3000 }),
    m(ev, 'Tyre replacement', 120, 2900, 2100, {}, 'Rear tyre'),
  ]

  const e = (v: Vehicle, category: Expense['category'], daysAgo: number, amount: number, description: string): Expense => ({ id: uid(), vehicleId: v.id, category, amount, date: day(daysAgo), description, createdAt: ts, demo: true })
  const expenses: Expense[] = [
    e(car, 'Insurance', 330, 18500, 'Comprehensive policy renewal'),
    e(bike, 'Insurance', 200, 3200, 'Third-party + own damage'),
    e(ev, 'Insurance', 50, 2100, 'Annual policy'),
    e(car, 'Accessories', 210, 2400, 'Seat covers'),
    e(car, 'Repairs', 150, 5600, 'AC compressor repair'),
    e(bike, 'Repairs', 70, 1800, 'Clutch cable replacement'),
    e(car, 'Registration', 280, 900, 'Pollution certificate'),
  ]
  for (let d = 350; d > 0; d -= 18 + Math.floor(rand() * 10)) {
    expenses.push(e(car, 'Parking', d, Math.round(60 + rand() * 140), 'Mall parking'))
    if (rand() > 0.5) expenses.push(e(car, 'Tolls', d - 2, Math.round(120 + rand() * 300), 'Expressway toll'))
    if (rand() > 0.6) expenses.push(e(rand() > 0.5 ? car : bike, 'Cleaning', d - 4, Math.round(200 + rand() * 500), 'Wash & polish'))
  }

  const fromMaint = (x: Maintenance, rc: Reminder['category']): Reminder => ({
    id: uid(), vehicleId: x.vehicleId, title: x.category, category: rc, dueDate: x.nextDueDate, dueOdometer: x.nextDueOdometer,
    leadTime: 7, status: 'active', notifiedKeys: [], maintenanceId: x.id, createdAt: ts, demo: true,
  })
  const r = (v: Vehicle, title: string, category: Reminder['category'], dueDate?: string, dueOdometer?: number): Reminder => ({
    id: uid(), vehicleId: v.id, title, category, dueDate, dueOdometer, leadTime: 15, status: 'active', notifiedKeys: [], createdAt: ts, demo: true,
  })
  const reminders: Reminder[] = [
    fromMaint(maintenance[1], 'Oil change'),
    fromMaint(maintenance[4], 'Custom'),
    fromMaint(maintenance[5], 'General servicing'),
    fromMaint(maintenance[6], 'Oil change'),
    r(car, 'Insurance renewal', 'Insurance renewal', ahead(35)),
    r(bike, 'Pollution certificate', 'Pollution certificate renewal', day(3)),
    r(ev, 'Insurance renewal', 'Insurance renewal', ahead(315)),
    { ...r(car, 'Registration renewal', 'Registration renewal', day(20)), status: 'completed', completedAt: nowIso() },
  ]

  return { vehicles: [car, bike, ev], maintenance, fuel, expenses, reminders }
}
