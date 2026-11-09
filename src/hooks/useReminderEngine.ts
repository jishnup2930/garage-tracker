import { useEffect, useState } from 'react'
import { useGarage } from '../store/AppStore'
import { addNotifications, patchReminder } from '../store/ops'
import { alertStage } from '../lib/calc'
import { dueText, num } from '../lib/format'
import { nowIso, uid } from '../lib/id'
import type { AppData, AppNotification } from '../types'

export const browserNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Frontend-only reminder engine. There's no server, so reminders are checked when the app opens,
 * regains focus, becomes visible, or the day changes. Each alert stage (due soon / due today /
 * overdue) is recorded on the reminder, so it is sent once per due target.
 */
export function useReminderEngine() {
  const { data, update, reminders, today } = useGarage()
  const [wake, setWake] = useState(0)

  useEffect(() => {
    const bump = () => document.visibilityState === 'visible' && setWake((w) => w + 1)
    window.addEventListener('focus', bump)
    document.addEventListener('visibilitychange', bump)
    return () => {
      window.removeEventListener('focus', bump)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [])

  const { inAppReminders, browserNotifications, distanceUnit } = data.settings
  useEffect(() => {
    if (!data.settings.onboarded) return
    const wantBrowser = browserNotifications && browserNotificationsSupported() && Notification.permission === 'granted'
    if (!inAppReminders && !wantBrowser) return
    const fresh: { reminderId: string; key: string; n: AppNotification }[] = []
    for (const { reminder: r, vehicle, eval: e } of reminders) {
      const key = alertStage(r, e, today)
      if (!key) continue
      const who = vehicle?.nickname ?? 'your vehicle'
      const when =
        e.daysLeft != null && (e.state !== 'soon' || e.daysLeft <= r.leadTime)
          ? dueText(e.daysLeft).toLowerCase()
          : e.distanceLeft != null
            ? e.distanceLeft < 0
              ? `overdue by ${num(-e.distanceLeft)} ${distanceUnit}`
              : `due in ${num(e.distanceLeft)} ${distanceUnit}`
            : ''
      const n: AppNotification = {
        id: uid(),
        reminderId: r.id,
        vehicleId: r.vehicleId,
        createdAt: nowIso(),
        isRead: false,
        type: e.state === 'overdue' ? 'overdue' : e.state === 'today' ? 'due' : 'upcoming',
        title: e.state === 'overdue' ? `${r.title} is overdue` : `${r.title} for ${who}`,
        message: e.state === 'overdue' ? `${who}: ${when}. Worth sorting out soon.` : `Just a heads-up! ${who}'s ${r.title.toLowerCase()} is ${when}.`,
      }
      fresh.push({ reminderId: r.id, key, n })
    }
    if (!fresh.length) return

    const ok = update((d) => {
      let next: AppData = d
      for (const f of fresh) {
        const r = next.reminders.find((x) => x.id === f.reminderId)
        if (r) next = patchReminder(next, r.id, { notifiedKeys: [...r.notifiedKeys, f.key].slice(-12), lastNotifiedAt: nowIso() })
      }
      return inAppReminders ? addNotifications(next, fresh.map((f) => f.n)) : next
    })
    if (ok && wantBrowser) {
      for (const { n } of fresh.slice(0, 3)) {
        try {
          // oxlint-disable-next-line no-new -- showing the notification is the side effect we want
          new Notification(n.title, { body: n.message, tag: `${n.reminderId}-${n.type}`, icon: './favicon.svg' })
        } catch {
          /* Some mobile browsers only allow notifications from a service worker; the in-app centre still has it. */
        }
      }
    }
  }, [reminders, today, wake, inAppReminders, browserNotifications, distanceUnit, data.settings.onboarded, update])
}
