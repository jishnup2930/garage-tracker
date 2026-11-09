import { useMemo } from 'react'
import { useGarage } from '../store/AppStore'
import { fmtDate, money, num, units } from '../lib/format'
import type { DateStr } from '../types'

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
      num,
      u,
      currency: s.currency,
    }
  }, [s])
}
