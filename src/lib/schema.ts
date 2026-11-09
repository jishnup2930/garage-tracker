import { z } from 'zod'
import {
  EXPENSE_CATEGORIES,
  FUEL_TYPES,
  REMINDER_CATEGORIES,
  VEHICLE_TYPES,
  type AppData,
  type Settings,
} from '../types'

export const SCHEMA_VERSION = 2

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-MM-dd')
const ts = z.string().min(1)
const opt = <T extends z.ZodTypeAny>(s: T) => s.optional().nullable().transform((v) => v ?? undefined)
const money = z.number().finite().min(0)

export const vehicleSchema = z.object({
  id: z.string().min(1),
  nickname: z.string().min(1),
  type: z.enum(VEHICLE_TYPES),
  brand: z.string(),
  model: z.string(),
  registrationNumber: opt(z.string()),
  fuelType: z.enum(FUEL_TYPES),
  currentOdometer: z.number().finite().min(0),
  purchaseDate: opt(date),
  image: opt(z.string()),
  demo: opt(z.boolean()),
  createdAt: ts,
  updatedAt: ts,
})

export const maintenanceSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  category: z.string().min(1),
  description: opt(z.string()),
  date,
  odometer: z.number().finite().min(0),
  amount: money,
  serviceProvider: opt(z.string()),
  nextDueDate: opt(date),
  nextDueOdometer: opt(z.number().finite()),
  notes: opt(z.string()),
  receipt: opt(z.string()),
  demo: opt(z.boolean()),
  createdAt: ts,
})

export const fuelSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  date,
  odometer: z.number().finite().min(0),
  fuelType: z.enum(FUEL_TYPES),
  quantity: z.number().finite().positive(),
  pricePerUnit: money,
  totalCost: money,
  isFullTank: z.boolean(),
  fuelStation: opt(z.string()),
  notes: opt(z.string()),
  demo: opt(z.boolean()),
  createdAt: ts,
})

export const expenseSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: money,
  date,
  description: z.string(),
  notes: opt(z.string()),
  receipt: opt(z.string()),
  demo: opt(z.boolean()),
  createdAt: ts,
})

export const reminderSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(REMINDER_CATEGORIES),
  dueDate: opt(date),
  dueOdometer: opt(z.number().finite()),
  leadTime: z.number().int().min(0),
  status: z.enum(['active', 'completed']),
  completedAt: opt(ts),
  snoozedUntil: opt(date),
  notifiedKeys: z.array(z.string()).default([]),
  lastNotifiedAt: opt(ts),
  maintenanceId: opt(z.string()),
  notes: opt(z.string()),
  demo: opt(z.boolean()),
  createdAt: ts,
})

export const notificationSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  message: z.string(),
  vehicleId: opt(z.string()),
  reminderId: opt(z.string()),
  type: z.enum(['upcoming', 'due', 'overdue', 'info']),
  isRead: z.boolean(),
  createdAt: ts,
})

export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
  distanceUnit: 'km',
  volumeUnit: 'L',
  dateFormat: 'dd/MM/yyyy',
  theme: 'system',
  browserNotifications: false,
  inAppReminders: true,
  defaultLeadTime: 7,
  sidebarCollapsed: false,
  dashboardRange: '6m',
  onboarded: false,
}

const settingsSchema = z.object({
  currency: z.string().min(3).max(3).catch(DEFAULT_SETTINGS.currency),
  distanceUnit: z.enum(['km', 'mi']).catch('km'),
  volumeUnit: z.enum(['L', 'gal']).catch('L'),
  dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'd MMM yyyy']).catch('dd/MM/yyyy'),
  theme: z.enum(['light', 'dark', 'system']).catch('system'),
  browserNotifications: z.boolean().catch(false),
  inAppReminders: z.boolean().catch(true),
  defaultLeadTime: z.number().int().min(0).catch(7),
  sidebarCollapsed: z.boolean().catch(false),
  dashboardRange: z.enum(['7d', '30d', '6m', '12m']).catch('6m'),
  onboarded: z.boolean().catch(false),
})

export const appDataSchema = z.object({
  version: z.number().int(),
  user: z
    .object({ id: z.string(), firstName: z.string().min(1), avatar: opt(z.string()), createdAt: ts })
    .nullable(),
  settings: settingsSchema,
  vehicles: z.array(vehicleSchema),
  maintenance: z.array(maintenanceSchema),
  fuel: z.array(fuelSchema),
  expenses: z.array(expenseSchema),
  reminders: z.array(reminderSchema),
  notifications: z.array(notificationSchema),
  customMaintenanceCategories: z.array(z.string()).default([]),
})

export const emptyData = (): AppData => ({
  version: SCHEMA_VERSION,
  user: null,
  settings: { ...DEFAULT_SETTINGS },
  vehicles: [],
  maintenance: [],
  fuel: [],
  expenses: [],
  reminders: [],
  notifications: [],
  customMaintenanceCategories: [],
})
