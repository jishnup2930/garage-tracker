import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { axis, grid } from './theme'

type Row = Record<string, string | number | null>

/** Single-series trend line with crosshair tooltip. */
export function TrendLine({ data, x, y, name, color = 'var(--series-1)', fmt, tickFmt, height = 220 }: { data: Row[]; x: string; y: string; name: string; color?: string; fmt: (n: number) => string; tickFmt?: (n: number) => string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`${name} trend, ${data.length} points`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey={x} {...axis} minTickGap={24} />
          <YAxis {...axis} width={52} domain={['auto', 'auto']} tickFormatter={tickFmt ?? fmt} />
          <Tooltip cursor={{ stroke: 'var(--faint)', strokeWidth: 1 }} content={(p) => <ChartTooltip {...(p as object)} fmt={fmt} />} />
          <Line type="monotone" dataKey={y} name={name} stroke={color} strokeWidth={2} dot={data.length < 24 ? { r: 3, fill: color, stroke: 'var(--surface)', strokeWidth: 2 } : false} activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} connectNulls animationDuration={500} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Single-series bars. */
export function SimpleBars({ data, x, y, name, color = 'var(--series-1)', fmt, tickFmt, height = 220, layout = 'horizontal' }: { data: Row[]; x: string; y: string; name: string; color?: string; fmt: (n: number) => string; tickFmt?: (n: number) => string; height?: number; layout?: 'horizontal' | 'vertical' }) {
  const vertical = layout === 'vertical'
  return (
    <div style={{ height }} role="img" aria-label={`${name}, ${data.length} bars`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" {...axis} tickFormatter={tickFmt ?? fmt} />
              <YAxis type="category" dataKey={x} {...axis} width={96} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} {...axis} minTickGap={8} />
              <YAxis {...axis} width={52} tickFormatter={tickFmt ?? fmt} />
            </>
          )}
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => <ChartTooltip {...(p as object)} fmt={fmt} />} />
          <Bar dataKey={y} name={name} fill={color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={vertical ? 22 : 36} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
