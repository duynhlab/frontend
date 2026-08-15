import { expect, test } from '@playwright/test'
import {
  emptyCart,
  expectNoA11yViolations,
  SEEDED_PRODUCT,
  signIn,
} from './helpers'

test.describe('checkout', () => {
  test('a quote left stale by cart edits is flagged, and rebuilding it reports the empty cart', async ({
    page,
  }) => {
    await page.goto('/')
    await signIn(page)
    await emptyCart(page)

    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    // Creating a session pins the quote to the cart as it is now.
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible()

    // Emptying the cart afterwards does NOT retire the session: asking for a
    // session again returns the SAME open one, still holding the old line.
    // The funnel has to notice that itself, which is what this banner is for.
    await emptyCart(page)
    await page.goto('/checkout')
    await expect(
      page.getByText(/Your cart changed after this quote was created/),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Rebuild the quote' }).click()
    await expect(page.getByText('Your cart is empty')).toBeVisible()
  })

  test('the funnel places a real order', async ({ page }) => {
    await page.goto('/')
    await signIn(page)
    await emptyCart(page)

    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible()

    // Steps ahead of the server's state are not merely styled differently —
    // they cannot be entered.
    await expect(page.getByRole('button', { name: 'Review' })).toBeDisabled()
    await expectNoA11yViolations(page)

    await page.getByLabel('Full name').fill('Alice Johnson')
    await page.getByLabel('Address line 1').fill('12 Nguyen Hue')
    await page.getByLabel('City').fill('Ho Chi Minh')
    await page.getByLabel('Post code').fill('700000')
    await page.getByRole('button', { name: 'Continue to shipping' }).click()

    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await page.getByRole('button', { name: 'Continue to review' }).click()

    await expect(
      page.getByRole('heading', { name: 'Review and place your order' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Place order' }).click()
    await expect(page.getByRole('heading', { name: 'Order placed', level: 1 })).toBeVisible({
      timeout: 30_000,
    })

    // A confirmed order consumes the cart. The badge asserts zero immediately,
    // but cart-service clears asynchronously and the badge polls every 10s — a
    // poll landing inside that window reads the real, not-yet-cleared count and
    // briefly shows it again. The guarantee is that it settles at zero within
    // one poll cycle, so that is what this waits for.
    await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('a bad promo code is reported beside the field, not as a toast', async ({
    page,
  }) => {
    await page.goto('/')
    await signIn(page)
    await emptyCart(page)

    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    await page.goto('/checkout')
    await page.getByLabel('Promo code').fill('DEFINITELY-NOT-A-CODE')
    await page.getByRole('button', { name: 'Apply' }).click()

    const alert = page.getByRole('alert').filter({ hasText: /promo code/i })
    await expect(alert).toBeVisible()
  })

  test('a hand-typed step ahead of the server is clamped, not obeyed', async ({
    page,
  }) => {
    await page.goto('/')
    await signIn(page)
    await emptyCart(page)

    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText('Added to cart')).toBeVisible()

    // A fresh session is at `open`, so step 1 is as far as anyone can be.
    await page.goto('/checkout?step=4')
    await expect(page.getByRole('heading', { name: 'Delivery address' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Review and place your order' }),
    ).toBeHidden()
  })
})
