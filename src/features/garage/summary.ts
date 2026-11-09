import { useMemo } from 'react'
import { useGarage, type EvaluatedReminder } from '../../store/AppStore'
import { totalOf } from '../../lib/calc'
import type { Maintenance } from '../../types'

export interface VehicleSummary {
  total: number
  fuel: number
  maintenance: number
  other: number
  lastService?: Maintenance
  next?: EvaluatedReminder
}

/** Per-vehicle totals and service status, computed once per data change. */
export function useVehicleSummaries() {
  const { data, lines, reminders } = useGarage()
  return useMemo(() => {
    const out = new Map<string, VehicleSummary>()
    for (const v of data.vehicles) {
      const own = lines.filter((l) => l.vehicleId === v.id)
      const fuel = totalOf(own.filter((l) => l.category === 'Fuel'))
      const maintenance = totalOf(own.filter((l) => l.category === 'Maintenance'))
      const total = totalOf(own)
      out.set(v.id, {
        total,
        fuel,
        maintenance,
        other: total - fuel - maintenance,
        lastService: data.maintenance.filter((m) => m.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date))[0],
        next: reminders.find((r) => r.reminder.vehicleId === v.id && r.reminder.status === 'active'),
      })
    }
    return out
  }, [data.vehicles, data.maintenance, lines, reminders])
}
