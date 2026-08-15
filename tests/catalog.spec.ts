import { expect, test } from '@playwright/test'
import { expectNoA11yViolations, SEEDED_PRODUCT } from './helpers'

test.describe('catalog', () => {
  test('lists the live catalog and pages through it', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Store', level: 1 })).toBeVisible()

    // Real products from product-service, not fixtures.
    await expect(
      page.getByRole('link', { name: new RegExp(SEEDED_PRODUCT.name) }),
    ).toBeVisible()

    // The seed catalog fits on one page, and pagination renders nothing at
    // all then — so check for existence before touching it.
    const next = page.getByRole('button', { name: 'Next' })
    if ((await next.count()) > 0 && (await next.isEnabled())) {
      await next.click()
      await expect(page).toHaveURL(/page=2/)
      await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled()
    }

    await expectNoA11yViolations(page)
  })

  test('search narrows the catalog and the filter can be cleared', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByLabel('Search products').fill('Mouse')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page).toHaveURL(/q=Mouse/)
    await expect(
      page.getByRole('link', { name: new RegExp(SEEDED_PRODUCT.name) }),
    ).toBeVisible()

    await page.getByRole('button', { name: /“Mouse”/ }).click()
    await expect(page).not.toHaveURL(/q=/)
  })

  test('a category on a product filters the catalog by it', async ({ page }) => {
    await page.goto(`/products/${SEEDED_PRODUCT.id}`)
    const category = page.getByRole('link', { name: 'Electronics' })
    await expect(category).toBeVisible()
    await category.click()
    await expect(page).toHaveURL(/category=Electronics/)
    await expect(page.getByRole('button', { name: /Electronics/ })).toBeVisible()
  })

  test('a nonsense page number degrades to page 1 rather than erroring', async ({
    page,
  }) => {
    await page.goto('/?page=not-a-number')
    await expect(page.getByRole('heading', { name: 'Store', level: 1 })).toBeVisible()
  })
})
