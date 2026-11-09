import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addMonths, addYears, parseISO } from 'date-fns'
import { DEFAULT_MAINTENANCE_CATEGORIES, type Maintenance } from '../../types'
import { Field, Input, Select, Textarea, Toggle } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { useGarage } from '../../store/AppStore'
import { saveMaintenance } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { todayStr } from '../../lib/calc'
import { optDate, optNum, optText, reqDate, reqNum, str, toNum, toOpt, toOptNum } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const NEW_CAT = '__new__'

const schema = z
  .object({
    vehicleId: z.string().min(1, 'Choose a vehicle'),
    category: z.string().min(1, 'Choose a category'),
    customCategory: z.string().trim().max(40),
    date: reqDate('Date').refine((v) => v <= todayStr(), 'Maintenance date cannot be in the future'),
    odometer: reqNum('Odometer reading'),
    amount: reqNum('Amount'),
    serviceProvider: optText,
    description: optText,
    notes: optText,
    receipt: z.string().optional(),
    scheduleNext: z.boolean(),
    nextAfterDistance: optNum,
    nextDueDate: optDate,
  })
  .superRefine((v, ctx) => {
    if (v.category === NEW_CAT && !v.customCategory) ctx.addIssue({ code: 'custom', path: ['customCategory'], message: 'Name your category' })
    if (!v.scheduleNext) return
    if (!v.nextAfterDistance && !v.nextDueDate) ctx.addIssue({ code: 'custom', path: ['nextDueDate'], message: 'Set a distance, a date, or both' })
    if (v.nextAfterDistance && Number(v.nextAfterDistance) <= 0) ctx.addIssue({ code: 'custom', path: ['nextAfterDistance'], message: 'Distance must be more than 0' })
    if (v.nextDueDate && v.date && v.nextDueDate <= v.date) ctx.addIssue({ code: 'custom', path: ['nextDueDate'], message: 'Next date must be after the service date' })
  })
type Values = z.infer<typeof schema>

