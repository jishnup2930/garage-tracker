import { describe, expect, it } from 'vitest'
import type { Paper, Vehicle } from '../types'
import { esc, fold, icsFor, googleCalendarUrl } from './calendar'
import { dueFor, lastReadingDate, standardSchedule } from './schedules'
import { emptyData } from './schema'
import { parseAppData } from './storage'
import { addReminders, deletePaper, deleteVehicle, paperTitle, saveMaintenance, savePaper, updateOdometer } from '../store/ops'

const ev = { uid: 'r1', title: 'Insurance renewal, Honda City', description: 'Due 20/09/2027', date: '2027-09-20', leadDays: 30 }

describe('calendar export', () => {
  it('makes an all-day event with an alarm at 9am on the lead day', () => {
    const ics = icsFor(ev, new Date('2026-11-09T10:00:00Z'))
    expect(ics).toContain('DTSTART;VALUE=DATE:20270920')
    expect(ics).toContain('DTEND;VALUE=DATE:20270921')
    expect(ics).toContain('TRIGGER:-P29DT15H') // 30 days back + 9h, in days so DST can't shift it
    expect(ics).toContain('UID:r1-20270920@garagetracker')
    expect(ics).toContain('SUMMARY:Insurance renewal\\, Honda City')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })
  it('alarms at 9am on the day itself when there is no lead time', () => {
    expect(icsFor({ ...ev, leadDays: 0 })).toContain('TRIGGER:PT9H')
  })
  it('escapes backslash, semicolon and comma, and folds long lines at 75 octets', () => {
    expect(esc('a\\b;c,d')).toBe('a\\\\b\\;c\\,d')
    const long = `SUMMARY:${'é'.repeat(60)}`
    const folded = fold(long).split('\r\n')
    expect(folded.length).toBeGreaterThan(1)
    expect(folded.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
    expect(folded.slice(1).every((l) => l.startsWith(' '))).toBe(true)
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long)
  })
  it('builds a Google Calendar link for the whole day', () => {
    const u = new URL(googleCalendarUrl(ev))
    expect(u.searchParams.get('dates')).toBe('20270920/20270921')
    expect(u.searchParams.get('text')).toBe(ev.title)
  })
})

const vehicle = (p: Partial<Vehicle> = {}): Vehicle => ({ id: 'v', nickname: 'Bike', type: 'Motorcycle', brand: 'B', model: 'M', fuelType: 'Petrol', currentOdometer: 10000, createdAt: '2026-01-01T00:00:00Z', updatedAt: '', ...p })

describe('standard schedule', () => {
  it('suits the vehicle: chain for motorcycles, no oil change for EVs', () => {
    const titles = (v: Partial<Vehicle>) => standardSchedule(vehicle(v)).map((s) => s.title)
    expect(titles({})).toContain('Chain lubrication')
    expect(titles({ type: 'Scooter' })).not.toContain('Chain lubrication')
    expect(titles({ fuelType: 'Electric' })).not.toContain('Engine oil change')
    expect(titles({ type: 'Car' })).toContain('Tyre rotation')
  })
  it('sets due km from the current reading and due date from today', () => {
    expect(dueFor({ title: 'x', category: 'Custom', km: 3000, months: 6 }, 10000, '2026-11-09')).toEqual({ dueOdometer: 13000, dueDate: '2027-05-09' })
    expect(dueFor({ title: 'x', category: 'Custom', km: 600 }, 10000, '2026-11-09')).toEqual({ dueOdometer: 10600, dueDate: undefined })
  })
})

