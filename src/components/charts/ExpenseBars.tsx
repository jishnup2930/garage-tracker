import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_CATEGORIES, expenseSeries } from '../../lib/calc'
import type { ChartRange, CostLine } from '../../types'
import { useFormat } from '../../hooks/useFormat'
import { CAT_COLOR, axis, grid } from './theme'
import { ChartTooltip, Legend } from './ChartTooltip'

/** Stacked spend by category over the chosen range. Only categories with spend are drawn and listed. */
export function ExpenseBars({ lines, range, height = 260 }: { lines: CostLine[]; range: ChartRange; height?: number }) {
  const f = useFormat()
  const rows = useMemo(() => expenseSeries(lines, range), [lines, range])
  const used = CHART_CATEGORIES.filter((c) => rows.some((r) => r[c] > 0))
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`Spending by category, ${rows.length} periods. Total ${f.money(rows.reduce((a, r) => a + r.total, 0))}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={range === '30d' ? '18%' : '28%'}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={14} />
            <YAxis {...axis} width={56} tickFormatter={(v) => f.moneyCompact(v)} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => <ChartTooltip {...(p as object)} fmt={f.money} />} />
            {used.map((c, i) => (
              <Bar key={c} dataKey={c} name={c} stackId="s" fill={CAT_COLOR[c]} stroke="var(--surface)" strokeWidth={1} radius={i === used.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={36} animationDuration={500} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {used.length > 0 && (
        <div className="mt-3">
          <Legend items={used.map((c) => ({ label: c, color: CAT_COLOR[c] }))} />
        </div>
      )}
    </div>
  )
}
