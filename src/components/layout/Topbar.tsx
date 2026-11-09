import { Search } from 'lucide-react'
import { useUI } from '../../store/ui'
import { NotificationCenter } from './NotificationCenter'
import { QuickAdd } from './QuickAdd'

export function Topbar({ title }: { title: string }) {
  const { setSearchOpen } = useUI()
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <svg viewBox="0 0 32 32" className="size-8 shrink-0 lg:hidden" aria-hidden>
          <rect width="32" height="32" rx="9" fill="var(--console)" />
          <path d="M7 19l2.2-6.1A2 2 0 0 1 11.1 11.5h9.8a2 2 0 0 1 1.9 1.4L25 19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="var(--accent)" />
        </svg>
        <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight lg:text-[15px] lg:font-medium lg:text-muted">{title}</p>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl text-sm text-muted transition-colors hover:text-fg max-sm:w-10 max-sm:justify-center sm:w-64 sm:border sm:border-line sm:bg-surface sm:px-3"
          aria-label="Search"
        >
          <Search className="size-[18px]" strokeWidth={1.8} />
          <span className="hidden flex-1 text-left sm:inline">Search</span>
          <kbd className="hidden rounded border border-line px-1.5 text-[11px] font-medium sm:inline">Ctrl K</kbd>
        </button>
        <NotificationCenter />
        <div className="hidden sm:block">
          <QuickAdd />
        </div>
      </div>
    </header>
  )
}
