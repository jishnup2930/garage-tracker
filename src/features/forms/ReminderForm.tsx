import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LEAD_TIMES, REMINDER_CATEGORIES, type Reminder } from '../../types'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'
import { saveReminder } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { optDate, optNum, optText, str, toNum, toOpt, toOptNum } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

export const leadLabel = (d: number) => (d === 0 ? 'On the due date' : d === 1 ? '1 day before' : `${d} days before`)

const schema = z
  .object({
    title: z.string().trim().min(1, 'Give the reminder a title').max(60),
    vehicleId: z.string().min(1, 'Choose a vehicle'),
    category: z.enum(REMINDER_CATEGORIES),
    dueDate: optDate,
    dueOdometer: optNum,
    leadTime: z.string(),
    notes: optText,
  })
  .refine((v) => v.dueDate || v.dueOdometer, { path: ['dueDate'], message: 'Set a due date, an odometer reading, or both' })
type Values = z.infer<typeof schema>

export function ReminderForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: Reminder; vehicleId?: string; onSaved: (r: Reminder) => void }) {
  const { data, update } = useGarage()
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors, dirtyFields } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: record?.title ?? 'Oil change',
      vehicleId: record?.vehicleId ?? vehicleId ?? (data.vehicles.length === 1 ? data.vehicles[0].id : ''),
      category: record?.category ?? 'Oil change',
      dueDate: record?.dueDate ?? '',
      dueOdometer: str(record?.dueOdometer),
      leadTime: String(record?.leadTime ?? data.settings.defaultLeadTime),
      notes: record?.notes ?? '',
    },
  })
  const vehicle = data.vehicles.find((v) => v.id === watch('vehicleId'))

  const submit = (v: Values) => {
    const dueDate = toOpt(v.dueDate)
    const dueOdometer = toOptNum(v.dueOdometer)
    const targetChanged = !record || record.dueDate !== dueDate || record.dueOdometer !== dueOdometer
    const next: Reminder = {
      ...(record ?? { id: uid(), createdAt: nowIso(), notifiedKeys: [], status: 'active' }),
      title: v.title,
      vehicleId: v.vehicleId,
      category: v.category,
      dueDate,
      dueOdometer,
      leadTime: toNum(v.leadTime),
      notes: toOpt(v.notes),
      // A new due target re-opens the reminder and clears any snooze.
      ...(targetChanged && record ? { status: 'active' as const, completedAt: undefined, snoozedUntil: undefined } : {}),
    }
    if (update((d) => saveReminder(d, next))) onSaved(next)
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          {(p) => (
            <Select
              {...p}
              {...register('category', {
                onChange: (e) => {
                  if (!dirtyFields.title || !getValues('title')) setValue('title', e.target.value === 'Custom' ? '' : e.target.value)
                },
              })}
            >
              {REMINDER_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Title" error={errors.title?.message}>
          {(p) => <Input {...p} {...register('title')} />}
        </Field>
        <Field label="Vehicle" error={errors.vehicleId?.message} className="sm:col-span-2">
          {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
        </Field>
        <Field label="Due date" optional error={errors.dueDate?.message}>
          {(p) => <Input {...p} type="date" {...register('dueDate')} />}
        </Field>
        <Field label="Due at odometer" optional error={errors.dueOdometer?.message} hint={vehicle ? `Now at ${vehicle.currentOdometer.toLocaleString('en-IN')} ${data.settings.distanceUnit}` : undefined}>
          {(p) => <Input {...p} inputMode="numeric" suffix={data.settings.distanceUnit} {...register('dueOdometer')} />}
        </Field>
        <Field label="Remind me" className="sm:col-span-2">
          {(p) => (
            <Select {...p} {...register('leadTime')}>
              {LEAD_TIMES.map((d) => (
                <option key={d} value={d}>
                  {leadLabel(d)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Notes" optional error={errors.notes?.message}>
        {(p) => <Textarea {...p} {...register('notes')} />}
      </Field>
    </form>
  )
}
