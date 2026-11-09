import { useGarage } from '../../store/AppStore'
import { useToast } from '../../components/ui/Toast'
import { patchReminder } from '../../store/ops'
import { snoozeUntil } from '../../lib/calc'
import { nowIso } from '../../lib/id'

export function useReminderActions() {
  const { update, data } = useGarage()
  const toast = useToast()
  const name = data.user?.firstName
  return {
    complete: (id: string) =>
      update((d) => patchReminder(d, id, { status: 'completed', completedAt: nowIso(), snoozedUntil: undefined })) &&
      toast.show({
        tone: 'success',
        title: `Nice work${name ? `, ${name}` : ''}!`,
        message: 'Marked as done. Your vehicle is taken care of.',
        action: { label: 'Undo', onClick: () => update((d) => patchReminder(d, id, { status: 'active', completedAt: undefined })) },
      }),
    reopen: (id: string) => update((d) => patchReminder(d, id, { status: 'active', completedAt: undefined })) && toast.success('Reminder reopened'),
    // Clearing sent stages makes the reminder alert again once the snooze ends.
    snooze: (id: string, days: number) =>
      update((d) => patchReminder(d, id, { snoozedUntil: snoozeUntil(days), notifiedKeys: [] })) &&
      toast.success(`Snoozed for ${days === 1 ? 'a day' : days === 7 ? 'a week' : `${days} days`}`),
  }
}
