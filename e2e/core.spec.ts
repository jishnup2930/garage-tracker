import { expect, test } from '@playwright/test'
import { isoDay, onboardWithVehicle, quickAdd, startOnboarding, trackErrors } from './helpers'

test.use({ viewport: { width: 1280, height: 860 } })

test('onboarding validates and names the vehicle by brand and model', async ({ page }) => {
  await startOnboarding(page, 'Asha')
  await page.getByRole('button', { name: 'Add to my garage' }).click()
  await expect(page.getByText('Brand is required')).toBeVisible()
  await page.getByLabel('Brand').fill('Honda')
  await page.getByLabel('Model').fill('City')
  await page.getByLabel('Current odometer').fill('25000')
  await page.getByRole('button', { name: 'Add to my garage' }).click()
  await expect(page.getByText("You're all set").first()).toBeVisible()
  await expect(page.getByText('Honda City').first()).toBeVisible()
})

test('core flow: refills by amount, reminders, expenses, backup and recovery', async ({ page }, info) => {
  const errors = trackErrors(page)
  await onboardWithVehicle(page, 'Asha', { brand: 'Honda', model: 'City', odometer: '25000' })

  // Paid by amount, never full: ₹500 @25,000, ₹500 @25,220, ₹400 @25,450 at ₹100/L -> 450 km / 10 L = 45 km/L.
  for (const [odo, amt, i] of [['25000', '500', 0], ['25220', '500', 1], ['25450', '400', 2]] as const) {
    await quickAdd(page, 'Log a refill')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Amount paid').fill(amt)
    await dialog.getByLabel('Odometer').fill(odo)
    if (i === 0) {
      await dialog.getByRole('textbox', { name: /Price per/ }).fill('100')
      await expect(dialog.getByText('5 L', { exact: true })).toBeVisible()
    } else await expect(dialog.getByText('at ₹100 per L')).toBeVisible()
    await page.getByRole('button', { name: 'Save refill' }).click()
    await expect(dialog).toBeHidden()
  }
  await page.goto('/#/fuel')
  await expect(page.getByText('45', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('₹2.22').first()).toBeVisible() // ₹1,000 / 450 km
  await expect(page.getByText(/rough, from 3 refills/).first()).toBeVisible()

  // A price typo that works out to ~0 litres is rejected, not saved.
  await quickAdd(page, 'Log a refill')
  await page.getByRole('dialog').getByLabel('Amount paid').fill('5')
  await page.getByRole('dialog').getByLabel('Odometer').fill('25460')
  await page.getByRole('button', { name: 'Change price' }).click()
  await page.getByRole('textbox', { name: /Price per/ }).fill('105000')
  await page.getByRole('button', { name: 'Save refill' }).click()
  await expect(page.getByText('Check the price. This works out to almost no fuel.')).toBeVisible()
  await page.keyboard.press('Escape')

  // Maintenance that schedules the next one by distance.
  await quickAdd(page, 'Log maintenance')
  await page.getByLabel('Amount spent').fill('3000')
  await page.getByLabel('After').fill('5000')
  await page.getByRole('button', { name: 'Save maintenance' }).click()
  await page.goto('/#/reminders')
  await expect(page.getByText(/at 30,450 km/)).toBeVisible()

  // An overdue dated reminder raises exactly one in-app notification.
  await page.getByRole('button', { name: 'New reminder' }).click()
  await page.getByLabel('Category').selectOption('Insurance renewal')
  await page.getByLabel('Due date').fill(isoDay(-8))
  await page.getByRole('button', { name: 'Save reminder' }).click()
  await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Notifications, 1 unread/ })).toBeVisible()

  // Totals count fuel and maintenance once: 3,000 + 1,400 + 1,500 = 5,900.
  await quickAdd(page, 'Add an expense')
  await page.getByLabel('Amount').fill('1500')
  await page.getByLabel('Description').fill('Car wash')
  await page.getByLabel('Category').selectOption('Cleaning')
  await page.getByRole('button', { name: 'Save expense' }).click()
  await page.goto('/#/expenses')
  await expect(page.getByText('₹5,900').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('₹5,900').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Notifications, 1 unread/ })).toBeVisible()

  // Backup, reset, restore.
  await page.goto('/#/settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  const file = info.outputPath('backup.json')
  await download.saveAs(file)
  await page.getByRole('button', { name: 'Reset all data' }).click()
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await expect(page.getByText('Your garage. Your rules.')).toBeVisible()
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('garage.data')!)
    d.settings.onboarded = true
    d.user = { id: 'x', firstName: 'T', createdAt: new Date().toISOString() }
    localStorage.setItem('garage.data', JSON.stringify(d))
  })
  await page.goto('/#/settings')
  await page.reload()
  await page.getByLabel('Choose a backup file').setInputFiles(file)
  await page.getByRole('button', { name: 'Replace and restore' }).click()
  await page.goto('/#/expenses')
  await expect(page.getByText('₹5,900').first()).toBeVisible()

  // Unreadable storage is set aside, not crashed on.
  await page.evaluate(() => localStorage.setItem('garage.data', '{broken'))
  await page.reload()
  await expect(page.getByText('Data recovery')).toBeVisible()
  expect(errors).toEqual([])
})