describe('odometer readings', () => {
  it('takes the latest of a quick update, refill or service', () => {
    const d = { ...emptyData(), vehicles: [vehicle({ odometerAt: '2026-03-01' })] }
    expect(lastReadingDate(d.vehicles[0], d)).toBe('2026-03-01')
    const f = { id: 'f', vehicleId: 'v', date: '2026-04-02', odometer: 10500, fuelType: 'Petrol' as const, quantity: 5, pricePerUnit: 100, totalCost: 500, isFullTank: false, createdAt: '' }
    expect(lastReadingDate(d.vehicles[0], { ...d, fuel: [f] })).toBe('2026-04-02')
  })
  it('quick update moves the reading forward and records the date', () => {
    const d = updateOdometer({ ...emptyData(), vehicles: [vehicle()] }, 'v', 10400, '2026-11-09')
    expect(d.vehicles[0]).toMatchObject({ currentOdometer: 10400, odometerAt: '2026-11-09' })
    expect(updateOdometer(d, 'v', 9000, '2026-11-10').vehicles[0].currentOdometer).toBe(10400)
  })
})

describe('papers', () => {
  const paper: Paper = { id: 'p', vehicleId: 'v', type: 'Pollution certificate (PUC)', expiryDate: '2027-05-01', createdAt: '' }
  it('creates one reminder for the expiry, with the right lead time', () => {
    const d = savePaper({ ...emptyData(), vehicles: [vehicle()] }, paper)
    expect(d.reminders).toHaveLength(1)
    expect(d.reminders[0]).toMatchObject({ title: 'Pollution certificate renewal', dueDate: '2027-05-01', leadTime: 7, paperId: 'p', status: 'active' })
    expect(paperTitle({ type: 'Insurance' })).toBe('Insurance renewal')
  })
  it('a renewed expiry re-activates the same reminder', () => {
    let d = savePaper({ ...emptyData(), vehicles: [vehicle()] }, paper)
    d = { ...d, reminders: d.reminders.map((r) => ({ ...r, status: 'completed' as const })) }
    d = savePaper(d, { ...paper, expiryDate: '2027-11-01' })
    expect(d.reminders).toHaveLength(1)
    expect(d.reminders[0]).toMatchObject({ dueDate: '2027-11-01', status: 'active' })
  })
  it('deleting a paper or its vehicle removes its reminder', () => {
    const d = savePaper({ ...emptyData(), vehicles: [vehicle()] }, paper)
    expect(deletePaper(d, 'p').reminders).toHaveLength(0)
    expect(deleteVehicle(d, 'v')).toMatchObject({ papers: [], reminders: [] })
  })
  it('a corrected paper type takes that type\'s lead time', () => {
    let d = savePaper({ ...emptyData(), vehicles: [vehicle()] }, { ...paper, type: 'Insurance' })
    expect(d.reminders[0].leadTime).toBe(30)
    d = savePaper(d, paper)
    expect(d.reminders[0]).toMatchObject({ title: 'Pollution certificate renewal', leadTime: 7 })
  })
  it('deleting the vehicle removes its paper reminders even if they were moved', () => {
    let d = savePaper({ ...emptyData(), vehicles: [vehicle(), vehicle({ id: 'w' })] }, paper)
    d = { ...d, reminders: d.reminders.map((r) => ({ ...r, vehicleId: 'w' })) }
    expect(deleteVehicle(d, 'v').reminders).toHaveLength(0)
  })
  it('old saved data without papers still loads', () => {
    const { papers: _omit, ...old } = emptyData()
    expect(parseAppData(old).papers).toEqual([])
  })
})

describe('schedule meets maintenance', () => {
  it('logging the service completes the scheduled reminder', () => {
    const item = standardSchedule(vehicle())[0]
    let d = addReminders({ ...emptyData(), vehicles: [vehicle()] }, [{ id: 's', vehicleId: 'v', title: item.title, category: item.category, ...dueFor(item, 10000), leadTime: 7, status: 'active', notifiedKeys: [], createdAt: '' }])
    d = saveMaintenance(d, { id: 'm', vehicleId: 'v', category: 'Engine oil change', date: '2026-11-09', odometer: 12900, amount: 600, createdAt: '' }, 7)
    expect(d.reminders.find((r) => r.id === 's')?.status).toBe('completed')
  })
})
