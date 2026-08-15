import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, SEEDED_PRODUCT, signIn } from './helpers'

test.describe('product detail', () => {
  test('shows price, availability and reviews, and gates buying on sign-in', async ({
    page,
  }) => {
    await page.goto(`/products/${SEEDED_PRODUCT.id}`)

    await expect(
      page.getByRole('heading', { name: SEEDED_PRODUCT.name, level: 1 }),
    ).toBeVisible()
    // Availability is inventory-service's answer, surfaced as a chip.
    await expect(page.getByText(/In stock|Low stock|Out of stock|Availability unknown/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible()

    // Signed out, buying is an invitation to sign in — never a dead button.
    await expect(page.getByRole('button', { name: 'Sign in to buy' })).toBeVisible()

    await expectNoA11yViolations(page)
  })

  test('signed in, the quantity stepper and add-to-cart work', async ({ page }) => {
    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await signIn(page)
    await page.goto(`/products/${SEEDED_PRODUCT.id}`)

    // The floor is 1: decrease is disabled there rather than allowing 0.
    await expect(page.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    await page.getByRole('button', { name: 'Increase quantity' }).click()

    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    // The badge reflects the authoritative cart, not a local guess.
    await expect(page.getByRole('link', { name: /^Cart, [1-9]/ })).toBeVisible()

    await expectNoA11yViolations(page)
  })
})
