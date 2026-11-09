// Pure state transitions. Every mutation of garage data goes through here.
import type { AppData, AppNotification, DateStr, Expense, FuelEntry, Maintenance, Paper, PaperType, Reminder, ReminderCategory, Vehicle } from '../types'
import { nowIso, uid } from '../lib/id'
import { buildDemoData } from '../lib/demo'

const upsert = <T extends { id: string }>(arr: T[], item: T) =>
  arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item]

/** Moves the vehicle's odometer forward (never back) and remembers when that reading was taken. */
const bumpOdometer = (d: AppData, vehicleId: string, odo: number, date: DateStr): Vehicle[] =>
  d.vehicles.map((v) =>
    v.id === vehicleId && odo >= v.currentOdometer
      ? { ...v, currentOdometer: odo, odometerAt: !v.odometerAt || date > v.odometerAt ? date : v.odometerAt, updatedAt: nowIso() }
      : v,
  )

/** Quick "Update km": a reading on its own, without logging a refill or service. */
export const updateOdometer = (d: AppData, vehicleId: string, odo: number, date: DateStr): AppData => ({ ...d, vehicles: bumpOdometer(d, vehicleId, odo, date) })

export const saveVehicle = (d: AppData, v: Vehicle): AppData => ({ ...d, vehicles: upsert(d.vehicles, v) })

export function relatedCounts(d: AppData, vehicleId: string) {
  const n = (arr: { vehicleId?: string }[]) => arr.filter((x) => x.vehicleId === vehicleId).length
  return { maintenance: n(d.maintenance), fuel: n(d.fuel), expenses: n(d.expenses), reminders: n(d.reminders), papers: n(d.papers) }
}

/** Removes a vehicle together with all records that belong to it. */
export function deleteVehicle(d: AppData, id: string): AppData {
  const keep = <T extends { vehicleId?: string }>(arr: T[]) => arr.filter((x) => x.vehicleId !== id)
  const papersGone = new Set(d.papers.filter((p) => p.vehicleId === id).map((p) => p.id))
  return {
    ...d,
    vehicles: d.vehicles.filter((v) => v.id !== id),
    maintenance: keep(d.maintenance),
    fuel: keep(d.fuel),
    expenses: keep(d.expenses),
    reminders: keep(d.reminders).filter((r) => !r.paperId || !papersGone.has(r.paperId)),
    papers: keep(d.papers),
    notifications: keep(d.notifications),
  }
}

export function reminderCategoryFor(maintenanceCategory: string): ReminderCategory {
  const map: Record<string, ReminderCategory> = {
    'Engine oil change': 'Oil change',
    'Tyre replacement': 'Tyre replacement',
    'General servicing': 'General servicing',
    'Battery replacement': 'Battery replacement',
  }
  return map[maintenanceCategory] ?? 'Custom'
}

/**
 * Saves a maintenance record, keeps the vehicle odometer current, completes the open reminder this
 * service fulfils, and creates/updates/removes the reminder for the next one.
 */
export function saveMaintenance(d: AppData, m: Maintenance, leadTime: number): AppData {
  const isNew = !d.maintenance.some((x) => x.id === m.id)
  const rc = reminderCategoryFor(m.category)
  let reminders = d.reminders
  if (isNew) {
    reminders = reminders.map((r) =>
      r.status === 'active' && r.vehicleId === m.vehicleId && (r.title === m.category || (rc !== 'Custom' && r.category === rc))
        ? { ...r, status: 'completed', completedAt: nowIso() }
        : r,
    )
  }
  const linked = reminders.find((r) => r.maintenanceId === m.id)
  const wantsNext = !!m.nextDueDate || m.nextDueOdometer != null
  if (wantsNext) {
    const changed = !linked || linked.dueDate !== m.nextDueDate || linked.dueOdometer !== m.nextDueOdometer
    const next: Reminder = linked
      ? { ...linked, dueDate: m.nextDueDate, dueOdometer: m.nextDueOdometer, vehicleId: m.vehicleId, ...(changed ? { status: 'active', completedAt: undefined, snoozedUntil: undefined } : {}) }
      : { id: uid(), vehicleId: m.vehicleId, title: m.category, category: rc, dueDate: m.nextDueDate, dueOdometer: m.nextDueOdometer, leadTime, status: 'active', notifiedKeys: [], maintenanceId: m.id, createdAt: nowIso() }
    reminders = upsert(reminders, next)
  } else if (linked && linked.status === 'active') {
    reminders = reminders.filter((r) => r.id !== linked.id)
  }
  return { ...d, maintenance: upsert(d.maintenance, m), reminders, vehicles: bumpOdometer(d, m.vehicleId, m.odometer, m.date) }
}

export const deleteMaintenance = (d: AppData, id: string): AppData => ({
  ...d,
  maintenance: d.maintenance.filter((m) => m.id !== id),
  reminders: d.reminders.filter((r) => !(r.maintenanceId === id && r.status === 'active')),
})

export const saveFuel = (d: AppData, f: FuelEntry): AppData => ({ ...d, fuel: upsert(d.fuel, f), vehicles: bumpOdometer(d, f.vehicleId, f.odometer, f.date) })
export const deleteFuel = (d: AppData, id: string): AppData => ({ ...d, fuel: d.fuel.filter((f) => f.id !== id) })

