import { expect, type Page } from '@playwright/test'

/** yyyy-MM-dd, `days` from today in the browser's local time. */
export const isoDay = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Collects uncaught errors and console errors; assert it's empty at the end of a test. */
export function trackErrors(page: Page, ignore: RegExp = /$^/) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !ignore.test(m.text()) && errors.push(m.text()))
  return errors
}

export async function startOnboarding(page: Page, name: string) {
  await page.goto('/')
  await page.getByLabel('What should we call you?').fill(name)
  await page.getByRole('button', { name: "Let's get started" }).click()
}

/** Onboards with the sample garage (3 vehicles, a year of records). */
export async function onboardWithDemo(page: Page, name = 'Jishnu') {
  await startOnboarding(page, name)
  await page.getByRole('button', { name: 'Explore with a demo garage' }).click()
  await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
}

export interface NewVehicle {
  type?: string
  brand: string
  model: string
  odometer: string
  fuel?: string
  batteryKwh?: string
  rate?: string
}

/** Onboards with one vehicle of your own. */
export async function onboardWithVehicle(page: Page, name: string, v: NewVehicle) {
  await startOnboarding(page, name)
  if (v.type) await page.getByText(v.type, { exact: true }).click()
  await page.getByLabel('Brand').fill(v.brand)
  await page.getByLabel('Model').fill(v.model)
  if (v.fuel) await page.getByLabel('Fuel').selectOption(v.fuel)
  await page.getByLabel('Current odometer').fill(v.odometer)
  if (v.batteryKwh) await page.getByLabel(/Battery size/).fill(v.batteryKwh)
  if (v.rate) await page.getByLabel(/Home electricity rate/).fill(v.rate)
  await page.getByRole('button', { name: 'Add to my garage' }).click()
  await page.getByRole('button', { name: 'Explore my garage' }).click()
  await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
}

/** Opens an item from the + (Add / Quick add) menu. */
export async function quickAdd(page: Page, item: string) {
  await page.getByRole('button', { name: /^(Add|Quick add)$/ }).last().click()
  await page.getByRole('menuitem', { name: item }).click()
}
