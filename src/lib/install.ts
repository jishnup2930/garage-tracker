import { useSyncExternalStore } from 'react'

declare const __BUILD_ID__: string

// Chrome/Android fire `beforeinstallprompt`; we keep it so our own "Install" button can show the prompt.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallEvent | null = null
let justInstalled = false
const subs = new Set<() => void>()
const notify = () => subs.forEach((f) => f())

/** Call once at startup: registers the offline worker and listens for the install prompt. */
export function initApp() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    justInstalled = true
    notify()
  })
  if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register(`./sw.js?v=${__BUILD_ID__}`).catch(() => {})
  // Ask the browser not to clear our storage under pressure. Granted silently or not at all.
  navigator.storage?.persist?.().catch(() => {})
}

export const isInstalled = () => justInstalled || window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstall() {
  const ev = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => deferred,
  )
  return {
    installed: isInstalled(),
    canPrompt: !!ev,
    ios: isIOS(),
    prompt: async () => {
      if (!ev) return false
      try {
        await ev.prompt()
        const { outcome } = await ev.userChoice
        return outcome === 'accepted'
      } catch {
        return false // the prompt can only be shown once; the browser rejects repeats
      } finally {
        deferred = null
        notify()
      }
    },
  }
}
