import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useGarage } from './AppStore'

export type FormKind = 'vehicle' | 'maintenance' | 'fuel' | 'expense' | 'reminder' | 'paper' | 'odometer' | 'schedule'
export interface FormSpec {
  kind: FormKind
  /** Record to edit; omitted for new. */
  id?: string
  vehicleId?: string
}
interface ConfirmOpts {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
}
interface UI {
  form: FormSpec | null
  openForm: (f: FormSpec) => void
  closeForm: () => void
  confirm: (o: ConfirmOpts) => Promise<boolean>
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
}

const Ctx = createContext<UI | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<FormSpec | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dialog, setDialog] = useState<ConfirmOpts | null>(null)
  const resolver = useRef<(v: boolean) => void>(undefined)

  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>((res) => {
        resolver.current = res
        setDialog(o)
      }),
    [],
  )
  const settle = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = undefined
    setDialog(null)
  }

  const { data } = useGarage()
  const dataRef = useRef(data)
  dataRef.current = data
  // A reminder that tracks a paper is edited through the paper, wherever it's opened from,
  // so the reminder's date and vehicle can't drift away from the paper's.
  const openForm = useCallback((f: FormSpec) => {
    const d = dataRef.current
    const paperId = f.kind === 'reminder' && f.id ? d.reminders.find((r) => r.id === f.id)?.paperId : undefined
    setForm(paperId && d.papers.some((p) => p.id === paperId) ? { kind: 'paper', id: paperId } : f)
  }, [])
  const value = useMemo<UI>(() => ({ form, openForm, closeForm: () => setForm(null), confirm, searchOpen, setSearchOpen }), [form, openForm, confirm, searchOpen])
  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal
        open={!!dialog}
        onClose={() => settle(false)}
        size="sm"
        title={dialog?.title ?? ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button data-autofocus variant={dialog?.danger ? 'danger' : 'dark'} onClick={() => settle(true)}>
              {dialog?.confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm text-muted">{dialog?.message}</div>
      </Modal>
    </Ctx.Provider>
  )
}

export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI outside UIProvider')
  return c
}
