import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export function EmptyState({ icon: Icon, title, message, action, className }: { icon: LucideIcon; title: string; message: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-dashed border-faint/60 text-muted">
        <Icon aria-hidden className="size-6" strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-surface-2', className)} />
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  )
}

/** Hover/focus tooltip for icon-only controls. */
export function Tip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'right' }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 rounded-md bg-console px-2 py-1 text-xs font-medium whitespace-nowrap text-console-fg opacity-0 transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100',
          side === 'top' ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2' : 'top-1/2 left-full ml-2 -translate-y-1/2',
        )}
      >
        {label}
      </span>
    </span>
  )
}
