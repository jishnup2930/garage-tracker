export type ID = string
/** Calendar date, `yyyy-MM-dd`. Kept date-only so due dates never shift across timezones. */
export type DateStr = string
/** Full ISO timestamp. */
export type Timestamp = string

export const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Scooter', 'SUV', 'Truck', 'Other'] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const DEFAULT_MAINTENANCE_CATEGORIES = [
  'Engine oil change',
  'Oil filter replacement',
  'Air filter replacement',
  'Brake pad replacement',
  'Brake fluid replacement',
  'Coolant replacement',
  'Tyre replacement',
  'Tyre rotation',
  'Battery replacement',
  'Chain lubrication',
  'General servicing',
  'Wheel alignment',
  'Other',
] as const

export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Maintenance',
  'Repairs',
  'Insurance',
  'Registration',
  'Accessories',
  'Parking',
  'Tolls',
  'Cleaning',
  'Other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
/** Fuel and Maintenance come from their own records, so manual expenses can't use them (no double counting). */
export const MANUAL_EXPENSE_CATEGORIES = EXPENSE_CATEGORIES.filter(
  (c) => c !== 'Fuel' && c !== 'Maintenance',
) as Exclude<ExpenseCategory, 'Fuel' | 'Maintenance'>[]

export const REMINDER_CATEGORIES = [
  'Oil change',
  'Tyre replacement',
  'General servicing',
  'Insurance renewal',
  'Registration renewal',
  'Battery replacement',
  'Pollution certificate renewal',
  'Custom',
] as const
export type ReminderCategory = (typeof REMINDER_CATEGORIES)[number]

export const LEAD_TIMES = [30, 15, 7, 3, 1, 0] as const

export interface Vehicle {
  id: ID
  nickname: string
  type: VehicleType
  brand: string
  model: string
  registrationNumber?: string
  fuelType: FuelType
  currentOdometer: number
  purchaseDate?: DateStr
  image?: string
  demo?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Maintenance {
  id: ID
  vehicleId: ID
  category: string
  description?: string
  date: DateStr
  odometer: number
  amount: number
  serviceProvider?: string
  nextDueDate?: DateStr
  nextDueOdometer?: number
  notes?: string
  receipt?: string
  demo?: boolean
  createdAt: Timestamp
}

export interface FuelEntry {
  id: ID
  vehicleId: ID
  date: DateStr
  odometer: number
  fuelType: FuelType
  /** Litres, or kWh for electric. */
  quantity: number
  pricePerUnit: number
  totalCost: number
  isFullTank: boolean
  fuelStation?: string
  notes?: string
  demo?: boolean
  createdAt: Timestamp
}

export interface Expense {
  id: ID
  vehicleId: ID
  category: ExpenseCategory
  amount: number
  date: DateStr
  description: string
  notes?: string
  receipt?: string
  demo?: boolean
  createdAt: Timestamp
}

export interface Reminder {
  id: ID
  vehicleId: ID
  title: string
  category: ReminderCategory
  dueDate?: DateStr
  dueOdometer?: number
  /** Days before the due date to start alerting. */
  leadTime: number
  status: 'active' | 'completed'
  completedAt?: Timestamp
  snoozedUntil?: DateStr
  /** Alert stages already sent, keyed by stage + due target, so each alert fires once. */
  notifiedKeys: string[]
  lastNotifiedAt?: Timestamp
  /** Maintenance record that scheduled this reminder, if any. */
  maintenanceId?: ID
  notes?: string
  demo?: boolean
  createdAt: Timestamp
}

export interface AppNotification {
  id: ID
  title: string
  message: string
  vehicleId?: ID
  reminderId?: ID
  type: 'upcoming' | 'due' | 'overdue' | 'info'
  isRead: boolean
  createdAt: Timestamp
}

export interface User {
  id: ID
  firstName: string
  avatar?: string
  createdAt: Timestamp
}

export type ThemePref = 'light' | 'dark' | 'system'
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd' | 'd MMM yyyy'

export interface Settings {
  currency: string
  distanceUnit: 'km' | 'mi'
  volumeUnit: 'L' | 'gal'
  dateFormat: DateFormat
  theme: ThemePref
  browserNotifications: boolean
  inAppReminders: boolean
  defaultLeadTime: number
  sidebarCollapsed: boolean
  dashboardRange: ChartRange
  onboarded: boolean
}

export type ChartRange = '7d' | '30d' | '6m' | '12m'

export interface AppData {
  version: number
  user: User | null
  settings: Settings
  vehicles: Vehicle[]
  maintenance: Maintenance[]
  fuel: FuelEntry[]
  expenses: Expense[]
  reminders: Reminder[]
  notifications: AppNotification[]
  customMaintenanceCategories: string[]
}

/** A single spend line, unified across fuel, maintenance and manual expenses. */
export interface CostLine {
  id: ID
  source: 'fuel' | 'maintenance' | 'expense'
  vehicleId: ID
  date: DateStr
  category: ExpenseCategory
  amount: number
  description: string
  notes?: string
}
