import { useState } from 'react'
import { BellRing, Plus, BellPlus } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Segmented, Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { ReminderList } from '../records/ReminderList'
import { useToast } from '../../components/ui/Toast'
import { browserNotificationsSupported } from '../../hooks/useReminderEngine'
import { requestBrowserNotifications } from '../../components/layout/NotificationCenter'

type View = 'active' | 'attention' | 'completed' | 'all'

export function RemindersPage() {
  const { data, reminders, update } = useGarage()
  const { openForm } = useUI()
  const toast = useToast()
  const [view, setView] = useState<View>('active')
  const [vehicleId, setVehicleId] = useState('')
  const perm = browserNotificationsSupported() ? Notification.permission : 'unsupported'

  const items = reminders.filter(
    (r) =>
      (!vehicleId || r.reminder.vehicleId === vehicleId) &&
      (view === 'all' ||
        (view === 'active' && r.reminder.status === 'active') ||
        (view === 'completed' && r.reminder.status === 'completed') ||
        (view === 'attention' && r.reminder.status === 'active' && r.eval.state !== 'upcoming')),
  )
  const count = (v: View) => reminders.filter((r) => (v === 'active' ? r.reminder.status === 'active' : v === 'completed' ? r.reminder.status === 'completed' : v === 'attention' ? r.reminder.status === 'active' && r.eval.state !== 'upcoming' : true)).length

  const enable = async () => {
    const ok = await requestBrowserNotifications()
    update((d) => ({ ...d, settings: { ...d.settings, browserNotifications: ok } }))
    ok ? toast.success('Browser alerts are on') : toast.error('Browser alerts are blocked', 'Allow notifications for this site in your browser settings.')
  }
  const add = <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'reminder', vehicleId: vehicleId || undefined })}>New reminder</Button>

  return (
    <>
      <PageHeader title="Reminders" subtitle="Services, renewals and anything else with a due date or odometer reading." actions={reminders.length > 0 && add} />
      {perm === 'default' && data.vehicles.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-[22px] bg-console px-5 py-4 text-console-fg on-console sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-3">
            <BellPlus aria-hidden className="mt-0.5 size-5 shrink-0 text-[#4ade80]" />
            <p className="min-w-0 text-sm">
              Want alerts outside this tab? Turn on browser notifications.
              <span className="mt-0.5 block text-console-muted">They arrive while the app is open in your browser. We also check every time you come back.</span>
            </p>
          </div>
          <Button onClick={enable} className="w-full sm:w-auto">Turn on alerts</Button>
        </div>
      )}
      {!reminders.length ? (
        <Panel>
          <EmptyState icon={BellRing} title="No reminders yet" message="Set one for insurance, registration or a service. Maintenance you log can schedule its own next reminder too." action={add} />
        </Panel>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="max-w-full overflow-x-auto scrollbar-none">
              <Segmented
                label="Show"
                value={view}
                onChange={setView}
                options={[
                  { value: 'active', label: `Active (${count('active')})` },
                  { value: 'attention', label: `Needs attention (${count('attention')})` },
                  { value: 'completed', label: `Completed (${count('completed')})` },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select aria-label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="h-10">
                <option value="">All vehicles</option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Panel>{items.length ? <ReminderList items={items} /> : <p className="py-10 text-center text-sm text-muted">{view === 'attention' ? 'Nothing needs attention right now. Nice!' : 'Nothing here.'}</p>}</Panel>
        </>
      )}
    </>
  )
}
