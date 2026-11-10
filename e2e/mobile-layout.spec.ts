import { expect, test } from '@playwright/test'
import { onboardWithDemo, quickAdd, trackErrors } from './helpers'

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

test('forms open centred and fully on screen', async ({ page }) => {
  await onboardWithDemo(page)
  for (const item of ['Log a refill', 'Log maintenance', 'Add an expense', 'New reminder', 'Add vehicle papers', 'Add a vehicle']) {
    await quickAdd(page, item)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.waitForTimeout(300) // let the open animation finish
    const box = (await dialog.boundingBox())!
    expect(box.x, item).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, item).toBeLessThanOrEqual(WIDTH)
    expect(Math.abs(box.x - (WIDTH - box.x - box.width)), `${item} centred`).toBeLessThanOrEqual(1)
    const vh = page.viewportSize()!.height
    if (box.height < vh - 40) expect(Math.abs(box.y - (vh - box.y - box.height)), `${item} vertically centred`).toBeLessThanOrEqual(2)
    else expect(box.y, `${item} not pinned to the top`).toBeGreaterThan(0)
    if (item === 'Log a refill') await page.screenshot({ path: test.info().outputPath('refill-dialog.png') })
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), `${item} content fits`).toBe(true)
    // No field is focused on open: on iPhones that pops the keyboard and shifts the dialog.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role')), `${item} focuses the dialog, not a field`).toBe('dialog')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  }
})
