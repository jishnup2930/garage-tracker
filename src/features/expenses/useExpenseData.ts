import { useMemo } from 'react'
import { format, parseISO, subMonths } from 'date-fns'
import type { CostLine, Vehicle } from '../../types'
import { CHART_CATEGORIES, chartCategory, monthKey, totalOf } from '../../lib/calc'

/** Aggregations shared by the Expenses and Analytics pages. */
export function useExpenseAggregates(lines: CostLine[], vehicles: Vehicle[]) {
  return useMemo(() => {
    const cats = new Map<string, number>()
    for (const l of lines) cats.set(chartCategory(l.category), (cats.get(chartCategory(l.category)) ?? 0) + l.amount)
    const byCategory = CHART_CATEGORIES.filter((c) => cats.get(c)).map((c) => ({ name: c, value: cats.get(c)! })).sort((a, b) => b.value - a.value)

    const byVehicle = vehicles.map((v) => ({ name: v.nickname, id: v.id, value: totalOf(lines.filter((l) => l.vehicleId === v.id)) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

    const now = new Date()
    const fuelVsMaint = Array.from({ length: 12 }, (_, i) => {
      const m = format(subMonths(now, 11 - i), 'yyyy-MM')
      const ls = lines.filter((l) => monthKey(l.date) === m)
      return { label: format(parseISO(`${m}-01`), 'MMM'), Fuel: totalOf(ls.filter((l) => l.category === 'Fuel')), Maintenance: totalOf(ls.filter((l) => l.category === 'Maintenance')) }
    })

    const years = new Map<string, number>()
    for (const l of lines) years.set(l.date.slice(0, 4), (years.get(l.date.slice(0, 4)) ?? 0) + l.amount)
    const yearly = [...years.entries()].sort().map(([label, total]) => ({ label, total }))

    return { byCategory, byVehicle, fuelVsMaint, yearly }
  }, [lines, vehicles])
}
