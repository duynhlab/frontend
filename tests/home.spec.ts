import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './helpers'

/**
 * The home page asks one question and routes the answer into the catalog. It
 * deliberately shows no products: the platform has nothing to rank by, so a
 * "featured" or "new in" rail would be a label the data cannot support.
 */
test.describe('home', () => {
  test('shows the real catalog size and the real category buckets', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'What are you looking for?', level: 1 }),
    ).toBeVisible()

    // Counts are derived from the live catalog, not hardcoded — assert the
    // shape rather than a number, so reseeding the stack does not break this.
    await expect(page.getByText(/^\d+ products? in the store$/)).toBeVisible()

    const categories = page.getByRole('navigation', { name: 'Shop by category' })
    await expect(categories).toBeVisible()
    await expect(categories.getByRole('link')).not.toHaveCount(0)

    await expectNoA11yViolations(page)
  })

  test('the address bar stays clean — no page param before anyone pages', async ({
    page,
  }) => {
    // The regression this pins: a `.default(1)` on the search schema made the
    // router rewrite a plain visit to `?page=1`.
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page).not.toHaveURL(/page=/)

    await page.goto('/products')
    await expect(page).not.toHaveURL(/page=/)
  })

  test('search hands off to the catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Search products').fill('Mouse')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page).toHaveURL(/\/products\?q=Mouse/)
    await expect(
      page.getByRole('heading', { name: 'All products', level: 1 }),
    ).toBeVisible()
  })

  test('a category chip filters the catalog', async ({ page }) => {
    await page.goto('/')
    const chip = page
      .getByRole('navigation', { name: 'Shop by category' })
      .getByRole('link')
      .first()
    const label = (await chip.textContent())?.trim().split(/\s+/)[0] ?? ''
    await chip.click()

    await expect(page).toHaveURL(new RegExp(`/products\\?category=${label}`))
    await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible()
  })

  test('browse-all reaches the full catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Browse all products' }).click()
    await expect(
      page.getByRole('heading', { name: 'All products', level: 1 }),
    ).toBeVisible()
  })
})
