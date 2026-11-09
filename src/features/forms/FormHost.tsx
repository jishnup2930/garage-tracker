import { useId } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useUI, type FormKind } from '../../store/ui'
import { useGarage } from '../../store/AppStore'
import { useToast } from '../../components/ui/Toast'
import { deleteExpense, deleteFuel, deleteMaintenance, deletePaper, deleteReminder } from '../../store/ops'
import { VehicleForm } from './VehicleForm'
import { MaintenanceForm } from './MaintenanceForm'
import { FuelForm } from './FuelForm'
import { ExpenseForm } from './ExpenseForm'
import { ReminderForm } from './ReminderForm'
import { PaperForm } from './PaperForm'
import { OdometerForm } from './OdometerForm'
import { ScheduleForm } from './ScheduleForm'
import { useDeleteVehicle } from './useDeleteVehicle'

const TITLES: Record<FormKind, [string, string]> = {
  vehicle: ['Add a vehicle', 'Edit vehicle'],
  maintenance: ['Log maintenance', 'Edit maintenance'],
  fuel: ['Log a refill', 'Edit refill'],
  expense: ['Add an expense', 'Edit expense'],
  reminder: ['New reminder', 'Edit reminder'],
  paper: ['Add vehicle papers', 'Edit papers'],
  odometer: ['Update km', 'Update km'],
  schedule: ['Usual service reminders', 'Usual service reminders'],
}
const SAVE: Record<FormKind, string> = { vehicle: 'Save vehicle', maintenance: 'Save maintenance', fuel: 'Save refill', expense: 'Save expense', reminder: 'Save reminder', paper: 'Save papers', odometer: 'Save reading', schedule: 'Add reminders' }

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
    ? ({ vehicle: data.vehicles, maintenance: data.maintenance, fuel: data.fuel, expense: data.expenses, reminder: data.reminders, paper: data.papers, odometer: [], schedule: [] } as Record<FormKind, { id: string }[]>)[form.kind].find((x) => x.id === form.id)
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
    const fn = { maintenance: deleteMaintenance, fuel: deleteFuel, expense: deleteExpense, reminder: deleteReminder, paper: deletePaper }[form.kind as 'maintenance']
    if (update((d) => fn(d, rec.id))) done('Deleted')
  }

  const k = form?.kind
  // Electric vehicles are charged, not refuelled. Based on the vehicle the form opens with.
  const fuelVid = (rec as { vehicleId?: string } | undefined)?.vehicleId ?? form?.vehicleId ?? (data.vehicles.length === 1 ? data.vehicles[0].id : undefined)
  const charging = k === 'fuel' && data.vehicles.find((v) => v.id === fuelVid)?.fuelType === 'Electric'
  return (
    <Modal
      open={!!form}
      onClose={closeForm}
      size={k === 'vehicle' || k === 'maintenance' ? 'lg' : 'md'}
      title={needsVehicle ? 'Add a vehicle first' : charging ? (editing ? 'Edit charge' : 'Log a charge') : k ? TITLES[k][editing ? 1 : 0] : ''}
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
              {k === 'schedule' ? 'Not now' : 'Cancel'}
            </Button>
            <Button type="submit" form={formId}>
              {charging ? 'Save charge' : k ? SAVE[k] : 'Save'}
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
          onSaved={(v) => {
            if (editing) return done('Vehicle updated')
            toast.success(`${v.nickname} is in your garage`)
            openForm({ kind: 'schedule', vehicleId: v.id }) // offer the usual service reminders straight away
          }}
        />
      ) : form?.kind === 'maintenance' ? (
        <MaintenanceForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Maintenance updated' : `Nice work${name ? `, ${name}` : ''}!`, editing ? undefined : 'Your vehicle is taken care of.')} />
      ) : form?.kind === 'fuel' ? (
        <FuelForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(charging ? (editing ? 'Charge updated' : 'Charge logged') : editing ? 'Refill updated' : 'Refill logged')} />
      ) : form?.kind === 'expense' ? (
        <ExpenseForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Expense updated' : 'Expense added')} />
      ) : form?.kind === 'reminder' ? (
        <ReminderForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Reminder updated' : 'Reminder set', editing ? undefined : "We'll give you a heads-up when it's close.")} />
      ) : form?.kind === 'paper' ? (
        <PaperForm key={form.id ?? 'new'} formId={formId} record={rec as never} vehicleId={form.vehicleId} onSaved={() => done(editing ? 'Papers updated' : 'Papers saved', editing ? undefined : "We'll remind you before they expire.")} />
      ) : form?.kind === 'odometer' ? (
        <OdometerForm key={form.vehicleId ?? 'any'} formId={formId} vehicleId={form.vehicleId} onSaved={() => done('Reading saved')} />
      ) : form?.kind === 'schedule' ? (
        <ScheduleForm key={form.vehicleId ?? 'any'} formId={formId} vehicleId={form.vehicleId} onSaved={(n) => done(n ? `${n} ${n === 1 ? 'reminder' : 'reminders'} added` : 'Nothing new to add')} />
      ) : null}
    </Modal>
  )
}
