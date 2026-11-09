import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { NAV } from './nav'
import { QuickAdd } from './QuickAdd'
import { Modal } from '../ui/Modal'
import { navigate, type Page } from '../../lib/router'
import { cn } from '../../lib/cn'

const PRIMARY: Page[] = ['overview', 'garage', 'reminders']

export function MobileNav({ page }: { page: Page }) {
  const [more, setMore] = useState(false)
  const items = NAV.filter((n) => PRIMARY.includes(n.page))
  const inMore = !PRIMARY.includes(page)
  const link = (n: (typeof NAV)[number]) => (
    <a key={n.page} href={`#/${n.page}`} aria-current={page === n.page ? 'page' : undefined} className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold', page === n.page ? 'text-console-fg' : 'text-console-muted')}>
      <n.icon aria-hidden className={cn('size-5', page === n.page && 'text-accent')} strokeWidth={1.8} />
      {n.label.replace('My ', '')}
    </a>
  )
  return (
    <>
      <nav aria-label="Main" className="on-console fixed inset-x-0 bottom-0 z-40 flex items-center bg-console px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {link(items[0])}
        {link(items[1])}
        <div className="flex flex-1 justify-center">
          <QuickAdd compact />
        </div>
        {link(items[2])}
        <button onClick={() => setMore(true)} aria-current={inMore ? 'page' : undefined} className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold', inMore ? 'text-console-fg' : 'text-console-muted')}>
          <MoreHorizontal aria-hidden className={cn('size-5', inMore && 'text-accent')} />
          More
        </button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Go to" size="sm">
        <ul className="grid grid-cols-2 gap-2">
          {NAV.filter((n) => !PRIMARY.includes(n.page)).map((n) => (
            <li key={n.page}>
              <button
                onClick={() => (setMore(false), navigate(n.page))}
                className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-3.5 text-left text-sm font-semibold', page === n.page ? 'border-fg' : 'border-line')}
              >
                <n.icon aria-hidden className="size-5 text-muted" strokeWidth={1.8} />
                {n.label}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
