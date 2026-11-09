import type { Vehicle } from '../types'
import { VEHICLE_ICON } from '../features/forms/VehicleForm'
import { cn } from '../lib/cn'

export function VehicleThumb({ vehicle, className, iconClass }: { vehicle: Vehicle; className?: string; iconClass?: string }) {
  const Icon = VEHICLE_ICON[vehicle.type]
  return (
    <div className={cn('grid shrink-0 place-items-center overflow-hidden bg-surface-2 text-faint', className)}>
      {vehicle.image ? <img src={vehicle.image} alt={`${vehicle.nickname}`} className="size-full object-cover" /> : <Icon aria-hidden strokeWidth={1.3} className={cn('size-1/2', iconClass)} />}
    </div>
  )
}
