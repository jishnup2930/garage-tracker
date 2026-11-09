import type { AppData } from '../types'
import { appDataSchema, emptyData, SCHEMA_VERSION } from './schema'

/** The only place in the app that touches LocalStorage. */
export const STORAGE_KEY = 'garage.data'

type Raw = Record<string, unknown>

/** Each migration upgrades data from version N to N+1. */
const migrations: Record<number, (d: Raw) => Raw> = {
  // v1 kept currency/distanceUnit on the user; v2 moved them into settings.
  1: (d) => {
    const user = (d.user ?? null) as Raw | null
    const settings = { ...((d.settings as Raw) ?? {}) }
    if (user) {
      if (user.currency) settings.currency = user.currency
      if (user.distanceUnit) settings.distanceUnit = user.distanceUnit
      delete user.currency
      delete user.distanceUnit
    }
    return { ...d, user, settings, version: 2 }
  },
}

export function migrate(input: Raw): Raw {
  let d: Raw = { ...emptyData(), ...input }
  let v = typeof d.version === 'number' ? d.version : 1
  if (v > SCHEMA_VERSION) throw new Error(`This backup is from a newer version of the app (v${v}).`)
  while (v < SCHEMA_VERSION) {
    const step = migrations[v]
    if (!step) throw new Error(`No migration from schema v${v}.`)
    d = step(d)
    v = d.version as number
  }
  return d
}

const dedupe = <T extends { id: string }>(arr: T[]) => [...new Map(arr.map((x) => [x.id, x])).values()]

/** Validate and normalise unknown data (from storage or a backup file). Throws a readable error. */
export function parseAppData(input: unknown): AppData {
  if (!input || typeof input !== 'object') throw new Error('The file does not contain garage data.')
  const obj = input as Raw
  const payload = obj.app === 'garage' && obj.data ? (obj.data as Raw) : obj
  const res = appDataSchema.safeParse(migrate(payload))
  if (!res.success) {
    const issue = res.error.issues[0]
    throw new Error(`Invalid data at "${issue.path.join('.')}": ${issue.message}`)
  }
  const d = res.data as AppData
  return {
    ...d,
    vehicles: dedupe(d.vehicles),
    maintenance: dedupe(d.maintenance),
    fuel: dedupe(d.fuel),
    expenses: dedupe(d.expenses),
    reminders: dedupe(d.reminders),
    notifications: dedupe(d.notifications),
    customMaintenanceCategories: [...new Set(d.customMaintenanceCategories)],
  }
}

export interface LoadResult {
  data: AppData
  /** Set when stored data was unreadable and a fresh state was used instead. */
  recovered?: string
}

export function loadData(): LoadResult {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: emptyData(), recovered: 'Browser storage is unavailable. Changes will not be saved.' }
  }
  if (!raw) return { data: emptyData() }
  try {
    return { data: parseAppData(JSON.parse(raw)) }
  } catch (e) {
    // Keep the unreadable copy so nothing is silently destroyed.
    try {
      localStorage.setItem(`${STORAGE_KEY}.corrupt-${Date.now()}`, raw)
    } catch {
      /* storage full: nothing more we can do */
    }
    return {
      data: emptyData(),
      recovered: `Saved data could not be read (${(e as Error).message}). A copy was kept and the app started fresh.`,
    }
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' }

export function saveData(data: AppData): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    return { ok: false, reason: quota ? 'quota' : 'unavailable' }
  }
}

export function clearData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function storageUsageBytes(): number {
  try {
    return (localStorage.getItem(STORAGE_KEY)?.length ?? 0) * 2
  } catch {
    return 0
  }
}

export function buildBackup(data: AppData) {
  return JSON.stringify({ app: 'garage', exportedAt: new Date().toISOString(), data }, null, 2)
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
