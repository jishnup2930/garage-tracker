import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-base text-fg placeholder:text-faint transition-colors hover:border-faint focus:border-fg focus:outline-none aria-invalid:border-danger disabled:opacity-60 sm:text-sm'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}

/** Label + control + error/hint, wired for screen readers. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId()
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">optional</span>}
      </label>
      {children({ id, 'aria-describedby': desc, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={desc} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={desc} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: string }>(function Input({ className, suffix, ...p }, ref) {
  if (!suffix) return <input ref={ref} className={cn(control, 'h-11', className)} {...p} />
  return (
    <div className="relative">
      <input ref={ref} className={cn(control, 'h-11 pr-16', className)} {...p} />
      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-faint">{suffix}</span>
    </div>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <div className="relative min-w-0">
      <select ref={ref} className={cn(control, 'h-11 cursor-pointer appearance-none truncate pr-9', className)} {...p}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={2} className={cn(control, 'resize-y py-2.5', className)} {...p} />
})

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-fg' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform', checked ? 'translate-x-5 bg-accent' : 'bg-white')} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
