import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FUEL_TYPES, type FuelEntry } from '../../types'
import { Field, Input, Select, Toggle } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'
import { saveFuel } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { round2, todayStr } from '../../lib/calc'
import { money, units } from '../../lib/format'
import { optText, reqDate, reqNum, str, toNum, toOpt } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const schema = z.object({
  vehicleId: z.string().min(1, 'Choose a vehicle'),
  date: reqDate('Date').refine((v) => v <= todayStr(), 'Date cannot be in the future'),
  fuelType: z.enum(FUEL_TYPES),
  odometer: reqNum('Odometer reading'),
  quantity: reqNum('Quantity').refine((v) => Number(v) > 0, 'Quantity must be more than 0'),
  pricePerUnit: reqNum('Price').refine((v) => Number(v) > 0, 'Price must be more than 0'),
  isFullTank: z.boolean(),
  fuelStation: optText,
  notes: optText,
})
type Values = z.infer<typeof schema>

export function FuelForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: FuelEntry; vehicleId?: string; onSaved: (f: FuelEntry) => void }) {
  const { data, update } = useGarage()
  const initial = data.vehicles.find((v) => v.id === (record?.vehicleId ?? vehicleId)) ?? (data.vehicles.length === 1 ? data.vehicles[0] : undefined)
  const u = units(data.settings)
  const lastPrice = initial ? [...data.fuel].filter((f) => f.vehicleId === initial.id).sort((a, b) => b.date.localeCompare(a.date))[0]?.pricePerUnit : undefined

  const { register, handleSubmit, control, watch, setValue, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initial?.id ?? '',
      date: record?.date ?? todayStr(),
      fuelType: record?.fuelType ?? initial?.fuelType ?? 'Petrol',
      odometer: str(record?.odometer ?? (initial ? initial.currentOdometer || '' : '')),
      quantity: str(record?.quantity),
      pricePerUnit: str(record?.pricePerUnit ?? lastPrice),
      isFullTank: record?.isFullTank ?? true,
      fuelStation: record?.fuelStation ?? '',
      notes: record?.notes ?? '',
    },
  })
  const [vid, fuelType, qty, price] = watch(['vehicleId', 'fuelType', 'quantity', 'pricePerUnit'])
  const total = round2((Number(qty) || 0) * (Number(price) || 0))
  const unit = u.volume(fuelType)

  // Switching vehicle picks up its fuel type.
  useEffect(() => {
    if (record) return
    const v = data.vehicles.find((x) => x.id === vid)
    if (v) setValue('fuelType', v.fuelType)
  }, [vid, record, data.vehicles, setValue])

  const submit = (v: Values) => {
    const odo = toNum(v.odometer)
    const others = data.fuel.filter((f) => f.vehicleId === v.vehicleId && f.id !== record?.id)
    if (others.some((f) => f.date === v.date && f.odometer === odo && f.quantity === toNum(v.quantity)))
      return setError('odometer', { message: 'This looks like a duplicate of a refill you already logged.' })
    const before = others.filter((f) => f.date < v.date).sort((a, b) => b.odometer - a.odometer)[0]
    if (before && odo < before.odometer) return setError('odometer', { message: `Lower than your earlier refill (${before.odometer.toLocaleString('en-IN')} ${u.distance}). Check the reading or date.` })
    const after = others.filter((f) => f.date > v.date).sort((a, b) => a.odometer - b.odometer)[0]
    if (after && odo > after.odometer) return setError('odometer', { message: `Higher than a later refill (${after.odometer.toLocaleString('en-IN')} ${u.distance}). Check the reading or date.` })

    const next: FuelEntry = {
      ...(record ?? { id: uid(), createdAt: nowIso() }),
      vehicleId: v.vehicleId,
      date: v.date,
      fuelType: v.fuelType,
      odometer: odo,
      quantity: toNum(v.quantity),
      pricePerUnit: toNum(v.pricePerUnit),
      totalCost: round2(toNum(v.quantity) * toNum(v.pricePerUnit)),
      isFullTank: v.isFullTank,
      fuelStation: toOpt(v.fuelStation),
      notes: toOpt(v.notes),
    }
    if (update((d) => saveFuel(d, next))) onSaved(next)
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle" error={errors.vehicleId?.message}>
          {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
        </Field>
        <Field label="Date" error={errors.date?.message}>
          {(p) => <Input {...p} type="date" max={todayStr()} {...register('date')} />}
        </Field>
        <Field label="Fuel type">
          {(p) => (
            <Select {...p} {...register('fuelType')}>
              {FUEL_TYPES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Odometer" error={errors.odometer?.message}>
          {(p) => <Input {...p} inputMode="numeric" suffix={u.distance} {...register('odometer')} />}
        </Field>
        <Field label={fuelType === 'Electric' ? 'Energy added' : 'Quantity'} error={errors.quantity?.message}>
          {(p) => <Input {...p} inputMode="decimal" suffix={unit} placeholder="0" {...register('quantity')} />}
        </Field>
        <Field label={`Price per ${unit}`} error={errors.pricePerUnit?.message}>
          {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder="0" {...register('pricePerUnit')} />}
        </Field>
      </div>
      <div className="flex items-baseline justify-between rounded-2xl bg-surface-2 px-4 py-3" aria-live="polite">
        <span className="text-sm text-muted">Total cost</span>
        <span className="font-display text-2xl font-semibold tabular">{money(total, data.settings.currency, { decimals: true })}</span>
      </div>
      <Controller
        control={control}
        name="isFullTank"
        render={({ field }) => (
          <Toggle checked={field.value} onChange={field.onChange} label={fuelType === 'Electric' ? 'Charged to full' : 'Filled the tank'} description="Mileage is worked out between two full fills, so this keeps it accurate." />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fuelType === 'Electric' ? 'Charging point' : 'Fuel station'} optional error={errors.fuelStation?.message}>
          {(p) => <Input {...p} {...register('fuelStation')} />}
        </Field>
        <Field label="Notes" optional error={errors.notes?.message}>
          {(p) => <Input {...p} {...register('notes')} />}
        </Field>
      </div>
    </form>
  )
}
