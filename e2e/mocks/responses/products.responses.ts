import type { Product, ProductListResponse, Review } from "@/api/types/product";
import {
  DEFAULT_PAGE_SIZE,
  TOTAL_SEED_PRODUCTS,
  productIdFor,
  productNameFor,
  productPriceFor,
  productStockFor,
} from "@/api/mock/seed-constants";

/**
 * Deterministic catalog — derived from the SAME pure seed constants the
 * in-app mock uses (type-only + constants sharing keeps the two mock layers
 * from drifting on counts, names and pricing; see AGENTS.md).
 */
export function generateProducts(): Product[] {
  return Array.from({ length: TOTAL_SEED_PRODUCTS }, (_, i) => {
    const name = productNameFor(i);
    return {
      id: productIdFor(i),
      name,
      price: productPriceFor(i),
      description: `High quality ${name.toLowerCase()} for everyday use.`,
      stock: productStockFor(i),
    } satisfies Product;
  });
}

export function buildProductsPage(
  products: Product[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): ProductListResponse {
  const offset = (page - 1) * pageSize;
  return {
    items: products.slice(offset, offset + pageSize),
    page,
    page_size: pageSize,
    total_items: products.length,
    total_pages: Math.ceil(products.length / pageSize) || 1,
  } satisfies ProductListResponse;
}

export const seedReviews: Review[] = [];
