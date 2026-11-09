import { Plus, Car, Wrench, Fuel, Wallet, BellPlus } from 'lucide-react'
import { Menu } from '../ui/Menu'
import { Button } from '../ui/Button'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/cn'

export function QuickAdd({ compact, vehicleId }: { compact?: boolean; vehicleId?: string }) {
  const { openForm } = useUI()
  const i = 'size-4 text-muted'
  return (
    <Menu
      label="Quick add"
      up={compact}
      items={[
        { label: 'Log a refill', icon: <Fuel className={i} />, onSelect: () => openForm({ kind: 'fuel', vehicleId }) },
        { label: 'Log maintenance', icon: <Wrench className={i} />, onSelect: () => openForm({ kind: 'maintenance', vehicleId }) },
        { label: 'Add an expense', icon: <Wallet className={i} />, onSelect: () => openForm({ kind: 'expense', vehicleId }) },
        { label: 'New reminder', icon: <BellPlus className={i} />, onSelect: () => openForm({ kind: 'reminder', vehicleId }) },
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
