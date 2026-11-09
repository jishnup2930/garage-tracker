import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

/** Dropdown menu with arrow-key navigation. */
export function Menu({ trigger, items, align = 'right', label, up }: { trigger: (p: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string; 'aria-label'?: string }) => ReactNode; items: MenuItem[]; align?: 'left' | 'right'; label?: string; up?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', off)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus())
    return () => document.removeEventListener('mousedown', off)
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') (e.preventDefault(), els[(i + 1) % els.length]?.focus())
    if (e.key === 'ArrowUp') (e.preventDefault(), els[(i - 1 + els.length) % els.length]?.focus())
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      ;(ref.current?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus()
    }
  }

  return (
    <div ref={ref} className="relative" onKeyDown={onKey}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id, 'aria-label': label })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn('absolute z-50 min-w-48 rounded-2xl', up ? 'bottom-full mb-2 origin-bottom' : 'mt-1.5 origin-top', ' border border-line bg-surface p-1.5 shadow-soft', align === 'right' ? 'right-0' : 'left-0')}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                tabIndex={-1}
                onClick={() => (setOpen(false), it.onSelect())}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium hover:bg-surface-2 focus:bg-surface-2 focus:outline-none', it.danger && 'text-danger')}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
