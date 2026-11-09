import { expect, test } from '@playwright/test'
import { onboardWithDemo, trackErrors } from './helpers'

const WIDTH = 360
test.use({ viewport: { width: WIDTH, height: 780 }, isMobile: true, hasTouch: true })

test('every page fits a 360px phone without sideways scrolling', async ({ page }) => {
  const errors = trackErrors(page)
  await onboardWithDemo(page)
  for (const route of ['', 'garage', 'maintenance', 'reminders', 'fuel', 'expenses', 'analytics', 'settings']) {
    await page.goto(`/#/${route}`)
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `#/${route}`).toBeLessThanOrEqual(WIDTH)
  }
  await page.goto('/#/garage')
  await page.locator('article a').first().click()
  await expect(page.locator('h1').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(WIDTH)
  expect(errors).toEqual([])
})
