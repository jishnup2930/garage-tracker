import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, TriangleAlert, Info, X } from 'lucide-react'
import { uid } from '../../lib/id'
import { cn } from '../../lib/cn'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: string
  tone: Tone
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
}
interface ToastApi {
  show: (t: Omit<ToastItem, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
}

const Ctx = createContext<ToastApi | null>(null)
const ICON = { success: CircleCheck, error: TriangleAlert, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: string) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const show = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = uid()
      setItems((xs) => [...xs.slice(-2), { ...t, id }])
      setTimeout(() => dismiss(id), t.tone === 'error' ? 8000 : 4500)
    },
    [dismiss],
  )
  const api = useMemo<ToastApi>(
    () => ({ show, success: (title, message) => show({ tone: 'success', title, message }), error: (title, message) => show({ tone: 'error', title, message }) }),
    [show],
  )
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICON[t.tone]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-console p-3.5 text-console-fg shadow-soft on-console"
              >
                <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', t.tone === 'error' ? 'text-[#ff8a8a]' : 'text-accent')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-sm text-console-muted">{t.message}</p>}
                  {t.action && (
                    <button className="mt-1.5 text-sm font-semibold text-accent hover:underline" onClick={() => (t.action!.onClick(), dismiss(t.id))}>
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded-md p-1 text-console-muted hover:text-console-fg">
                  <X className="size-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast outside ToastProvider')
  return c
}
