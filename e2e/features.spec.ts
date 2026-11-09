import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { isoDay, onboardWithVehicle, quickAdd, trackErrors } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true })

test('service schedule, km update, papers, calendar export and backup', async ({ page, context }) => {
  const errors = trackErrors(page)
  await onboardWithVehicle(page, 'Asha', { type: 'Motorcycle', brand: 'Bajaj', model: 'Pulsar', odometer: '10000' })
  const dialog = page.getByRole('dialog')

  // Suggestions, then the usual schedule for a petrol motorcycle.
  await expect(page.getByText('Back up your garage')).toBeVisible()
  await expect(page.getByText('No reminders for Bajaj Pulsar')).toBeVisible()
  await page.getByRole('button', { name: 'Set up' }).click()
  await expect(dialog.getByText('Chain lubrication')).toBeVisible()
  await expect(dialog.getByText('every 3,000 km or 6 months')).toBeVisible()
  await dialog.getByText('Air filter replacement').click() // untick one
  await page.getByRole('button', { name: 'Add reminders' }).click()
  await expect(page.getByText('3 reminders added')).toBeVisible()
  await page.goto('/#/reminders')
  await expect(page.getByText('13,000 km').first()).toBeVisible() // 10,000 + 3,000

  // Quick km update: lower readings are refused.
  await quickAdd(page, 'Update km')
  await dialog.getByLabel('Odometer now').fill('9000')
  await page.getByRole('button', { name: 'Save reading' }).click()
  await expect(dialog.getByText(/Lower than the last reading/)).toBeVisible()
  await dialog.getByLabel('Odometer now').fill('10250')
  await page.getByRole('button', { name: 'Save reading' }).click()
  await page.goto('/#/garage')
  await expect(page.getByText('10,250 km').first()).toBeVisible()

  // After 30 days without a reading, the Overview asks for one.
  await page.evaluate((old) => {
    const d = JSON.parse(localStorage.getItem('garage.data')!)
    d.vehicles[0].odometerAt = old
    d.vehicles[0].createdAt = `${old}T00:00:00.000Z`
    localStorage.setItem('garage.data', JSON.stringify(d))
  }, isoDay(-30))
  await page.goto('/')
  await page.reload()
  await expect(page.getByText('Update km for Bajaj Pulsar')).toBeVisible()
  await expect(page.getByText(/Last reading 30 days ago/)).toBeVisible()

  // Papers create their own renewal reminder.
  await quickAdd(page, 'Add vehicle papers')
  await dialog.getByLabel('Paper').selectOption('Pollution certificate (PUC)')
  await dialog.getByLabel('Valid until').fill(isoDay(5))
  await dialog.getByLabel('Certificate number').fill('PUC123')
  await page.getByRole('button', { name: 'Save papers' }).click()
  await page.goto('/#/reminders')
  await expect(page.getByRole('button', { name: 'Pollution certificate renewal', exact: true })).toBeVisible()
  await page.goto('/#/garage')
  await page.locator('article a').first().click()
  await page.getByText(/^Papers \(/).click()
  await expect(page.getByText('Valid for 5 more days')).toBeVisible()

  // Tapping the paper's reminder opens the paper, so the two can't drift apart.
  await page.goto('/#/reminders')
  await page.getByRole('button', { name: 'Pollution certificate renewal', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Edit papers' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Calendar export: all-day event with an alert 7 days before at 9am.
  await page.getByRole('button', { name: 'More actions for Pollution certificate renewal' }).click()
  const [ics] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Add to phone calendar' }).click()])
  expect(ics.suggestedFilename()).toMatch(/\.ics$/)
  const text = readFileSync(await ics.path(), 'utf8')
  expect(text).toContain(`DTSTART;VALUE=DATE:${isoDay(5).replaceAll('-', '')}`)
  expect(text).toContain('TRIGGER:-P6DT15H')
  await page.getByRole('button', { name: 'More actions for Pollution certificate renewal' }).click()
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('menuitem', { name: 'Add to Google Calendar' }).click()])
  await expect.poll(() => popup.url()).toMatch(/google\.com/)
  await popup.close()

  // A backup includes papers and clears the nudge.
  await page.goto('/')
  const [backup] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  expect(JSON.parse(readFileSync(await backup.path(), 'utf8')).data.papers).toHaveLength(1)
  await expect(page.getByText('Back up your garage')).toBeHidden()

  // A new vehicle is offered its usual schedule straight away.
  await quickAdd(page, 'Add a vehicle')
  await page.getByText('Car', { exact: true }).click()
  await dialog.getByLabel('Brand').fill('Maruti')
  await dialog.getByLabel('Model').fill('Swift')
  await dialog.getByLabel('Current odometer').fill('42000')
  await page.getByRole('button', { name: 'Save vehicle' }).click()
  await expect(page.getByRole('dialog', { name: 'Usual service reminders' })).toBeVisible()
  await expect(dialog.getByText('Tyre rotation')).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  expect(errors).toEqual([])
})
