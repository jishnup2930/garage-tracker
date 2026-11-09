import { addMonths, differenceInCalendarDays, parseISO } from 'date-fns'
import type { AppData, DateStr, ReminderCategory, Vehicle } from '../types'
import { todayStr } from './calc'

export interface ServiceItem {
  /** Matches a maintenance category, so logging that service completes the reminder. */
  title: string
  category: ReminderCategory
  km?: number
  months?: number
}

const oil = (km: number, months: number): ServiceItem => ({ title: 'Engine oil change', category: 'Oil change', km, months })
const service = (km: number, months: number): ServiceItem => ({ title: 'General servicing', category: 'General servicing', km, months })

/**
 * Typical intervals for Indian two-wheelers and cars. A starting point only: every maker's schedule differs,
 * so the form says to check the owner's manual and lets each item be edited later.
 */
export function standardSchedule(v: Pick<Vehicle, 'type' | 'fuelType'>): ServiceItem[] {
  const ev = v.fuelType === 'Electric'
  if (v.type === 'Motorcycle')
    return ev
      ? [service(5000, 6), { title: 'Chain lubrication', category: 'Custom', km: 600 }, { title: 'Brake pad replacement', category: 'Custom', km: 10000, months: 12 }]
      : [oil(3000, 6), service(5000, 6), { title: 'Chain lubrication', category: 'Custom', km: 600 }, { title: 'Air filter replacement', category: 'Custom', km: 10000, months: 12 }]
  if (v.type === 'Scooter')
    return ev
      ? [service(5000, 6), { title: 'Brake pad replacement', category: 'Custom', km: 10000, months: 12 }]
      : [oil(3000, 6), service(5000, 6), { title: 'Air filter replacement', category: 'Custom', km: 10000, months: 12 }]
  // Cars, SUVs, trucks and anything else on four wheels.
  return ev
    ? [service(15000, 12), { title: 'Tyre rotation', category: 'Custom', km: 10000 }, { title: 'Brake fluid replacement', category: 'Custom', months: 24 }]
    : [oil(10000, 12), service(10000, 12), { title: 'Tyre rotation', category: 'Custom', km: 10000 }, { title: 'Air filter replacement', category: 'Custom', km: 20000, months: 24 }, { title: 'Coolant replacement', category: 'Custom', km: 40000, months: 36 }]
}

export const dueFor = (item: ServiceItem, odometer: number, today: DateStr = todayStr()) => ({
  dueOdometer: item.km ? odometer + item.km : undefined,
  dueDate: item.months ? todayStr(addMonths(parseISO(today), item.months)) : undefined,
})

/** Date of the vehicle's latest known odometer reading: a quick update, a refill or a service. */
export function lastReadingDate(v: Vehicle, d: Pick<AppData, 'fuel' | 'maintenance'>): DateStr {
  let last = v.odometerAt ?? v.createdAt.slice(0, 10)
  for (const r of [...d.fuel, ...d.maintenance]) if (r.vehicleId === v.id && r.date > last) last = r.date
  return last
}

export const daysSince = (date: DateStr, today: DateStr = todayStr()) => differenceInCalendarDays(parseISO(today), parseISO(date))
