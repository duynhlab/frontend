import { expect, test } from '@playwright/test'
import {
  emptyCart,
  expectNoA11yViolations,
  SEEDED_PRODUCT,
  signIn,
} from './helpers'

test.describe('cart', () => {
  test('signed out, the cart asks for a sign-in rather than showing nothing', async ({
    page,
  }) => {
    await page.goto('/cart')
    await expect(page.getByText('Sign in to see your cart')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('quantity changes and removal keep the badge in step', async ({ page }) => {
    await page.goto('/')
    await signIn(page)
    await emptyCart(page)

    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    await page.goto('/cart')
    await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible()

    // A write answers with an acknowledgement, not the cart — the page has to
    // re-read it. This assertion is what catches that regression.
    await page
      .getByRole('button', { name: `Increase quantity of ${SEEDED_PRODUCT.name}` })
      .click()
    await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible()
    await expect(page.getByText('1 line · 2 items')).toBeVisible()

    await page
      .getByRole('button', { name: `Remove ${SEEDED_PRODUCT.name}` })
      .click()
    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible()

    await expectNoA11yViolations(page)
  })
})
