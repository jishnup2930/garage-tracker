import { useState, type ReactNode } from 'react'
import { DatabaseBackup, Gauge, ListChecks, Smartphone, X } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { Button } from '../../components/ui/Button'
import type { Tone } from '../../components/ui/Panel'
import { useBackup } from '../settings/useBackup'
import { useInstall } from '../../lib/install'
import { daysSince, lastReadingDate } from '../../lib/schedules'
import { cn } from '../../lib/cn'

const DISMISS_KEY = 'garage.dismissedTips'
const BACKUP_EVERY_DAYS = 30
const STALE_READING_DAYS = 14

interface Tip {
  key: string
  tone: Tone
  icon: ReactNode
  title: string
  text: string
  action: ReactNode
  onDismiss?: () => void
}

/** A short list of things worth doing now: back up, refresh a stale km reading, set reminders, install. */
export function Suggestions() {
  const { data, reminders, today } = useGarage()
  const { openForm } = useUI()
  const backup = useBackup()
  const install = useInstall()
  // Dismissed tips are a per-device convenience, so browser storage is fine (and optional).
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const dismiss = (key: string) => () => {
    const next = [...hidden, key]
    setHidden(next)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    } catch {
      /* private mode: hidden for this visit only */
    }
  }
  const tips: Tip[] = []

  const ownVehicles = data.vehicles.filter((v) => !v.demo)
  const last = data.settings.lastBackupAt?.slice(0, 10)
  if (ownVehicles.length && (!last || daysSince(last, today) >= BACKUP_EVERY_DAYS))
    tips.push({
      key: 'backup',
      tone: 'blue',
      icon: <DatabaseBackup />,
      title: 'Back up your garage',
      text: `Your records live only in this browser. Last backup: ${last ? `${daysSince(last, today)} days ago` : 'never'}.`,
      action: <Button size="sm" onClick={backup}>Download backup</Button>,
    })

  for (const v of ownVehicles) {
    const usesKm = reminders.some((r) => r.reminder.vehicleId === v.id && r.reminder.status === 'active' && r.reminder.dueOdometer != null)
    const age = daysSince(lastReadingDate(v, data), today)
    if (usesKm && age >= STALE_READING_DAYS)
      tips.push({
        key: `km-${v.id}`,
        tone: 'orange',
        icon: <Gauge />,
        title: `Update km for ${v.nickname}`,
        text: `Last reading ${age} days ago. Km-based reminders are only as current as this.`,
        action: <Button size="sm" variant="outline" onClick={() => openForm({ kind: 'odometer', vehicleId: v.id })}>Update km</Button>,
      })
    else if (!hidden.includes(`sched-${v.id}`) && !reminders.some((r) => r.reminder.vehicleId === v.id && r.reminder.status === 'active'))
      tips.push({
        key: `sched-${v.id}`,
        tone: 'purple',
        icon: <ListChecks />,
        title: `No reminders for ${v.nickname}`,
        text: 'Add the usual oil change and service reminders in one tap.',
        action: <Button size="sm" variant="outline" onClick={() => openForm({ kind: 'schedule', vehicleId: v.id })}>Set up</Button>,
        onDismiss: dismiss(`sched-${v.id}`),
      })
  }

  if (!install.installed && !hidden.includes('install') && (install.canPrompt || install.ios))
    tips.push({
      key: 'install',
      tone: 'green',
      icon: <Smartphone />,
      title: 'Install Garage Tracker',
      text: install.canPrompt ? 'Opens like an app from your home screen and keeps your data safer.' : 'In Safari, tap Share, then "Add to Home Screen". It opens like an app and keeps your data safer.',
      action: install.canPrompt ? <Button size="sm" variant="outline" onClick={install.prompt}>Install</Button> : null,
      onDismiss: dismiss('install'),
    })

  if (!tips.length) return null
  return (
    <ul className="divide-y divide-line rounded-[20px] border border-line bg-surface" aria-label="Suggestions">
      {tips.slice(0, 3).map((t) => (
        <li key={t.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap">
          <span aria-hidden className={cn('icon-chip size-9 rounded-xl [&>svg]:size-[18px]', `tone-${t.tone}`)}>
            {t.icon}
          </span>
          <span className="min-w-0 flex-1 basis-48">
            <span className="block text-sm font-semibold">{t.title}</span>
            <span className="block text-xs text-muted">{t.text}</span>
          </span>
          <span className="ml-12 flex items-center gap-1 sm:ml-0">
            {t.action}
            {t.onDismiss && (
              <button aria-label="Dismiss" onClick={t.onDismiss} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                <X className="size-4" />
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
