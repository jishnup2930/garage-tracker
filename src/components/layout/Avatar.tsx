import { cn } from '../../lib/cn'

export function Avatar({ name, src, className }: { name?: string; src?: string; className?: string }) {
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-display text-sm font-bold text-accent-ink', className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : (name?.[0] ?? 'G').toUpperCase()}
    </span>
  )
}
