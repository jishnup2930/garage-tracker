import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV } from './nav'
import { Avatar } from './Avatar'
import { useGarage } from '../../store/AppStore'
import { navigate, type Page } from '../../lib/router'
import { cn } from '../../lib/cn'

/** Graphite "console" sidebar in both themes; lime marks the active page. */
export function Sidebar({ page }: { page: Page }) {
  const { data, update, reminders } = useGarage()
  const collapsed = data.settings.sidebarCollapsed
  const toggle = () => update((d) => ({ ...d, settings: { ...d.settings, sidebarCollapsed: !collapsed } }))
  const attention = reminders.filter((r) => r.eval.state === 'overdue' || r.eval.state === 'today').length

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className="on-console sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden bg-console text-console-fg lg:flex"
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
          <rect width="32" height="32" rx="9" fill="var(--accent)" />
          <path d="M7 19l2.2-6.1A2 2 0 0 1 11.1 11.5h9.8a2 2 0 0 1 1.9 1.4L25 19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="#1b1d21" />
        </svg>
        {!collapsed && <span className="font-display text-lg font-bold tracking-tight">Garage</span>}
      </div>

      <nav aria-label="Main" className="mt-3 flex-1 space-y-0.5 px-3">
        {NAV.filter((n) => n.page !== 'settings').map(({ page: p, label, icon: Icon }) => {
          const active = p === page
          return (
            <a
              key={p}
              href={`#/${p}`}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
                active ? 'bg-console-2 text-console-fg' : 'text-console-muted hover:bg-console-2/60 hover:text-console-fg',
              )}
            >
              {active && <motion.span layoutId="nav-indicator" className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-accent" />}
              <Icon aria-hidden className={cn('size-[19px] shrink-0', active && 'text-accent')} strokeWidth={1.8} />
              {!collapsed && <span className="truncate">{label}</span>}
              {p === 'reminders' && attention > 0 && (
                <span className={cn('grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink', collapsed ? 'absolute top-1.5 right-1.5 h-4 min-w-4' : 'ml-auto h-5')}>
                  {attention}
                  <span className="sr-only"> need attention</span>
                </span>
              )}
            </a>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/8 p-3">
        <button
          onClick={() => navigate('settings')}
          aria-current={page === 'settings' ? 'page' : undefined}
          className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-console-2', page === 'settings' && 'bg-console-2')}
        >
          <Avatar name={data.user?.firstName} src={data.user?.avatar} />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{data.user?.firstName ?? 'Guest'}</span>
              <span className="block text-xs text-console-muted">Profile & settings</span>
            </span>
          )}
        </button>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-console-muted hover:bg-console-2 hover:text-console-fg"
        >
          {collapsed ? <PanelLeftOpen className="size-[19px] shrink-0" /> : <PanelLeftClose className="size-[19px] shrink-0" />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </motion.aside>
  )
}
