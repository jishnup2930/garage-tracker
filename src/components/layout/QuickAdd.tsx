import { Plus, Car, Wrench, Fuel, Wallet, BellPlus, FileText, Gauge } from 'lucide-react'
import { Menu } from '../ui/Menu'
import { Button } from '../ui/Button'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/cn'

/** `align`: which edge of the button the menu lines up with. Use 'left' when the button sits at the left of the screen. */
export function QuickAdd({ compact, vehicleId, align }: { compact?: boolean; vehicleId?: string; align?: 'left' | 'right' }) {
  const { openForm } = useUI()
  const i = 'size-4 text-muted'
  return (
    <Menu
      label="Quick add"
      up={compact}
      align={align}
      items={[
        { label: 'Log a refill', icon: <Fuel className={i} />, onSelect: () => openForm({ kind: 'fuel', vehicleId }) },
        { label: 'Log maintenance', icon: <Wrench className={i} />, onSelect: () => openForm({ kind: 'maintenance', vehicleId }) },
        { label: 'Add an expense', icon: <Wallet className={i} />, onSelect: () => openForm({ kind: 'expense', vehicleId }) },
        { label: 'New reminder', icon: <BellPlus className={i} />, onSelect: () => openForm({ kind: 'reminder', vehicleId }) },
        { label: 'Update km', icon: <Gauge className={i} />, onSelect: () => openForm({ kind: 'odometer', vehicleId }) },
        { label: 'Add vehicle papers', icon: <FileText className={i} />, onSelect: () => openForm({ kind: 'paper', vehicleId }) },
        { label: 'Add a vehicle', icon: <Car className={i} />, onSelect: () => openForm({ kind: 'vehicle' }) },
      ]}
      trigger={(p) => (
        <Button {...p} size={compact ? 'icon' : 'md'} icon={<Plus className={cn('size-[18px]')} strokeWidth={2.4} />}>
          {!compact && 'Add'}
        </Button>
      )}
    />
  )
}
