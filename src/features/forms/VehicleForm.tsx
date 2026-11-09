import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bike, Car, CarFront, Truck, Shapes, type LucideIcon } from 'lucide-react'
import { FUEL_TYPES, VEHICLE_TYPES, type Vehicle, type VehicleType } from '../../types'
import { Field, Input, Select } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { useGarage } from '../../store/AppStore'
import { saveVehicle } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { todayStr } from '../../lib/calc'
import { optDate, reqNum, str, toNum, toOpt } from './formUtils'
import { cn } from '../../lib/cn'

export const VEHICLE_ICON: Record<VehicleType, LucideIcon> = { Car, Motorcycle: Bike, Scooter: Bike, SUV: CarFront, Truck, Other: Shapes }

const schema = z.object({
  type: z.enum(VEHICLE_TYPES),
  brand: z.string().trim().min(1, 'Brand is required').max(40),
  model: z.string().trim().min(1, 'Model is required').max(40),
  registrationNumber: z.string().trim().max(20, 'That looks too long for a registration number'),
  fuelType: z.enum(FUEL_TYPES),
  currentOdometer: reqNum('Odometer reading'),
  purchaseDate: optDate.refine((v) => v === '' || v <= todayStr(), 'Purchase date cannot be in the future'),
  image: z.string().optional(),
})
type Values = z.infer<typeof schema>

/** Add/edit a vehicle. Rendered inside a modal or inline during onboarding; submit via `form={formId}`. */
export function VehicleForm({ formId, vehicle, onSaved }: { formId: string; vehicle?: Vehicle; onSaved: (v: Vehicle) => void }) {
  const { data, update } = useGarage()
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: vehicle?.type ?? 'Car',
      brand: vehicle?.brand ?? '',
      model: vehicle?.model ?? '',
      registrationNumber: vehicle?.registrationNumber ?? '',
      fuelType: vehicle?.fuelType ?? 'Petrol',
      currentOdometer: str(vehicle?.currentOdometer),
      purchaseDate: vehicle?.purchaseDate ?? '',
      image: vehicle?.image,
    },
  })
  const type = watch('type')
  const unit = data.settings.distanceUnit

  const submit = (v: Values) => {
    const ts = nowIso()
    const next: Vehicle = {
      ...(vehicle ?? { id: uid(), createdAt: ts }),
      nickname: `${v.brand} ${v.model}`, // no name field: the vehicle is labelled by brand + model
      type: v.type,
      brand: v.brand,
      model: v.model,
      registrationNumber: toOpt(v.registrationNumber)?.toUpperCase(),
      fuelType: v.fuelType,
      currentOdometer: toNum(v.currentOdometer),
      purchaseDate: toOpt(v.purchaseDate),
      image: v.image,
      updatedAt: ts,
    }
    if (update((d) => saveVehicle(d, next))) onSaved(next)
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">Type</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VEHICLE_TYPES.map((t) => {
            const Icon = VEHICLE_ICON[t]
            return (
              <label
                key={t}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-text',
                  type === t ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-faint hover:text-fg',
                )}
              >
                <input type="radio" value={t} className="sr-only" {...register('type')} />
                <Icon aria-hidden className="size-5" strokeWidth={1.7} />
                {t}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand" error={errors.brand?.message}>
          {(p) => <Input {...p} placeholder="e.g. Honda" {...register('brand')} />}
        </Field>
        <Field label="Model" error={errors.model?.message}>
          {(p) => <Input {...p} placeholder="e.g. City" {...register('model')} />}
        </Field>
        <Field label="Fuel" error={errors.fuelType?.message}>
          {(p) => (
            <Select {...p} {...register('fuelType')}>
              {FUEL_TYPES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Current odometer" error={errors.currentOdometer?.message}>
          {(p) => <Input {...p} inputMode="numeric" suffix={unit} placeholder="0" {...register('currentOdometer')} />}
        </Field>
        <Field label="Registration number" optional error={errors.registrationNumber?.message}>
          {(p) => <Input {...p} className="uppercase" placeholder="e.g. KA 01 AB 1234" {...register('registrationNumber')} />}
        </Field>
        <Field label="Purchase date" optional error={errors.purchaseDate?.message}>
          {(p) => <Input {...p} type="date" max={todayStr()} {...register('purchaseDate')} />}
        </Field>
      </div>
      <Controller control={control} name="image" render={({ field }) => <ImagePicker label="Add a photo" value={field.value} onChange={(v) => setValue('image', v, { shouldDirty: true })} />} />
    </form>
  )
}
