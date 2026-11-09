import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { DateStr, FuelType, Settings } from '../types'

export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: 'INR', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (€)', locale: 'en-IE' },
  { code: 'GBP', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'AED', label: 'UAE Dirham (AED)', locale: 'en-AE' },
  { code: 'AUD', label: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'SGD', label: 'Singapore Dollar (S$)', locale: 'en-SG' },
  { code: 'JPY', label: 'Japanese Yen (¥)', locale: 'ja-JP' },
  { code: 'XOF', label: 'West African CFA franc (CFA)', locale: 'fr-SN' },
  { code: 'GNF', label: 'Guinean franc (FG)', locale: 'fr-GN' },
]

const localeFor = (code: string) => CURRENCIES.find((c) => c.code === code)?.locale ?? 'en-IN'

const fmtCache = new Map<string, Intl.NumberFormat>()
function nf(key: string, make: () => Intl.NumberFormat) {
  let f = fmtCache.get(key)
  if (!f) fmtCache.set(key, (f = make()))
  return f
}

export function money(amount: number, currency: string, opts: { compact?: boolean; decimals?: boolean } = {}) {
  const key = `${currency}|${opts.compact}|${opts.decimals}`
  return nf(key, () =>
    new Intl.NumberFormat(localeFor(currency), {
      style: 'currency',
      currency,
      notation: opts.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts.compact ? 1 : opts.decimals ? 2 : 0,
      minimumFractionDigits: 0,
    }),
  ).format(amount)
}

export function num(n: number, digits = 0) {
  return nf(`n${digits}`, () => new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits })).format(n)
}

export const isEV = (f: FuelType) => f === 'Electric'

export function units(settings: Settings) {
  const d = settings.distanceUnit
  const v = settings.volumeUnit
  return {
    distance: d,
    volume: (fuel: FuelType) => (isEV(fuel) ? 'kWh' : v),
    efficiency: (fuel: FuelType) => (isEV(fuel) ? `${d}/kWh` : d === 'km' && v === 'L' ? 'km/L' : `${d}/${v}`),
  }
}

export function fmtDate(d: DateStr | undefined, settings: Pick<Settings, 'dateFormat'>) {
  if (!d) return '—'
  return format(parseISO(d), settings.dateFormat)
}

export function relTime(ts: string) {
  return formatDistanceToNowStrict(parseISO(ts), { addSuffix: true })
}

export function dueText(days: number) {
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `Due in ${days} days`
  if (days === -1) return 'Overdue by 1 day'
  return `Overdue by ${-days} days`
}

export function greetingWord(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good evening'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? '' : 's'}`
