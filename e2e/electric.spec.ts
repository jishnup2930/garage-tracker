import { expect, test } from '@playwright/test'
import { onboardWithVehicle, trackErrors } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('electric: charges logged by battery %, exact range per full charge', async ({ page }) => {
  const errors = trackErrors(page)
  await onboardWithVehicle(page, 'Asha', { type: 'Scooter', brand: 'Ather', model: 'Rizta', fuel: 'Electric', odometer: '1000', batteryKwh: '3', rate: '8' })

  for (const [odo, i] of [['1000', 0], ['1080', 1]] as const) {
    await page.goto('/#/fuel')
    await page.getByRole('button', { name: 'Log a charge' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Log a charge' })
    await dialog.getByLabel('Battery before charging').fill('20')
    await expect(dialog.getByLabel('Battery after charging')).toHaveValue('100')
    await dialog.getByLabel('Odometer').fill(odo)
    if (i === 0) {
      await expect(dialog.getByText('Charged 80%, 2.4 kWh')).toBeVisible()
      await expect(dialog.getByText(/About ₹19\.2 at your home rate/)).toBeVisible() // 2.4 kWh x ₹8
    }
    await page.getByRole('button', { name: 'Save charge' }).click()
    await expect(dialog).toBeHidden()
  }

  // Charged to 100%, rode 80 km, back at 20%: 80% for 80 km = 100 km per full charge.
  await page.goto('/#/fuel')
  await expect(page.getByText('Range per full charge').first()).toBeVisible()
  await expect(page.getByText('100', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/from 2 charges/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Log a charge' }).first().click()
  await page.getByRole('dialog').getByLabel('Battery before charging').fill('90')
  await page.getByRole('dialog').getByLabel('Battery after charging').fill('50')
  await page.getByRole('button', { name: 'Save charge' }).click()
  await expect(page.getByText('Should be higher than before charging')).toBeVisible()
  expect(errors).toEqual([])
})
