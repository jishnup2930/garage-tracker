import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Wrench, Fuel, BellRing, Wallet } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Odometer } from '../../components/ui/Odometer'
import { VehicleThumb } from '../../components/VehicleThumb'
import { Plate } from '../../components/ui/Badge'
import { VehicleForm } from '../forms/VehicleForm'
import { loadDemo } from '../../store/ops'
import { nowIso, uid } from '../../lib/id'
import { num } from '../../lib/format'
import type { Vehicle } from '../../types'

type Step = 1 | 2 | 3

export function Onboarding() {
  const { data, update } = useGarage()
  const [step, setStep] = useState<Step>(data.user ? 2 : 1)
  const [name, setName] = useState(data.user?.firstName ?? '')
  const [error, setError] = useState<string>()
  const [added, setAdded] = useState<Vehicle>()
  const formId = useId()
  const first = data.user?.firstName ?? name.trim()

  const saveName = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Tell us what to call you')
    if (n.length > 30) return setError('Keep it under 30 characters')
    if (update((d) => ({ ...d, user: { id: d.user?.id ?? uid(), createdAt: d.user?.createdAt ?? nowIso(), avatar: d.user?.avatar, firstName: n } }))) setStep(2)
  }
  const finish = (demo = false) => update((d) => ({ ...(demo ? loadDemo(d) : d), settings: { ...d.settings, onboarded: true } }))

  const copy = {
    1: { h: 'Your garage. Your rules.', p: "Every vehicle has a story. Let's make sure you never miss a moment that matters." },
    2: { h: `Hey ${first}, what do you drive?`, p: 'Start with one vehicle. You can add the rest, and fill in any details, later.' },
    3: { h: `You're all set, ${first}! Your garage is ready.`, p: 'Here is what your garage companion keeps track of for you.' },
  }[step]

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(380px,0.9fr)_1.1fr]">
      <aside className="on-console relative flex flex-col justify-between overflow-hidden bg-console px-6 pt-8 pb-10 text-console-fg sm:px-10 lg:sticky lg:top-0 lg:h-dvh lg:py-12">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
            <rect width="32" height="32" rx="9" fill="var(--accent)" />
            <path d="M7 19l2.2-6.1A2 2 0 0 1 11.1 11.5h9.8a2 2 0 0 1 1.9 1.4L25 19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="#1b1d21" />
          </svg>
          <span className="font-display text-lg font-bold">Garage</span>
        </div>
        <div className="mt-10 lg:mt-0">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <h1 className="font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-[56px]">{copy.h}</h1>
              <p className="mt-4 max-w-[42ch] text-[17px] text-console-muted">{copy.p}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* The odometer ticks forward one step as you go. */}
        <div className="mt-10 hidden items-end justify-between lg:flex">
          <div>
            <div className="flex rounded-lg bg-black/40 px-3 py-2 font-display text-[34px] leading-none font-semibold text-console-fg ring-1 ring-white/10">
              <Odometer value={`00000${step}`} />
            </div>
            <p className="mt-2 text-xs text-console-muted">Step {step} of 3</p>
          </div>
        </div>
      </aside>

      <main className="flex items-start justify-center px-5 py-8 sm:px-10 lg:items-center lg:py-12">
        <div className="w-full max-w-xl">
          <ol className="mb-8 flex gap-2" aria-label="Progress">
            {[1, 2, 3].map((n) => (
              <li key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? 'bg-fg' : 'bg-line'}`} aria-current={n === step ? 'step' : undefined}>
                <span className="sr-only">Step {n}{n < step ? ', done' : ''}</span>
              </li>
            ))}
          </ol>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
              {step === 1 && (
                <form onSubmit={saveName} noValidate className="space-y-6">
                  <Field label="What should we call you?" error={error}>
                    {(p) => <Input {...p} autoFocus autoComplete="given-name" placeholder="Your first name" value={name} onChange={(e) => (setName(e.target.value), setError(undefined))} className="h-14 text-lg" />}
                  </Field>
                  <Button type="submit" size="lg" className="w-full sm:w-auto">
                    Let's get started
                  </Button>
                  <p className="text-sm text-muted">Everything you add stays in this browser. No account, no cloud.</p>
                </form>
              )}
              {step === 2 && (
                <div>
                  <VehicleForm formId={formId} onSaved={(v) => (setAdded(v), setStep(3))} />
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button type="submit" form={formId} size="lg">
                      Add to my garage
                    </Button>
                    <Button variant="ghost" size="lg" onClick={() => setStep(3)}>
                      Skip for now
                    </Button>
                  </div>
                  <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
                    Just looking around?{' '}
                    <button className="font-semibold text-fg underline underline-offset-2" onClick={() => finish(true)}>
                      Explore with a demo garage
                    </button>{' '}
                    instead. You can clear it from Settings.
                  </p>
                </div>
              )}
              {step === 3 && (
                <div>
                  {added ? (
                    <div className="mb-8 flex items-center gap-4 rounded-[22px] border border-line bg-surface p-3">
                      <VehicleThumb vehicle={added} className="h-20 w-28 rounded-2xl" iconClass="size-10" />
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl font-semibold">{added.nickname}</p>
                        <p className="truncate text-sm text-muted">
                          {added.brand} {added.model}, {num(added.currentOdometer)} {data.settings.distanceUnit}
                        </p>
                        {added.registrationNumber && <Plate className="mt-1.5">{added.registrationNumber}</Plate>}
                      </div>
                    </div>
                  ) : (
                    <p className="mb-8 rounded-2xl bg-surface-2 p-4 text-sm text-muted">No vehicle yet, and that's fine. Add one from My Garage whenever you're ready.</p>
                  )}
                  <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {[
                      [Wrench, 'Maintenance', 'Log services and get the next one scheduled by date or distance.'],
                      [Fuel, 'Fuel', 'Log refills to see real mileage and cost per kilometre.'],
                      [BellRing, 'Reminders', 'Insurance, registration and services, flagged before they are due.'],
                      [Wallet, 'Expenses', 'What each vehicle really costs, with fuel and services counted once.'],
                    ].map(([Icon, t, d]) => {
                      const I = Icon as typeof Wrench
                      return (
                        <li key={t as string} className="flex gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
                            <I className="size-[18px]" />
                          </span>
                          <span>
                            <span className="block font-semibold">{t as string}</span>
                            <span className="block text-sm text-muted">{d as string}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <Button size="lg" className="mt-10" onClick={() => finish()}>
                    Explore my garage
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
