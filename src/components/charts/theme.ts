import { CHART_CATEGORIES, type ChartCategory } from '../../lib/calc'

/** Fixed categorical order (validated reference palette); colour follows the entity, never its rank. */
export const SERIES = Array.from({ length: 7 }, (_, i) => `var(--series-${i + 1})`)
export const CAT_COLOR = Object.fromEntries(CHART_CATEGORIES.map((c, i) => [c, SERIES[i]])) as Record<ChartCategory, string>
export const vehicleColor = (index: number) => SERIES[index % SERIES.length]

export const axis = { stroke: 'var(--faint)', fontSize: 12, tickLine: false, axisLine: false } as const
export const grid = { stroke: 'var(--line)', strokeDasharray: '0', vertical: false } as const
