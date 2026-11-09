import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FUEL_TYPES, type FuelEntry, type Vehicle } from '../../types'
import { Field, Input, Toggle } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'
import { saveFuel } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { round2, todayStr } from '../../lib/calc'
import { money, units } from '../../lib/format'
import { optNum, optText, reqDate, reqNum, str, toNum, toOpt } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const schema = z.object({
  vehicleId: z.string().min(1, 'Choose a vehicle'),
  date: reqDate('Date').refine((v) => v <= todayStr(), 'Date cannot be in the future'),
  fuelType: z.enum(FUEL_TYPES),
  odometer: reqNum('Odometer reading'),
  amount: optNum,
  pricePerUnit: optNum,
  /** Electric charges are logged by battery %, other refills by money. */
  byBattery: z.boolean(),
  batteryFrom: optNum,
  batteryTo: optNum,
  isFullTank: z.boolean(),
  fuelStation: optText,
  notes: optText,
}).superRefine((v, ctx) => {
  const bad = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (v.byBattery) {
    if (v.batteryFrom === '') bad('batteryFrom', 'Battery level is required')
    else if (Number(v.batteryFrom) > 100) bad('batteryFrom', 'Enter a level from 0 to 100')
    if (v.batteryTo === '') bad('batteryTo', 'Battery level is required')
    else if (Number(v.batteryTo) > 100) bad('batteryTo', 'Enter a level from 0 to 100')
    else if (v.batteryFrom !== '' && Number(v.batteryTo) <= Number(v.batteryFrom)) bad('batteryTo', 'Should be higher than before charging')
  } else {
    if (!(Number(v.amount) > 0)) bad('amount', v.amount === '' ? 'Amount is required' : 'Amount must be more than 0')
    if (!(Number(v.pricePerUnit) > 0)) bad('pricePerUnit', v.pricePerUnit === '' ? 'Price is required' : 'Price must be more than 0')
  }
})
type Values = z.infer<typeof schema>

/** Litres (or kWh) bought, from what was paid. Kept to 3 decimals. */
const qtyOf = (amount: number, price: number) => (price > 0 ? Math.round((amount / price) * 1000) / 1000 : 0)

/**
 * A charge logged by battery %: kWh needs the vehicle's battery size; cost is what was paid,
 * else an estimate from the home electricity rate, else 0 (unknown).
 */
function chargeOf(v: Vehicle | undefined, from: number, to: number, paid: number) {
  const pct = Math.max(0, (to || 0) - (from || 0))
  const kwh = v?.batteryKwh ? Math.round((pct / 100) * v.batteryKwh * 1000) / 1000 : 0
  const rate = v?.electricityRate ?? 0
  const cost = paid > 0 ? round2(paid) : round2(kwh * rate)
  const price = paid > 0 ? (kwh ? round2(paid / kwh) : 0) : rate
  return { pct, kwh, cost, price, estimated: !(paid > 0) && cost > 0 }
}

