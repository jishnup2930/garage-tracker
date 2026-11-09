import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Trash2, AlertOctagon, CalendarClock, Clock, Info } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { clearNotifications, markNotificationsRead } from '../../store/ops'
import { navigate } from '../../lib/router'
import { relTime } from '../../lib/format'
import { cn } from '../../lib/cn'
import { useReminderActions } from '../../features/reminders/useReminderActions'
import { browserNotificationsSupported } from '../../hooks/useReminderEngine'
import { useToast } from '../ui/Toast'
import type { AppNotification } from '../../types'

const ICON: Record<AppNotification['type'], typeof Bell> = { overdue: AlertOctagon, due: CalendarClock, upcoming: Clock, info: Info }
const TONE: Record<AppNotification['type'], string> = { overdue: 'text-danger', due: 'text-warn', upcoming: 'text-warn', info: 'text-info' }

export async function requestBrowserNotifications(): Promise<boolean> {
  if (!browserNotificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function NotificationCenter() {
  const { data, update } = useGarage()
  const actions = useReminderActions()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const list = data.notifications
  const unread = list.filter((n) => !n.isRead).length
  const permission = browserNotificationsSupported() ? Notification.permission : 'unsupported'

  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => (document.removeEventListener('mousedown', off), document.removeEventListener('keydown', esc))
  }, [open])

  const enableBrowser = async () => {
    const ok = await requestBrowserNotifications()
    update((d) => ({ ...d, settings: { ...d.settings, browserNotifications: ok } }))
    ok ? toast.success('Browser alerts are on', 'You will get alerts while this app is open in your browser.') : toast.error('Browser alerts are blocked', 'Allow notifications for this site in your browser settings, then try again.')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Bell className="size-5" strokeWidth={1.8} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-3 top-16 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-base font-semibold">Notifications</h2>
              <div className="flex gap-1">
                <button disabled={!unread} onClick={() => update((d) => markNotificationsRead(d))} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40">
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
                <button disabled={!list.length} onClick={() => update(clearNotifications)} aria-label="Clear all notifications" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {permission === 'default' && (
              <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5 text-xs">
                <span className="text-muted">Get alerts outside this tab while the app is open.</span>
                <button onClick={enableBrowser} className="shrink-0 font-semibold text-accent-text hover:underline">
                  Turn on
                </button>
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
              {!list.length && (
                <li className="flex flex-col items-center px-6 py-10 text-center text-sm text-muted">
                  <BellOff className="mb-2 size-6 text-faint" />
                  You're all caught up. Reminders that come due will show up here.
                </li>
              )}
              <AnimatePresence initial={false}>
                {list.map((n) => {
                  const Icon = ICON[n.type]
                  const rem = data.reminders.find((r) => r.id === n.reminderId)
                  return (
                    <motion.li key={n.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="border-b border-line last:border-0">
                      <div className={cn('flex gap-3 px-4 py-3', !n.isRead && 'bg-accent/8')}>
                        <Icon aria-hidden className={cn('mt-0.5 size-[18px] shrink-0', TONE[n.type])} />
                        <div className="min-w-0 flex-1">
                          <button
                            className="text-left"
                            onClick={() => {
                              update((d) => markNotificationsRead(d, [n.id]))
                              setOpen(false)
                              navigate('reminders')
                            }}
                          >
                            <p className="text-sm font-semibold">{n.title}</p>
                            <p className="text-[13px] text-muted">{n.message}</p>
                          </button>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="text-faint">{relTime(n.createdAt)}</span>
                            {rem?.status === 'active' && (
                              <>
                                <button className="font-semibold text-accent-text hover:underline" onClick={() => (actions.complete(rem.id), update((d) => markNotificationsRead(d, [n.id])))}>
                                  Mark done
                                </button>
                                <button className="font-semibold text-muted hover:text-fg hover:underline" onClick={() => (actions.snooze(rem.id, 1), update((d) => markNotificationsRead(d, [n.id])))}>
                                  Snooze 1 day
                                </button>
                              </>
                            )}
                            {!n.isRead && (
                              <button className="font-semibold text-muted hover:text-fg hover:underline" onClick={() => update((d) => markNotificationsRead(d, [n.id]))}>
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
