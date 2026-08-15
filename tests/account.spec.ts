import { expect, test } from '@playwright/test'
import { DEMO, expectNoA11yViolations, signIn } from './helpers'

test.describe('account', () => {
  test('the login page redirects through Keycloak and comes back', async ({
    page,
  }) => {
    await page.goto('/login?redirect=/orders')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expectNoA11yViolations(page)

    await page.getByRole('button', { name: 'Continue to sign in' }).click()
    await page.waitForURL(/localhost:8081/)
    await page.locator('#username').fill(DEMO.username)
    await page.locator('#password').fill(DEMO.password)
    await page.locator('#kc-login').click()

    await page.waitForURL(/localhost:3000\/orders/)
    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()
  })

  test('an off-site redirect target is refused', async ({ page }) => {
    // The guard rejects `//host`, so the sign-in must come back to this origin.
    await page.goto('/login?redirect=//evil.example.com')
    await page.getByRole('button', { name: 'Continue to sign in' }).click()
    await page.waitForURL(/localhost:8081/)
    expect(page.url()).toContain(
      encodeURIComponent('http://localhost:3000/'),
    )
  })

  test('orders list links through to a detail view', async ({ page }) => {
    await page.goto('/')
    await signIn(page)
    await page.goto('/orders')

    // Wait for the list to settle into one state or the other first —
    // checking visibility while the skeleton is up reads as "no orders".
    const first = page.getByRole('link', { name: /^Order #/ }).first()
    await expect(first.or(page.getByText('No orders yet'))).toBeVisible()

    if (await first.isVisible()) {
      await first.click()
      await expect(page.getByRole('heading', { name: /^Order #/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible()
      await expectNoA11yViolations(page)
    } else {
      await expect(page.getByText('No orders yet')).toBeVisible()
    }
  })

  test('notifications can be marked read and the bell follows', async ({ page }) => {
    await page.goto('/')
    await signIn(page)
    await page.goto('/notifications')

    const markAll = page.getByRole('button', { name: /^Mark all as read/ })
    if (await markAll.isVisible().catch(() => false)) {
      await markAll.click()
      await expect(page.getByRole('link', { name: 'Notifications, 0 unread' })).toBeVisible({
        timeout: 20_000,
      })
    }
    await expectNoA11yViolations(page)
  })

  test('the profile form loads the real profile and saves', async ({ page }) => {
    await page.goto('/')
    await signIn(page)
    await page.goto('/profile')

    await expect(page.getByLabel('Username')).toHaveValue(DEMO.username)
    const name = page.getByLabel('Full name')
    await expect(name).not.toHaveValue('')

    await name.fill('Alice Johnson')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Profile saved')).toBeVisible()

    await expectNoA11yViolations(page)
  })
})
