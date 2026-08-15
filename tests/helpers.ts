import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Shared helpers for the storefront suite.
 *
 * Everything here drives the REAL stack — real Keycloak on :8081, the real
 * Envoy edge on :8080, real services behind it. There is no mock layer to
 * fall back on, by design (ADR-052): a suite that passes against fixtures
 * tells you nothing about whether the shop works.
 */

export const DEMO = { username: 'alice', password: 'password123' }

/** The full OIDC round-trip. Login is by username — the realm has email login off. */
export async function signIn(
  page: Page,
  who: { username: string; password: string } = DEMO,
) {
  // The header's Sign in is a LINK to /login (it carries the redirect back),
  // and /login is where the Keycloak hand-off happens. `exact` matters: a
  // product page also offers "Sign in to buy".
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to sign in' }).click()
  await page.waitForURL(/localhost:8081/)
  await page.locator('#username').fill(who.username)
  await page.locator('#password').fill(who.password)
  await page.locator('#kc-login').click()
  await page.waitForURL(/localhost:3000/)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

/** No serious or critical violations. Anything less is reported, not failed. */
export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`),
    'serious/critical axe violations',
  ).toEqual([])
}

/**
 * A product the seed data guarantees inventory tracks. Products created by
 * past audit runs have no inventory row at all, and adding one poisons the
 * whole checkout session — so the suite never picks a product at random.
 */
export const SEEDED_PRODUCT = { id: '1', name: 'Wireless Mouse' }

/**
 * Empty the cart through the UI so a spec starts from a known quantity.
 *
 * The tests share one demo account, so each one has to establish its own
 * starting state rather than inherit whatever the last one left. Waiting for
 * the page to settle first is load-bearing: checking a Remove button's
 * visibility while the skeleton is still up reads as "already empty", and the
 * spec then runs against the previous test's cart.
 */
export async function emptyCart(page: Page) {
  await page.goto('/cart')
  const removeButtons = page.getByRole('button', { name: /^Remove / })

  await expect(
    removeButtons.first().or(page.getByText('Your cart is empty')),
  ).toBeVisible()

  for (let remaining = await removeButtons.count(); remaining > 0; remaining--) {
    await removeButtons.first().click()
    await expect(removeButtons).toHaveCount(remaining - 1, { timeout: 15_000 })
  }
  await expect(page.getByText('Your cart is empty')).toBeVisible()
}
