import { useId } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useUI, type FormKind } from '../../store/ui'
import { useGarage } from '../../store/AppStore'
import { useToast } from '../../components/ui/Toast'
import { deleteExpense, deleteFuel, deleteMaintenance, deleteReminder } from '../../store/ops'
import { VehicleForm } from './VehicleForm'
import { MaintenanceForm } from './MaintenanceForm'
import { FuelForm } from './FuelForm'
import { ExpenseForm } from './ExpenseForm'
import { ReminderForm } from './ReminderForm'
import { useDeleteVehicle } from './useDeleteVehicle'

const TITLES: Record<FormKind, [string, string]> = {
  vehicle: ['Add a vehicle', 'Edit vehicle'],
  maintenance: ['Log maintenance', 'Edit maintenance'],
  fuel: ['Log a refill', 'Edit refill'],
  expense: ['Add an expense', 'Edit expense'],
  reminder: ['New reminder', 'Edit reminder'],
}
const SAVE: Record<FormKind, string> = { vehicle: 'Save vehicle', maintenance: 'Save maintenance', fuel: 'Save refill', expense: 'Save expense', reminder: 'Save reminder' }

/** One modal that hosts every add/edit form, so any screen can open any form. */
export function FormHost() {
  const { form, closeForm, confirm, openForm } = useUI()
  const { data, update } = useGarage()
  const toast = useToast()
  const formId = useId()
  const removeVehicle = useDeleteVehicle()
  const name = data.user?.firstName

  const needsVehicle = form && form.kind !== 'vehicle' && data.vehicles.length === 0
  const rec = form?.id
    ? { vehicle: data.vehicles, maintenance: data.maintenance, fuel: data.fuel, expense: data.expenses, reminder: data.reminders }[form.kind].find((x) => x.id === form.id)
    : undefined
  const editing = !!rec

  const done = (title: string, message?: string) => {
    closeForm()
    toast.success(title, message)
  }

  const onDelete = async () => {
    if (!form || !rec) return
    if (form.kind === 'vehicle') {
      if (await removeVehicle(rec.id)) closeForm()
      return
    }
    const ok = await confirm({ title: 'Delete this record?', message: 'It will be removed from your history and totals. This cannot be undone.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    const fn = { maintenance: deleteMaintenance, fuel: deleteFuel, expense: deleteExpense, reminder: deleteReminder }[form.kind]
    if (update((d) => fn(d, rec.id))) done('Deleted')
  }

  const k = form?.kind
  return (
    <Modal
      open={!!form}
      onClose={closeForm}
      size={k === 'vehicle' || k === 'maintenance' ? 'lg' : 'md'}
      title={needsVehicle ? 'Add a vehicle first' : k ? TITLES[k][editing ? 1 : 0] : ''}
      footer={
        needsVehicle ? (
          <Button variant="ghost" onClick={closeForm}>Cancel</Button>
        ) : (
          <>
            {editing && (
              <Button variant="ghost" className="mr-auto text-danger hover:text-danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" form={formId}>
              {k ? SAVE[k] : 'Save'}
            </Button>
          </>
        )
      }
    >
      {needsVehicle ? (
        <div className="space-y-4 text-sm text-muted">
          <p>Records belong to a vehicle, so your garage needs at least one before you can log anything.</p>
          <Button variant="dark" onClick={() => openForm({ kind: 'vehicle' })}>
            Add a vehicle
          </Button>
        </div>
      ) : form?.kind === 'vehicle' ? (
        <VehicleForm
          key={form.id ?? 'new'}
          formId={formId}
          vehicle={rec as never}
          onSaved={(v) => done(editing ? 'Vehicle updated' : `${v.nickname} is in your garage`, editing ? undefined : 'Log maintenance or a refill whenever you are ready.')}
        />
      ) : form?.kind === 'maintenance' ? (
        <MaintenanceForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Maintenance updated' : `Nice work${name ? `, ${name}` : ''}!`, editing ? undefined : 'Your vehicle is taken care of.')} />
      ) : form?.kind === 'fuel' ? (
        <FuelForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Refill updated' : 'Refill logged')} />
      ) : form?.kind === 'expense' ? (
        <ExpenseForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Expense updated' : 'Expense added')} />
      ) : form?.kind === 'reminder' ? (
        <ReminderForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Reminder updated' : 'Reminder set', editing ? undefined : "We'll give you a heads-up when it's close.")} />
      ) : null}
    </Modal>
  )
}
