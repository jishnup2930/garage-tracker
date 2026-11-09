import { useMemo, useState } from 'react'
import { ShowMore } from './CostList'
import type { FuelEntry } from '../../types'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { fuelStats } from '../../lib/calc'
import { cn } from '../../lib/cn'

/** Refill log. Mileage shows on the refill that closes each stretch; ≈ marks refill-to-refill estimates. */
export function FuelLog({ entries, showVehicle = true }: { entries: FuelEntry[]; showVehicle?: boolean }) {
  const { data, vehicleById } = useGarage()
  const { openForm } = useUI()
  const f = useFormat()
  const mileageById = useMemo(() => {
    const m = new Map<string, string>()
    const byVehicle = new Map<string, FuelEntry[]>()
    for (const e of data.fuel) byVehicle.set(e.vehicleId, [...(byVehicle.get(e.vehicleId) ?? []), e])
    for (const list of byVehicle.values()) {
      const { segments, estimated, mode } = fuelStats(list)
      for (const s of segments) {
        const e = list.find((x) => x.odometer === s.odometer && x.date === s.date)
        if (e) m.set(e.id, `${estimated ? '≈ ' : ''}${f.mileage(s.mileage, e.fuelType, mode)}`)
      }
    }
    return m
  }, [data.fuel, f])
  const [count, setCount] = useState(30)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)

  const amountOf = (e: FuelEntry) => (e.batteryTo != null ? `${e.batteryFrom}–${e.batteryTo}%` : `${f.num(e.quantity, 2)} ${f.u.volume(e.fuelType)}`)
  return (
    <>
    {/* Phones: one tappable row per refill instead of a 7-column table. */}
    <ul className="-mx-5 divide-y divide-line/70 sm:hidden">
      {sorted.slice(0, count).map((e) => {
        const mileage = mileageById.get(e.id)
        return (
          <li key={e.id}>
            <button className="w-full px-5 py-3 text-left hover:bg-surface-2" onClick={() => openForm({ kind: 'fuel', id: e.id })}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">
                  {f.date(e.date)}
                  {showVehicle && <span className="font-normal text-muted">, {vehicleById.get(e.vehicleId)?.nickname}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular">{e.totalCost ? f.money(e.totalCost) : '—'}</span>
              </span>
              <span className="mt-0.5 flex justify-between gap-3 text-xs text-muted">
                <span className="truncate">
                  {f.dist(e.odometer)}, {amountOf(e)}
                </span>
                {mileage && <span className="shrink-0 font-medium text-fg tabular">{mileage}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
    <div className="-mx-5 hidden overflow-x-auto sm:-mx-6 sm:block">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 pl-5 font-medium sm:pl-6">Date</th>
            {showVehicle && <th className="py-2 font-medium">Vehicle</th>}
            <th className="py-2 text-right font-medium">Odometer</th>
            <th className="py-2 text-right font-medium">Quantity</th>
            <th className="py-2 text-right font-medium">Price</th>
            <th className="py-2 text-right font-medium">Total</th>
            <th className="py-2 pr-5 text-right font-medium sm:pr-6">Mileage</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, count).map((e) => {
            const mileage = mileageById.get(e.id)
            return (
              <tr key={e.id} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-surface-2" onClick={() => openForm({ kind: 'fuel', id: e.id })}>
                <td className="py-2.5 pl-5 sm:pl-6">
                  <button className="font-medium hover:underline" onClick={(ev) => (ev.stopPropagation(), openForm({ kind: 'fuel', id: e.id }))}>
                    {f.date(e.date)}
                  </button>
                  <span className="block text-xs text-muted">{e.isFullTank ? 'Full' : 'Partial'}{e.fuelStation ? `, ${e.fuelStation}` : ''}</span>
                </td>
                {showVehicle && <td className="py-2.5">{vehicleById.get(e.vehicleId)?.nickname}</td>}
                <td className="py-2.5 text-right tabular">{f.num(e.odometer)}</td>
                <td className="py-2.5 text-right tabular">{amountOf(e)}</td>
                <td className="py-2.5 text-right tabular text-muted">{f.moneyExact(e.pricePerUnit)}</td>
                <td className="py-2.5 text-right font-semibold tabular">{f.money(e.totalCost)}</td>
                <td className={cn('py-2.5 pr-5 text-right tabular sm:pr-6', !mileage && 'text-faint')}>{mileage ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    {sorted.length > count && <ShowMore left={sorted.length - count} onClick={() => setCount((c) => c + 30)} />}
    </>
  )
}
