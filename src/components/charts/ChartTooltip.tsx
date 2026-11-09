import type { TooltipContentProps } from 'recharts'

type Fmt = (n: number) => string

/** Tooltip in text tokens; the coloured swatch carries series identity. */
export function ChartTooltip({ active, payload, label, fmt, hideZero = true }: Partial<TooltipContentProps<number, string>> & { fmt: Fmt; hideZero?: boolean }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => !hideZero || Number(p.value) !== 0)
  const total = rows.reduce((a, p) => a + Number(p.value || 0), 0)
  return (
    <div className="min-w-40 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-soft">
      {label != null && <p className="mb-1.5 font-semibold text-fg">{label}</p>}
      <ul className="space-y-1">
        {rows.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color || (p.payload as { fill?: string })?.fill }} />
            <span className="flex-1 text-muted">{p.name}</span>
            <span className="font-semibold text-fg tabular">{fmt(Number(p.value))}</span>
          </li>
        ))}
      </ul>
      {rows.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold">
          <span className="text-muted">Total</span>
          <span className="tabular">{fmt(total)}</span>
        </p>
      )}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
