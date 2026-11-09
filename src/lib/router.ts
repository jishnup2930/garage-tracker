import { useSyncExternalStore } from 'react'

export const PAGES = ['overview', 'garage', 'maintenance', 'reminders', 'fuel', 'expenses', 'analytics', 'settings'] as const
export type Page = (typeof PAGES)[number]
export interface Route {
  page: Page
  id?: string
}

/** Hash routing: works on any static host and from a local folder, no server rewrites needed. */
function parse(hash: string): Route {
  const [page, id] = hash.replace(/^#\/?/, '').split('/')
  return (PAGES as readonly string[]).includes(page) ? { page: page as Page, id: id || undefined } : { page: 'overview' }
}

const subscribe = (cb: () => void) => (window.addEventListener('hashchange', cb), () => window.removeEventListener('hashchange', cb))

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parse(hash)
}

export function navigate(page: Page, id?: string) {
  window.location.hash = `/${page}${id ? `/${id}` : ''}`
}
