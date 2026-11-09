import { useId, useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { resizeImage } from '../../lib/image'
import { cn } from '../../lib/cn'

/** Picks an image, shrinks it for LocalStorage, and previews it. */
export function ImagePicker({ value, onChange, label, maxSize = 800, className, round }: { value?: string; onChange: (v: string | undefined) => void; label: string; maxSize?: number; className?: string; round?: boolean }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      onChange(await resizeImage(file, maxSize))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className={className}>
      <input ref={input} id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex items-center gap-3">
        <label
          htmlFor={id}
          className={cn(
            'relative grid shrink-0 cursor-pointer place-items-center overflow-hidden border border-dashed border-faint/70 bg-surface-2 text-muted transition-colors hover:border-fg hover:text-fg focus-within:outline-2',
            round ? 'size-16 rounded-full' : 'h-20 w-28 rounded-xl',
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5" />}
          <span className="sr-only">{label}</span>
        </label>
        <div className="text-sm">
          <label htmlFor={id} className="cursor-pointer font-semibold hover:underline">
            {value ? 'Change photo' : label}
          </label>
          <p className="text-xs text-muted">Resized automatically to save space.</p>
          {value && (
            <button type="button" onClick={() => onChange(undefined)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline">
              <X className="size-3" /> Remove
            </button>
          )}
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
      </div>
    </div>
  )
}
