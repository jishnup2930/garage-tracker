import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useGarage } from './store/AppStore'
import { useRoute, type Page } from './lib/router'
import { useTheme } from './hooks/useTheme'
import { useReminderEngine } from './hooks/useReminderEngine'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { MobileNav } from './components/layout/MobileNav'
import { SearchDialog } from './components/layout/SearchDialog'
import { pageLabel } from './components/layout/nav'
import { FormHost } from './features/forms/FormHost'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageSkeleton } from './components/ui/EmptyState'
import { Onboarding } from './features/onboarding/Onboarding'
import { DashboardPage } from './features/dashboard/DashboardPage'

const GaragePage = lazy(() => import('./features/garage/GaragePage').then((m) => ({ default: m.GaragePage })))
const MaintenancePage = lazy(() => import('./features/maintenance/MaintenancePage').then((m) => ({ default: m.MaintenancePage })))
const RemindersPage = lazy(() => import('./features/reminders/RemindersPage').then((m) => ({ default: m.RemindersPage })))
const FuelPage = lazy(() => import('./features/fuel/FuelPage').then((m) => ({ default: m.FuelPage })))
const ExpensesPage = lazy(() => import('./features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageView({ page, id }: { page: Page; id?: string }) {
  switch (page) {
    case 'overview':
      return <DashboardPage />
    case 'garage':
      return <GaragePage id={id} />
    case 'maintenance':
      return <MaintenancePage />
    case 'reminders':
      return <RemindersPage />
    case 'fuel':
      return <FuelPage />
    case 'expenses':
      return <ExpensesPage />
    case 'analytics':
      return <AnalyticsPage />
    case 'settings':
      return <SettingsPage />
  }
}

export default function App() {
  const { data } = useGarage()
  const route = useRoute()
  useTheme(data.settings.theme)
  useReminderEngine()

  const title = route.page === 'garage' && route.id ? (data.vehicles.find((v) => v.id === route.id)?.nickname ?? 'Vehicle') : pageLabel(route.page)
  useEffect(() => {
    document.title = `${title} | Garage Tracker`
    window.scrollTo({ top: 0 })
  }, [title, route.page, route.id])

  return (
    <MotionConfig reducedMotion="user">
      {!data.settings.onboarded ? (
        <Onboarding />
      ) : (
        <div className="flex min-h-dvh">
          <a href="#main" className="sr-only z-50 rounded-lg bg-fg px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
            Skip to content
          </a>
          <Sidebar page={route.page} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar title={title} />
            <main id="main" className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
              <ErrorBoundary resetKey={`${route.page}/${route.id}`}>
                <Suspense fallback={<PageSkeleton />}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={`${route.page}/${route.id ?? ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                      <PageView page={route.page} id={route.id} />
                    </motion.div>
                  </AnimatePresence>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
          <MobileNav page={route.page} />
          <SearchDialog />
          <FormHost />
        </div>
      )}
    </MotionConfig>
  )
}
