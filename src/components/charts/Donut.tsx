import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useFormat } from '../../hooks/useFormat'
import { ChartTooltip } from './ChartTooltip'

/** Share breakdown with a ranked, labelled list beside it so values are never colour-only. */
export function Donut<T extends { name: string; value: number }>({ data, colorOf }: { data: T[]; colorOf: (d: T) => string }) {
  const f = useFormat()
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
      <div className="mx-auto size-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={data.length > 1 ? 1.5 : 0} stroke="var(--surface)" strokeWidth={2} animationDuration={500}>
              {data.map((d) => (
                <Cell key={d.name} fill={colorOf(d)} />
              ))}
            </Pie>
            <Tooltip content={(p) => <ChartTooltip {...(p as object)} fmt={f.money} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colorOf(d) }} />
            <span className="flex-1 truncate text-muted">{d.name}</span>
            <span className="font-semibold tabular">{f.money(d.value)}</span>
            <span className="w-10 text-right text-xs text-faint tabular">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
