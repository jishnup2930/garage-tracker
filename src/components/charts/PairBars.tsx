import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip, Legend } from './ChartTooltip'
import { CAT_COLOR, axis, grid } from './theme'

/** Fuel and maintenance side by side per month (same scale, one axis). */
export function PairBars({ data, fmt, tickFmt, height = 240 }: { data: { label: string; Fuel: number; Maintenance: number }[]; fmt: (n: number) => string; tickFmt: (n: number) => string; height?: number }) {
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Fuel versus maintenance spending by month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={52} tickFormatter={tickFmt} />
            <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => <ChartTooltip {...(p as object)} fmt={fmt} hideZero={false} />} />
            <Bar dataKey="Fuel" fill={CAT_COLOR.Fuel} radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={500} />
            <Bar dataKey="Maintenance" fill={CAT_COLOR.Maintenance} radius={[4, 4, 0, 0]} maxBarSize={14} animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3">
        <Legend items={[{ label: 'Fuel', color: CAT_COLOR.Fuel }, { label: 'Maintenance', color: CAT_COLOR.Maintenance }]} />
      </div>
    </div>
  )
}