export function MaintenanceForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: Maintenance; vehicleId?: string; onSaved: (m: Maintenance) => void }) {
  const { data, update } = useGarage()
  const categories = [...DEFAULT_MAINTENANCE_CATEGORIES.filter((c) => c !== 'Other'), ...data.customMaintenanceCategories, 'Other']
  const initialVehicle = data.vehicles.find((v) => v.id === (record?.vehicleId ?? vehicleId)) ?? (data.vehicles.length === 1 ? data.vehicles[0] : undefined)
  const [catOptions] = useState(() => (record && !categories.includes(record.category) ? [...categories, record.category] : categories))
  const unit = data.settings.distanceUnit

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initialVehicle?.id ?? '',
      category: record?.category ?? 'Engine oil change',
      customCategory: '',
      date: record?.date ?? todayStr(),
      odometer: str(record?.odometer ?? initialVehicle?.currentOdometer),
      amount: str(record?.amount),
      serviceProvider: record?.serviceProvider ?? '',
      description: record?.description ?? '',
      notes: record?.notes ?? '',
      receipt: record?.receipt,
      scheduleNext: record ? !!(record.nextDueDate || record.nextDueOdometer != null) : true,
      nextAfterDistance: record?.nextDueOdometer != null ? str(record.nextDueOdometer - record.odometer) : '',
      nextDueDate: record?.nextDueDate ?? '',
    },
  })
  const [category, scheduleNext, date, odometer, after] = watch(['category', 'scheduleNext', 'date', 'odometer', 'nextAfterDistance'])

  const submit = (v: Values) => {
    const cat = v.category === NEW_CAT ? v.customCategory : v.category
    const odo = toNum(v.odometer)
    const next: Maintenance = {
      ...(record ?? { id: uid(), createdAt: nowIso() }),
      vehicleId: v.vehicleId,
      category: cat,
      date: v.date,
      odometer: odo,
      amount: toNum(v.amount),
      serviceProvider: toOpt(v.serviceProvider),
      description: toOpt(v.description),
      notes: toOpt(v.notes),
      receipt: v.receipt,
      nextDueDate: v.scheduleNext ? toOpt(v.nextDueDate) : undefined,
      nextDueOdometer: v.scheduleNext && toOptNum(v.nextAfterDistance) ? odo + toNum(v.nextAfterDistance) : undefined,
    }
    const ok = update((d) => {
      const withCat = v.category === NEW_CAT && !d.customMaintenanceCategories.includes(cat) ? { ...d, customMaintenanceCategories: [...d.customMaintenanceCategories, cat] } : d
      return saveMaintenance(withCat, next, d.settings.defaultLeadTime)
    })
    if (ok) onSaved(next)
  }

  const preset = (fn: (d: Date) => Date) => setValue('nextDueDate', todayStr(fn(parseISO(date || todayStr()))), { shouldValidate: true })

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle" error={errors.vehicleId?.message}>
          {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
        </Field>
        <Field label="What was done" error={errors.category?.message}>
          {(p) => (
            <Select {...p} {...register('category')}>
              {catOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value={NEW_CAT}>New category…</option>
            </Select>
          )}
        </Field>
        {category === NEW_CAT && (
          <Field label="Category name" error={errors.customCategory?.message} className="sm:col-span-2">
            {(p) => <Input {...p} placeholder="e.g. Clutch overhaul" {...register('customCategory')} />}
          </Field>
        )}
        <Field label="Date" error={errors.date?.message}>
          {(p) => <Input {...p} type="date" max={todayStr()} {...register('date')} />}
        </Field>
        <Field label="Odometer" error={errors.odometer?.message}>
          {(p) => <Input {...p} inputMode="numeric" suffix={unit} {...register('odometer')} />}
        </Field>
        <Field label="Amount spent" error={errors.amount?.message}>
          {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder="0" {...register('amount')} />}
        </Field>
        <Field label="Garage or service provider" optional error={errors.serviceProvider?.message}>
          {(p) => <Input {...p} {...register('serviceProvider')} />}
        </Field>
      </div>
      <Field label="Description" optional error={errors.description?.message}>
        {(p) => <Input {...p} placeholder="e.g. Synthetic 5W-30, 3.5 L" {...register('description')} />}
      </Field>

      <div className="rounded-2xl border border-line p-4">
        <Controller control={control} name="scheduleNext" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Schedule the next one" description="We'll remind you when either the distance or the date comes up first." />} />
        {scheduleNext && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              label="After"
              optional
              error={errors.nextAfterDistance?.message}
              hint={after && odometer && Number(after) > 0 ? `Due at ${(Number(odometer) + Number(after)).toLocaleString('en-IN')} ${unit}` : undefined}
            >
              {(p) => <Input {...p} inputMode="numeric" suffix={unit} placeholder="e.g. 5000" {...register('nextAfterDistance')} />}
            </Field>
            <Field label="Or on" optional error={errors.nextDueDate?.message}>
              {(p) => (
                <div className="space-y-2">
                  <Input {...p} type="date" min={date} {...register('nextDueDate')} />
                  <div className="flex gap-1.5">
                    {[
                      ['3 months', (d: Date) => addMonths(d, 3)],
                      ['6 months', (d: Date) => addMonths(d, 6)],
                      ['1 year', (d: Date) => addYears(d, 1)],
                    ].map(([l, fn]) => (
                      <button key={l as string} type="button" onClick={() => preset(fn as (d: Date) => Date)} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold text-muted hover:text-fg">
                        +{l as string}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>
          </div>
        )}
      </div>

      <Field label="Notes" optional error={errors.notes?.message}>
        {(p) => <Textarea {...p} {...register('notes')} />}
      </Field>
      <Controller control={control} name="receipt" render={({ field }) => <ImagePicker label="Attach receipt" maxSize={1200} value={field.value} onChange={(v) => setValue('receipt', v)} />} />
    </form>
  )
}
