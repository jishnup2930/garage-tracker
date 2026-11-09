import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PAPER_TYPES, type Paper } from '../../types'
import { Field, Input, Select } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'
import { savePaper } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { optText, reqDate } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const schema = z.object({
  vehicleId: z.string().min(1, 'Choose a vehicle'),
  type: z.enum(PAPER_TYPES),
  number: z.string().trim().max(40, 'Keep this under 40 characters'),
  provider: z.string().trim().max(60, 'Keep this under 60 characters'),
  expiryDate: reqDate('Expiry date'),
  notes: optText,
})
type Values = z.infer<typeof schema>

const NUMBER_LABEL: Partial<Record<Paper['type'], string>> = { Insurance: 'Policy number', 'Pollution certificate (PUC)': 'Certificate number', 'Registration (RC)': 'RC number' }

/** Vehicle papers: details and expiry only. Saving keeps a reminder for the expiry date. */
export function PaperForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: Paper; vehicleId?: string; onSaved: (p: Paper) => void }) {
  const { data, update } = useGarage()
  const initial = record?.vehicleId ?? vehicleId ?? (data.vehicles.length === 1 ? data.vehicles[0].id : '')
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initial,
      type: record?.type ?? 'Insurance',
      number: record?.number ?? '',
      provider: record?.provider ?? '',
      expiryDate: record?.expiryDate ?? '',
      notes: record?.notes ?? '',
    },
  })
  const type = watch('type')

  const submit = (v: Values) => {
    const next: Paper = {
      ...(record ?? { id: uid(), createdAt: nowIso() }),
      vehicleId: v.vehicleId,
      type: v.type,
      number: v.number || undefined,
      provider: (v.type === 'Insurance' && v.provider) || undefined, // the insurer field only shows for insurance
      expiryDate: v.expiryDate,
      notes: v.notes || undefined,
    }
    if (update((d) => savePaper(d, next))) onSaved(next)
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle" error={errors.vehicleId?.message}>
          {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
        </Field>
        <Field label="Paper" error={errors.type?.message}>
          {(p) => (
            <Select {...p} {...register('type')}>
              {PAPER_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Valid until" hint="We'll remind you before it runs out." error={errors.expiryDate?.message}>
          {(p) => <Input {...p} type="date" {...register('expiryDate')} />}
        </Field>
        <Field label={NUMBER_LABEL[type] ?? 'Number'} optional error={errors.number?.message}>
          {(p) => <Input {...p} autoComplete="off" {...register('number')} />}
        </Field>
        {type === 'Insurance' && (
          <Field label="Insurer" optional error={errors.provider?.message}>
            {(p) => <Input {...p} placeholder="e.g. the company on your policy" {...register('provider')} />}
          </Field>
        )}
        <Field label="Notes" optional className={type === 'Insurance' ? undefined : 'sm:col-span-2'} error={errors.notes?.message}>
          {(p) => <Input {...p} {...register('notes')} />}
        </Field>
      </div>
      <p className="text-xs text-muted">Only the details are saved, in this browser. No document photos.</p>
    </form>
  )
}
