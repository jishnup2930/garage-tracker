import { useGarage } from '../../store/AppStore'
import { useToast } from '../../components/ui/Toast'
import { buildBackup, downloadFile } from '../../lib/storage'
import { todayStr } from '../../lib/calc'
import { nowIso } from '../../lib/id'

/** Downloads a backup file and remembers when, so we can nudge when the last one is old. */
export function useBackup() {
  const { data, update } = useGarage()
  const toast = useToast()
  return () => {
    downloadFile(`garage-backup-${todayStr()}.json`, buildBackup(data), 'application/json')
    update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: nowIso() } }))
    toast.success('Backup downloaded', 'Keep it somewhere safe, like Google Drive or email. You can restore it from Settings.')
  }
}
