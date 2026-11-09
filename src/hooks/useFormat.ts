import { useMemo } from 'react'
import { useGarage } from '../store/AppStore'
import { fmtDate, money, num, units } from '../lib/format'
import type { DateStr, FuelType } from '../types'

/** Formatting bound to the user's currency, units and date format. */
export function useFormat() {
  const { data } = useGarage()
  const s = data.settings
  return useMemo(() => {
    const u = units(s)
    return {
      money: (n: number) => money(n, s.currency),
      moneyExact: (n: number) => money(n, s.currency, { decimals: true }),
      moneyCompact: (n: number) => money(n, s.currency, { compact: true }),
      date: (d?: DateStr) => fmtDate(d, s),
      dist: (n: number) => `${num(n)} ${u.distance}`,
      /** Mileage unit, or for electric stats from battery %, range per full charge. */
      effUnit: (fuelType: FuelType, mode?: string) => (mode === 'battery' ? `${u.distance} per full charge` : u.efficiency(fuelType)),
      mileage: (n: number, fuelType: FuelType, mode?: string) => (mode === 'battery' ? `${num(n)} ${u.distance} per charge` : `${num(n, 1)} ${u.efficiency(fuelType)}`),
      num,
      u,
      currency: s.currency,
    }
  }, [s])
}
