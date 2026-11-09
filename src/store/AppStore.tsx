import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, CostLine, Reminder, Vehicle } from '../types'
import { loadData, saveData } from '../lib/storage'
import { costLines, evaluateReminder, todayStr, urgency, type ReminderEval } from '../lib/calc'
import { useToast } from '../components/ui/Toast'

export interface EvaluatedReminder {
  reminder: Reminder
  vehicle?: Vehicle
  eval: ReminderEval
}

interface Store {
  data: AppData
  /** Apply a change. Returns false (and leaves state untouched) if it could not be saved. */
  update: (fn: (d: AppData) => AppData) => boolean
  replace: (d: AppData) => boolean
  lines: CostLine[]
  vehicleById: Map<string, Vehicle>
  reminders: EvaluatedReminder[]
  today: string
}

const Ctx = createContext<Store | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [initial] = useState(loadData)
  const [data, setData] = useState<AppData>(initial.data)
  const ref = useRef(data)
  const [today, setToday] = useState(todayStr)

  useEffect(() => {
    if (initial.recovered) toast.show({ tone: 'error', title: 'Data recovery', message: initial.recovered })
  }, [initial, toast])

  // Day rolls over while the tab stays open: re-evaluate due dates.
  useEffect(() => {
    const tick = () => setToday(todayStr())
    const id = setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
    }
  }, [])

  const replace = useCallback(
    (next: AppData) => {
      const res = saveData(next)
      if (!res.ok) {
        toast.show({
          tone: 'error',
          title: res.reason === 'quota' ? 'Storage is full' : 'Could not save',
          message:
            res.reason === 'quota'
              ? 'Your browser storage is full, so this change was not saved. Try removing large photos or receipts, or export a backup.'
              : 'Browser storage is unavailable, so this change was not saved.',
        })
        return false
      }
      ref.current = next
      setData(next)
      return true
    },
    [toast],
  )

  const update = useCallback((fn: (d: AppData) => AppData) => replace(fn(ref.current)), [replace])

  // Keep tabs in sync when the same app is open twice.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'garage.data') return
      const fresh = loadData()
      if (!fresh.recovered) {
        ref.current = fresh.data
        setData(fresh.data)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const lines = useMemo(() => costLines(data), [data.fuel, data.maintenance, data.expenses])
  const vehicleById = useMemo(() => new Map(data.vehicles.map((v) => [v.id, v])), [data.vehicles])
  const reminders = useMemo(
    () =>
      data.reminders
        .map((reminder) => {
          const vehicle = vehicleById.get(reminder.vehicleId)
          return { reminder, vehicle, eval: evaluateReminder(reminder, vehicle, today) }
        })
        .sort((a, b) => urgency(a.eval) - urgency(b.eval)),
    [data.reminders, vehicleById, today],
  )

  const value = useMemo(() => ({ data, update, replace, lines, vehicleById, reminders, today }), [data, update, replace, lines, vehicleById, reminders, today])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGarage() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useGarage must be used inside AppStoreProvider')
  return s
}
