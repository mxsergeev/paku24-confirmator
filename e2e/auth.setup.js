import { test as setup } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate the E2E user', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[name="username"]').fill('admin')
  await page.locator('input[name="password"]').fill('1234')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL('**/app/calendar')
  await page.context().storageState({ path: authFile })
})
