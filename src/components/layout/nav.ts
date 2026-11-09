import { Gauge, Warehouse, Wrench, BellRing, Fuel, Wallet, ChartColumn, Settings, type LucideIcon } from 'lucide-react'
import type { Page } from '../../lib/router'

export const NAV: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: 'overview', label: 'Overview', icon: Gauge },
  { page: 'garage', label: 'My Garage', icon: Warehouse },
  { page: 'maintenance', label: 'Maintenance', icon: Wrench },
  { page: 'reminders', label: 'Reminders', icon: BellRing },
  { page: 'fuel', label: 'Fuel & Mileage', icon: Fuel },
  { page: 'expenses', label: 'Expenses', icon: Wallet },
  { page: 'analytics', label: 'Analytics', icon: ChartColumn },
  { page: 'settings', label: 'Settings', icon: Settings },
]
export const pageLabel = (p: Page) => NAV.find((n) => n.page === p)!.label
