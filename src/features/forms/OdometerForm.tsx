import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Field, Input } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'
import { useFormat } from '../../hooks/useFormat'
import { updateOdometer } from '../../store/ops'
import { todayStr } from '../../lib/calc'
import { lastReadingDate } from '../../lib/schedules'
import { reqNum, toNum } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const schema = z.object({ vehicleId: z.string().min(1, 'Choose a vehicle'), odometer: reqNum('Odometer reading') })
type Values = z.infer<typeof schema>

/** Quick odometer reading, so distance-based reminders stay accurate between refills. */
export function OdometerForm({ formId, vehicleId, onSaved }: { formId: string; vehicleId?: string; onSaved: () => void }) {
  const { data, update } = useGarage()
  const f = useFormat()
  const initial = vehicleId ?? (data.vehicles.length === 1 ? data.vehicles[0].id : '')
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { vehicleId: initial, odometer: '' } })
  const v = data.vehicles.find((x) => x.id === watch('vehicleId'))

  const submit = (x: Values) => {
    const odo = toNum(x.odometer)
    if (v && odo < v.currentOdometer) return setError('odometer', { message: `Lower than the last reading (${f.dist(v.currentOdometer)}). To correct it, edit the vehicle.` })
    if (update((d) => updateOdometer(d, x.vehicleId, odo, todayStr()))) onSaved()
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field label="Vehicle" error={errors.vehicleId?.message}>
        {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
      </Field>
      <Field label="Odometer now" hint={v ? `Last reading ${f.dist(v.currentOdometer)}, on ${f.date(lastReadingDate(v, data))}.` : undefined} error={errors.odometer?.message}>
        {(p) => <Input {...p} inputMode="numeric" suffix={f.u.distance} placeholder={v ? String(v.currentOdometer) : undefined} data-autofocus {...register('odometer')} />}
      </Field>
    </form>
  )
}
