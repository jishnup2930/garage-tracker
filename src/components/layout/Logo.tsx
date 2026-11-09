import { useId } from 'react'
import { cn } from '../../lib/cn'

/** Sports-car mark cut by two speed lines. Draws in currentColor. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId() // masks need a page-unique id; the mark appears more than once
  return (
    <svg viewBox="0 0 48 24" className={className} aria-hidden>
      <defs>
        <mask id={id}>
          <rect width="48" height="24" fill="#fff" />
          <path d="M0 9.4h27.5l-2.4 1.7H0z M0 13h33.5l-2.4 1.7H0z" fill="#000" />
          <circle cx="13" cy="17.8" r="4.3" fill="#000" />
          <circle cx="36.5" cy="17.8" r="4.3" fill="#000" />
        </mask>
      </defs>
      <path
        mask={`url(#${id})`}
        fill="currentColor"
        d="M3 17.4V12.6c0-.6.4-1 1-1.1l9-1.4 6.6-3.7c.9-.5 1.9-.8 2.9-.8h5.7c1.1 0 2.2.4 3 1.1l4 3.6 8.3 1.6c1.5.3 2.5 1.6 2.5 3.1v2.4c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1z"
      />
      <circle cx="13" cy="17.8" r="2.7" fill="currentColor" />
      <circle cx="36.5" cy="17.8" r="2.7" fill="currentColor" />
    </svg>
  )
}

/** Square app icon: green car on the dark console colour. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] bg-console text-[#22c55e] ring-1 ring-white/10', className)}>
      <LogoMark className="w-[82%]" />
    </span>
  )
}

/** Stacked "GARAGE / TRACKER" wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex flex-col leading-none', className)}>
      <span className="font-display text-[17px] font-extrabold tracking-[0.06em]">GARAGE</span>
      <span className="mt-1 text-[9px] font-semibold tracking-[0.42em] text-[#22c55e]">TRACKER</span>
    </span>
  )
}
