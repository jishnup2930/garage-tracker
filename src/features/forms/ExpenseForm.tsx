import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MANUAL_EXPENSE_CATEGORIES, type Expense } from '../../types'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { useGarage } from '../../store/AppStore'
import { saveExpense } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { todayStr } from '../../lib/calc'
import { optText, reqDate, reqNum, str, toNum, toOpt } from './formUtils'
import { VehicleSelect } from './VehicleSelect'

const schema = z.object({
  vehicleId: z.string().min(1, 'Choose a vehicle'),
  category: z.enum(MANUAL_EXPENSE_CATEGORIES as [string, ...string[]]),
  amount: reqNum('Amount').refine((v) => Number(v) > 0, 'Amount must be more than 0'),
  date: reqDate('Date').refine((v) => v <= todayStr(), 'Date cannot be in the future'),
  description: z.string().trim().min(1, 'Add a short description').max(120),
  notes: optText,
  receipt: z.string().optional(),
})
type Values = z.infer<typeof schema>

export function ExpenseForm({ formId, record, vehicleId, onSaved }: { formId: string; record?: Expense; vehicleId?: string; onSaved: (e: Expense) => void }) {
  const { data, update } = useGarage()
  const initial = record?.vehicleId ?? vehicleId ?? (data.vehicles.length === 1 ? data.vehicles[0].id : '')
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: initial,
      category: record?.category ?? 'Repairs',
      amount: str(record?.amount),
      date: record?.date ?? todayStr(),
      description: record?.description ?? '',
      notes: record?.notes ?? '',
      receipt: record?.receipt,
    },
  })

  const submit = (v: Values) => {
    const amount = toNum(v.amount)
    const dup = data.expenses.some((e) => e.id !== record?.id && e.vehicleId === v.vehicleId && e.date === v.date && e.amount === amount && e.category === v.category && e.description.toLowerCase() === v.description.toLowerCase())
    if (dup) return setError('description', { message: 'You already logged this exact expense on this date.' })
    const next: Expense = {
      ...(record ?? { id: uid(), createdAt: nowIso() }),
      vehicleId: v.vehicleId,
      category: v.category as Expense['category'],
      amount,
      date: v.date,
      description: v.description,
      notes: toOpt(v.notes),
      receipt: v.receipt,
    }
    if (update((d) => saveExpense(d, next))) onSaved(next)
  }

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle" error={errors.vehicleId?.message}>
          {(p) => <VehicleSelect {...p} {...register('vehicleId')} />}
        </Field>
        <Field label="Category" error={errors.category?.message} hint="Fuel and maintenance are logged in their own sections, so they're never counted twice.">
          {(p) => (
            <Select {...p} {...register('category')}>
              {MANUAL_EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Amount" error={errors.amount?.message}>
          {(p) => <Input {...p} inputMode="decimal" suffix={data.settings.currency} placeholder="0" {...register('amount')} />}
        </Field>
        <Field label="Date" error={errors.date?.message}>
          {(p) => <Input {...p} type="date" max={todayStr()} {...register('date')} />}
        </Field>
      </div>
      <Field label="Description" error={errors.description?.message}>
        {(p) => <Input {...p} placeholder="e.g. Annual insurance renewal" {...register('description')} />}
      </Field>
      <Field label="Notes" optional error={errors.notes?.message}>
        {(p) => <Textarea {...p} {...register('notes')} />}
      </Field>
      <Controller control={control} name="receipt" render={({ field }) => <ImagePicker label="Attach receipt" maxSize={1200} value={field.value} onChange={(v) => setValue('receipt', v)} />} />
    </form>
  )
}
