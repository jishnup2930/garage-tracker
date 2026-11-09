import { expect, test } from '@playwright/test'
import { onboardWithDemo } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

test('installable and opens offline straight after the first visit', async ({ page, context, request }) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  expect((await manifest.json()).display).toBe('standalone')

  await onboardWithDemo(page, 'Asha')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys()
    return { keys, files: (await (await caches.open(keys[0])).keys()).length }
  })
  expect(cached.keys).toHaveLength(1)
  expect(cached.files).toBeGreaterThanOrEqual(20)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText(/Good (morning|afternoon|evening), Asha/)).toBeVisible()
  // Pages never visited while online still load: the whole build was precached.
  for (const route of ['analytics', 'fuel', 'expenses', 'settings']) {
    await page.goto(`/#/${route}`)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText(/Something went wrong/i)).toBeHidden()
  }

  // An error page must never replace the cached app.
  await context.setOffline(false)
  await page.goto('/no-such-page')
  await context.setOffline(true)
  await page.goto('/')
  await expect(page.getByText(/Good (morning|afternoon|evening), Asha/)).toBeVisible()
})