export const saveExpense = (d: AppData, e: Expense): AppData => ({ ...d, expenses: upsert(d.expenses, e) })
export const deleteExpense = (d: AppData, id: string): AppData => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })

export const saveReminder = (d: AppData, r: Reminder): AppData => ({ ...d, reminders: upsert(d.reminders, r) })
export const deleteReminder = (d: AppData, id: string): AppData => ({
  ...d,
  reminders: d.reminders.filter((r) => r.id !== id),
  notifications: d.notifications.filter((n) => n.reminderId !== id),
})
export const patchReminder = (d: AppData, id: string, patch: Partial<Reminder>): AppData => ({
  ...d,
  reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
})

// ---------- Papers ----------

const PAPER_REMINDER: Record<PaperType, { category: ReminderCategory; lead: number }> = {
  Insurance: { category: 'Insurance renewal', lead: 30 },
  'Pollution certificate (PUC)': { category: 'Pollution certificate renewal', lead: 7 },
  'Registration (RC)': { category: 'Registration renewal', lead: 30 },
  'Road tax': { category: 'Custom', lead: 30 },
  'Fitness certificate': { category: 'Custom', lead: 30 },
  Permit: { category: 'Custom', lead: 30 },
  Other: { category: 'Custom', lead: 15 },
}
export const paperTitle = (p: Pick<Paper, 'type'>) => (p.type === 'Other' ? 'Paper renewal' : `${p.type.replace(/ \(.*\)$/, '')} renewal`)

/** Saves a paper and keeps one reminder for its expiry. A new expiry date re-activates the reminder. */
export function savePaper(d: AppData, p: Paper): AppData {
  const linked = d.reminders.find((r) => r.paperId === p.id)
  const { category, lead } = PAPER_REMINDER[p.type]
  const reminder: Reminder = linked
    ? {
        ...linked,
        vehicleId: p.vehicleId,
        title: paperTitle(p),
        category,
        // A corrected paper type gets that type's lead time (e.g. 7 days for PUC, not 30).
        leadTime: linked.title === paperTitle(p) ? linked.leadTime : lead,
        dueDate: p.expiryDate,
        ...(linked.dueDate !== p.expiryDate ? { status: 'active', completedAt: undefined, snoozedUntil: undefined } : {}),
      }
    : { id: uid(), vehicleId: p.vehicleId, title: paperTitle(p), category, dueDate: p.expiryDate, leadTime: lead, status: 'active', notifiedKeys: [], paperId: p.id, createdAt: nowIso() }
  return { ...d, papers: upsert(d.papers, p), reminders: upsert(d.reminders, reminder) }
}

export function deletePaper(d: AppData, id: string): AppData {
  const ids = new Set(d.reminders.filter((r) => r.paperId === id).map((r) => r.id))
  return {
    ...d,
    papers: d.papers.filter((p) => p.id !== id),
    reminders: d.reminders.filter((r) => !ids.has(r.id)),
    notifications: d.notifications.filter((n) => !n.reminderId || !ids.has(n.reminderId)),
  }
}

/** Adds reminders (e.g. a standard service schedule) in one go. */
export const addReminders = (d: AppData, rs: Reminder[]): AppData => ({ ...d, reminders: [...d.reminders, ...rs] })

const MAX_NOTIFICATIONS = 100
export const addNotifications = (d: AppData, ns: AppNotification[]): AppData => ({
  ...d,
  notifications: [...ns, ...d.notifications].slice(0, MAX_NOTIFICATIONS),
})
export const markNotificationsRead = (d: AppData, ids?: string[]): AppData => ({
  ...d,
  notifications: d.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)),
})
export const clearNotifications = (d: AppData): AppData => ({ ...d, notifications: [] })

export function loadDemo(d: AppData): AppData {
  const demo = buildDemoData()
  return {
    ...clearDemo(d),
    vehicles: [...d.vehicles.filter((v) => !v.demo), ...demo.vehicles],
    maintenance: [...d.maintenance.filter((x) => !x.demo), ...demo.maintenance],
    fuel: [...d.fuel.filter((x) => !x.demo), ...demo.fuel],
    expenses: [...d.expenses.filter((x) => !x.demo), ...demo.expenses],
    reminders: [...d.reminders.filter((x) => !x.demo), ...demo.reminders],
  }
}

export function clearDemo(d: AppData): AppData {
  const demoVehicles = new Set(d.vehicles.filter((v) => v.demo).map((v) => v.id))
  const keep = <T extends { demo?: boolean; vehicleId?: string }>(arr: T[]) =>
    arr.filter((x) => !x.demo && !(x.vehicleId && demoVehicles.has(x.vehicleId)))
  return {
    ...d,
    vehicles: d.vehicles.filter((v) => !v.demo),
    maintenance: keep(d.maintenance),
    fuel: keep(d.fuel),
    expenses: keep(d.expenses),
    reminders: keep(d.reminders),
    papers: keep(d.papers),
    notifications: keep(d.notifications),
  }
}

export const hasDemo = (d: AppData) => d.vehicles.some((v) => v.demo)
