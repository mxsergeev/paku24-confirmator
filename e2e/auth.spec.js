import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('logs in through the real login form', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[name="username"]').fill('admin')
  await page.locator('input[name="password"]').fill('1234')
  await page.getByRole('button', { name: 'Login' }).click()

  await page.waitForURL('**/app/calendar')
  await expect(page.getByRole('toolbar', { name: 'Calendar options' })).toBeVisible()
})