/** Refill form. People fill by money (₹500), so we ask for the amount and work out the litres. */
export function FuelForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: FuelEntry; vehicleId?: string; onSaved: (f: FuelEntry) => void }) {
  const { data, update } = useGarage()
  const initial = data.vehicles.find((v) => v.id === (record?.vehicleId ?? vehicleId)) ?? (data.vehicles.length === 1 ? data.vehicles[0] : undefined)
  const u = units(data.settings)
  // Last price paid for this vehicle, else for any vehicle on the same fuel.
  const latest = [...data.fuel].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)
  const lastPrice = (id: string, fuel: string) => (latest.find((f) => f.vehicleId === id) ?? latest.find((f) => f.fuelType === fuel))?.pricePerUnit
  // Default the toggle to how this vehicle was last filled, so full-tank users keep exact mileage.
  const lastFull = (id?: string) => latest.find((f) => f.vehicleId === id)?.isFullTank ?? false
  // Old electric records logged by money stay that way when edited.
  const byBatteryFor = (fuel?: string) => fuel === 'Electric' && !(record && record.batteryTo == null)

  const { register, handleSubmit, control, watch, setValue, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initial?.id ?? '',
      date: record?.date ?? todayStr(),
      fuelType: record?.fuelType ?? initial?.fuelType ?? 'Petrol',
      odometer: str(record?.odometer ?? (initial ? initial.currentOdometer || '' : '')),
      amount: record && !(record.batteryTo != null && !record.totalCost) ? str(record.totalCost) : '',
      byBattery: byBatteryFor(record?.fuelType ?? initial?.fuelType),
      batteryFrom: str(record?.batteryFrom),
      batteryTo: str(record?.batteryTo ?? 100),
      pricePerUnit: str(record?.pricePerUnit ?? (initial ? lastPrice(initial.id, initial.fuelType) : undefined)),
      isFullTank: record?.isFullTank ?? lastFull(initial?.id),
      fuelStation: record?.fuelStation ?? '',
      notes: record?.notes ?? '',
    },
  })
  const [vid, fuelType, amount, price, byBattery, bFrom, bTo] = watch(['vehicleId', 'fuelType', 'amount', 'pricePerUnit', 'byBattery', 'batteryFrom', 'batteryTo'])
  const qty = qtyOf(Number(amount) || 0, Number(price) || 0)
  const unit = u.volume(fuelType)
  const electric = fuelType === 'Electric'
  const vehicle = data.vehicles.find((x) => x.id === vid)
  // A remembered price shows as one line; the box opens only when there's no price yet, on tap, or on an error.
  const [priceOpen, setPriceOpen] = useState(() => !price)
  const showPrice = priceOpen || !!errors.pricePerUnit
  const charge = chargeOf(vehicle, Number(bFrom), Number(bTo), amount === '' ? 0 : Number(amount))

  // Switching vehicle picks up its fuel type and, for a new refill, its last price and fill habit.
  useEffect(() => {
    const v = data.vehicles.find((x) => x.id === vid)
    if (!v) return
    setValue('fuelType', v.fuelType)
    setValue('byBattery', byBatteryFor(v.fuelType))
    if (record) return
    const p = lastPrice(v.id, v.fuelType)
    setValue('pricePerUnit', p ? String(p) : '') // never carry a petrol price over to an EV
    setPriceOpen(!p)
    setValue('isFullTank', lastFull(v.id))
    // Only when the vehicle changes, so a typed price is not overwritten.
  }, [vid])

  const submit = (v: Values) => {
    const odo = toNum(v.odometer)
    let total: number, price: number, quantity: number, isFullTank = v.isFullTank
    let batteryFrom: number | undefined, batteryTo: number | undefined
    if (v.byBattery) {
      batteryFrom = toNum(v.batteryFrom)
      batteryTo = toNum(v.batteryTo)
      const c = chargeOf(data.vehicles.find((x) => x.id === v.vehicleId), batteryFrom, batteryTo, v.amount === '' ? 0 : toNum(v.amount))
      ;({ cost: total, price, kwh: quantity } = c)
      isFullTank = batteryTo >= 100
    } else {
      total = round2(toNum(v.amount))
      price = toNum(v.pricePerUnit)
      // Keep the stored quantity on edits that don't touch amount or price.
      quantity = record && record.totalCost === total && record.pricePerUnit === price ? record.quantity : qtyOf(total, price)
      // A zero quantity would fail validation on the next load; catch the typo here.
      if (!(quantity > 0)) return setError('pricePerUnit', { message: 'Check the price. This works out to almost no fuel.' })
    }
    const others = data.fuel.filter((f) => f.vehicleId === v.vehicleId && f.id !== record?.id)
    if (others.some((f) => f.date === v.date && f.odometer === odo && f.totalCost === total))
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
      quantity,
      pricePerUnit: price,
      totalCost: total,
      batteryFrom,
      batteryTo,
      isFullTank,
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
        {byBattery ? (
          <>
            <Field label="Battery before charging" error={errors.batteryFrom?.message}>
              {(p) => <Input {...p} inputMode="numeric" suffix="%" placeholder="e.g. 20" autoFocus={!record} {...register('batteryFrom')} />}
            </Field>
            <Field label="Battery after charging" error={errors.batteryTo?.message}>
              {(p) => <Input {...p} inputMode="numeric" suffix="%" {...register('batteryTo')} />}
            </Field>
            <Field label="Odometer" error={errors.odometer?.message}>
              {(p) => <Input {...p} inputMode="numeric" suffix={u.distance} {...register('odometer')} />}
            </Field>
            <Field label="Amount paid" optional hint="Leave blank for home charging." error={errors.amount?.message}>
              {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder="e.g. 60" {...register('amount')} />}
            </Field>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl bg-surface-2 px-4 py-3 sm:col-span-2" aria-live="polite">
              <span className="text-sm text-muted">
                Charged {charge.pct ? `${charge.pct}%` : '—'}
                {charge.kwh ? `, ${charge.kwh.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kWh` : ''}
              </span>
              <span className="text-sm font-semibold">
                {charge.estimated ? `About ${money(charge.cost, data.settings.currency, { decimals: true })} at your home rate` : charge.cost ? money(charge.cost, data.settings.currency, { decimals: true }) : 'Cost not tracked'}
              </span>
              {!vehicle?.batteryKwh && <span className="w-full text-xs text-muted">Add the battery size and home electricity rate to this vehicle to see kWh and cost.</span>}
            </div>
          </>
        ) : (
          <>
            <Field label="Amount paid" error={errors.amount?.message}>
              {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder="e.g. 500" autoFocus={!record} {...register('amount')} />}
            </Field>
            <Field label="Odometer" error={errors.odometer?.message}>
              {(p) => <Input {...p} inputMode="numeric" suffix={u.distance} {...register('odometer')} />}
            </Field>
            {showPrice ? (
              <>
                <Field label={`Price per ${unit}`} hint="Shown on the pump. We remember it for next time." error={errors.pricePerUnit?.message}>
                  {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder={electric ? 'e.g. 18' : 'e.g. 105'} {...register('pricePerUnit')} />}
                </Field>
                <div className="flex items-center justify-between self-start rounded-2xl bg-surface-2 px-4 py-3 sm:mt-6" aria-live="polite">
                  <span className="text-sm text-muted">{electric ? 'Energy added' : 'Fuel added'}</span>
                  <span className="font-display text-xl font-semibold tabular">{qty ? `${qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}` : '—'}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-surface-2 px-4 py-3 sm:col-span-2">
                <span aria-live="polite">
                  <span className="font-display text-xl font-semibold tabular">{qty ? `${qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}` : `— ${unit}`}</span>
                  <span className="ml-2 text-sm text-muted">
                    at {money(Number(price), data.settings.currency, { decimals: true })} per {unit}
                  </span>
                </span>
                <button type="button" className="text-sm font-semibold text-accent-text hover:underline" onClick={() => setPriceOpen(true)}>
                  Change price
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {!byBattery && (
        <Controller
          control={control}
          name="isFullTank"
          render={({ field }) => (
            <Toggle checked={field.value} onChange={field.onChange} label={electric ? 'Charged to full' : 'Filled the tank to full'} description="Optional. Mileage works either way; full fills make it exact." />
          )}
        />
      )}
      <details className="group" open={!!(record?.fuelStation || record?.notes)}>
        <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-fg">More details</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label={electric ? 'Charging point' : 'Fuel station'} optional error={errors.fuelStation?.message}>
            {(p) => <Input {...p} {...register('fuelStation')} />}
          </Field>
          <Field label="Notes" optional error={errors.notes?.message}>
            {(p) => <Input {...p} {...register('notes')} />}
          </Field>
        </div>
      </details>
    </form>
  )
}
