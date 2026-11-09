import { MoreVertical, Pencil, Wrench, Fuel, Wallet, Gauge } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Vehicle } from '../../types'
import type { VehicleSummary } from './summary'
import { VehicleThumb } from '../../components/VehicleThumb'
import { Plate } from '../../components/ui/Badge'
import { Menu } from '../../components/ui/Menu'
import { useUI } from '../../store/ui'
import { useFormat } from '../../hooks/useFormat'
import { NextDue } from './NextDue'

export function VehicleCard({ vehicle: v, summary: s }: { vehicle: Vehicle; summary?: VehicleSummary }) {
  const { openForm } = useUI()
  const f = useFormat()
  const i = 'size-4 text-muted'
  return (
    <motion.article layout className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line bg-surface transition-[border-color,box-shadow] hover:border-faint/70 hover:shadow-soft">
      <a href={`#/garage/${v.id}`} className="absolute inset-0 z-0 rounded-[22px]" aria-label={`View ${v.nickname}`} />
      <div className="relative">
        <VehicleThumb vehicle={v} className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.02]" iconClass="size-16" />
        {v.demo && <span className="absolute top-3 left-3 rounded-full bg-console/80 px-2 py-0.5 text-[11px] font-semibold text-console-fg">Demo</span>}
      </div>
      <div className="pointer-events-none relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-semibold tracking-tight">{v.nickname}</h3>
            <p className="truncate text-sm text-muted">
              {v.type}, {v.fuelType}
            </p>
          </div>
          <div className="pointer-events-auto -mt-1 -mr-2">
            <Menu
              label={`Actions for ${v.nickname}`}
              items={[
                { label: 'Log a refill', icon: <Fuel className={i} />, onSelect: () => openForm({ kind: 'fuel', vehicleId: v.id }) },
                { label: 'Log maintenance', icon: <Wrench className={i} />, onSelect: () => openForm({ kind: 'maintenance', vehicleId: v.id }) },
                { label: 'Add an expense', icon: <Wallet className={i} />, onSelect: () => openForm({ kind: 'expense', vehicleId: v.id }) },
                { label: 'Edit vehicle', icon: <Pencil className={i} />, onSelect: () => openForm({ kind: 'vehicle', id: v.id }) },
              ]}
              trigger={(p) => (
                <button {...p} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                  <MoreVertical className="size-[18px]" />
                </button>
              )}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {v.registrationNumber && <Plate>{v.registrationNumber}</Plate>}
          <span className="flex items-center gap-1">
            <Gauge aria-hidden className="size-3.5" />
            <span className="tabular">{f.dist(v.currentOdometer)}</span>
          </span>
          <span>{v.fuelType}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Next due</dt>
            <dd className="mt-0.5">
              <NextDue r={s?.next} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Last service</dt>
            <dd className="mt-0.5 truncate font-medium">{s?.lastService ? f.date(s.lastService.date) : <span className="font-normal text-faint">None yet</span>}</dd>
          </div>
          <div className="col-span-2 flex items-baseline justify-between">
            <dt className="text-xs text-muted">Spent in total</dt>
            <dd className="font-display text-lg font-semibold tabular">{f.money(s?.total ?? 0)}</dd>
          </div>
        </dl>
      </div>
    </motion.article>
  )
}
