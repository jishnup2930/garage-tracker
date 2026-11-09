import { useRef, useState, type ReactNode } from 'react'
import { Download, Upload, RotateCcw, Sparkles, Trash2, X, Sun, Moon, Monitor, Smartphone } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { useToast } from '../../components/ui/Toast'
import { PageHeader } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Field, Input, Segmented, Select, Toggle } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { CURRENCIES, fmtDate } from '../../lib/format'
import { clearData, parseAppData, storageUsageBytes } from '../../lib/storage'
import { emptyData } from '../../lib/schema'
import { clearDemo, hasDemo, loadDemo } from '../../store/ops'
import { LEAD_TIMES, type DateFormat, type Settings, type ThemePref } from '../../types'
import { leadLabel } from '../forms/ReminderForm'
import { browserNotificationsSupported } from '../../hooks/useReminderEngine'
import { requestBrowserNotifications } from '../../components/layout/NotificationCenter'
import { navigate } from '../../lib/router'
import { useBackup } from './useBackup'
import { useInstall } from '../../lib/install'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-7 first:border-0 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 className="font-display text-[17px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-xl space-y-4">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { data, update, replace } = useGarage()
  const { confirm } = useUI()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(data.user?.firstName ?? '')
  const s = data.settings
  const set = (patch: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  const perm = browserNotificationsSupported() ? Notification.permission : 'unsupported'
  const kb = Math.round(storageUsageBytes() / 1024)

  const saveName = () => {
    const n = name.trim()
    if (!n) return setName(data.user?.firstName ?? '')
    if (n !== data.user?.firstName && update((d) => ({ ...d, user: d.user ? { ...d.user, firstName: n } : d.user })))
      toast.success(`Nice to meet you again, ${n}`)
  }

  const toggleBrowser = async (on: boolean) => {
    if (!on) return set({ browserNotifications: false })
    const ok = await requestBrowserNotifications()
    set({ browserNotifications: ok })
    if (!ok) toast.error('Browser alerts are blocked', 'Allow notifications for this site in your browser settings, then try again.')
  }

  const exportAll = useBackup()
  const install = useInstall()

  const importFile = async (file?: File) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('That file is too large to be a garage backup.')
      const next = parseAppData(JSON.parse(await file.text()))
      const ok = await confirm({
        title: 'Restore this backup?',
        message: `It contains ${next.vehicles.length} vehicles, ${next.maintenance.length} maintenance records, ${next.fuel.length} refills, ${next.expenses.length} expenses and ${next.papers.length} papers. Everything currently in the app will be replaced.`,
        confirmLabel: 'Replace and restore',
        danger: true,
      })
      // Keep the newer "last backup" date: restoring an old file shouldn't make the app ask for a backup again.
      const lastBackupAt = [next.settings.lastBackupAt, data.settings.lastBackupAt].filter(Boolean).sort().pop()
      if (ok && replace({ ...next, settings: { ...next.settings, onboarded: true, lastBackupAt } })) toast.success('Backup restored')
    } catch (e) {
      toast.error('Could not restore backup', e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message)
    }
  }

  const reset = async () => {
    const ok = await confirm({
      title: 'Reset everything?',
      message: 'All vehicles, records, reminders and settings will be deleted from this browser. Download a backup first if you might want them back. This cannot be undone.',
      confirmLabel: 'Delete all data',
      danger: true,
    })
    if (!ok) return
    clearData()
    replace(emptyData())
    navigate('overview')
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, units, alerts and data. Everything is stored only in this browser." />
      <div className="rounded-[22px] border border-line bg-surface p-5 sm:p-8">
        <Section title="Profile" description="How the app greets you.">
          <ImagePicker round label="Add a profile photo" maxSize={256} value={data.user?.avatar} onChange={(avatar) => update((d) => ({ ...d, user: d.user ? { ...d.user, avatar } : d.user }))} />
          <Field label="First name">{(p) => <Input {...p} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} />}</Field>
        </Section>

        <Section title="Units & formats" description="Changing units relabels your numbers; it doesn't convert values you've already logged.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              {(p) => (
                <Select {...p} value={s.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Date format">
              {(p) => (
                <Select {...p} value={s.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as DateFormat })}>
                  <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                  <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                  <option value="d MMM yyyy">9 Nov 2026</option>
                </Select>
              )}
            </Field>
            <Field label="Distance">
              {(p) => (
                <Select {...p} value={s.distanceUnit} onChange={(e) => set({ distanceUnit: e.target.value as Settings['distanceUnit'] })}>
                  <option value="km">Kilometres</option>
                  <option value="mi">Miles</option>
                </Select>
              )}
            </Field>
            <Field label="Fuel quantity">
              {(p) => (
                <Select {...p} value={s.volumeUnit} onChange={(e) => set({ volumeUnit: e.target.value as Settings['volumeUnit'] })}>
                  <option value="L">Litres</option>
                  <option value="gal">Gallons</option>
                </Select>
              )}
            </Field>
          </div>
        </Section>

        <Section title="Appearance">
          <Segmented<ThemePref>
            label="Theme"
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="size-4" />Light</span> },
              { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="size-4" />Dark</span> },
              { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="size-4" />System</span> },
            ]}
          />
        </Section>

        <Section title="Reminders & alerts" description="Reminders are checked whenever you open or return to the app. There's no server, so nothing can alert you while the browser is closed.">
          <Toggle checked={s.inAppReminders} onChange={(v) => set({ inAppReminders: v })} label="In-app reminders" description="Show due and overdue reminders in the notification centre." />
          <Toggle
            checked={s.browserNotifications && perm === 'granted'}
            onChange={toggleBrowser}
            label="Browser notifications"
            description={perm === 'unsupported' ? 'Not supported in this browser.' : perm === 'denied' ? 'Blocked in your browser settings for this site.' : 'Pop-up alerts while the app is open in a tab.'}
          />
          <Field label="Default reminder lead time" hint="Used for new reminders and maintenance you schedule.">
            {(p) => (
              <Select {...p} value={s.defaultLeadTime} onChange={(e) => set({ defaultLeadTime: Number(e.target.value) })}>
                {LEAD_TIMES.map((d) => (
                  <option key={d} value={d}>
                    {leadLabel(d)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Section>

        <Section title="Maintenance categories" description="Your own categories, added from the maintenance form.">
          {data.customMaintenanceCategories.length ? (
            <ul className="flex flex-wrap gap-2">
              {data.customMaintenanceCategories.map((c) => (
                <li key={c} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm font-medium">
                  {c}
                  <button aria-label={`Remove ${c}`} onClick={() => update((d) => ({ ...d, customMaintenanceCategories: d.customMaintenanceCategories.filter((x) => x !== c) }))} className="rounded-full p-1 text-muted hover:bg-line hover:text-fg">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">None yet. Choose "New category…" when logging maintenance to add one. Removing one keeps past records as they are.</p>
          )}
        </Section>

        <Section title="Install the app" description="Opens full-screen from your home screen, works offline, and makes the browser less likely to clear your data.">
          {install.installed ? (
            <p className="text-sm text-muted">Installed on this device.</p>
          ) : install.canPrompt ? (
            <Button variant="outline" icon={<Smartphone className="size-4" />} onClick={install.prompt}>Install Garage Tracker</Button>
          ) : (
            <p className="text-sm text-muted">{install.ios ? 'In Safari, tap the Share button, then "Add to Home Screen".' : 'Use your browser menu and choose "Install app" or "Add to Home screen".'}</p>
          )}
        </Section>

        <Section title="Your data" description={`About ${kb.toLocaleString()} KB used in this browser. Last backup: ${data.settings.lastBackupAt ? fmtDate(data.settings.lastBackupAt.slice(0, 10), data.settings) : 'never'}. Back up regularly: clearing browser data deletes it.`}>
          <div className="flex flex-wrap gap-2">
            <Button variant="dark" icon={<Download className="size-4" />} onClick={exportAll}>
              Download backup
            </Button>
            <Button variant="outline" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
              Restore from backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => importFile(e.target.files?.[0])} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {hasDemo(data) ? (
              <Button variant="outline" icon={<Trash2 className="size-4" />} onClick={() => update(clearDemo) && toast.success('Demo data cleared', 'Only your own records remain.')}>
                Clear demo data
              </Button>
            ) : (
              <Button variant="outline" icon={<Sparkles className="size-4" />} onClick={() => update(loadDemo) && toast.success('Demo garage added', 'Three sample vehicles with a year of history. Clear them here any time.')}>
                Add demo data
              </Button>
            )}
            <Button variant="ghost" className="text-danger hover:text-danger" icon={<RotateCcw className="size-4" />} onClick={reset}>
              Reset all data
            </Button>
          </div>
        </Section>
      </div>
    </>
  )
}
