import { createElement } from 'react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useToast } from '../../components/ui/Toast'
import { deleteVehicle, relatedCounts } from '../../store/ops'
import { plural } from '../../lib/format'

/** Confirms, then deletes a vehicle and every record linked to it. Resolves true if deleted. */
export function useDeleteVehicle() {
  const { data, update } = useGarage()
  const { confirm } = useUI()
  const toast = useToast()
  return async (id: string) => {
    const v = data.vehicles.find((x) => x.id === id)
    if (!v) return false
    const c = relatedCounts(data, id)
    const parts = [plural(c.maintenance, 'maintenance record'), plural(c.fuel, 'refill'), plural(c.expenses, 'expense'), plural(c.reminders, 'reminder')]
    const ok = await confirm({
      title: `Delete ${v.nickname}?`,
      message: createElement('p', null, `This also deletes everything linked to it: ${parts.join(', ')}. Export a backup first from Settings if you might want them later. This cannot be undone.`),
      confirmLabel: 'Delete vehicle and records',
      danger: true,
    })
    if (!ok) return false
    if (update((d) => deleteVehicle(d, id))) {
      toast.success(`${v.nickname} was removed`)
      return true
    }
    return false
  }
}
