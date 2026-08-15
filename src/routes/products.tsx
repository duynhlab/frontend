import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The catalog used to live at /products with the home page as a separate
 * landing. There is one storefront now and it is the home page, so old links
 * and bookmarks land there instead of 404ing.
 */
export const Route = createFileRoute('/products')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { page: 1 } })
  },
})
