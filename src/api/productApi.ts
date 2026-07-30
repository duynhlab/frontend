import apiClient from "./client";
import * as mock from "./mock";
import type {
  Product,
  ProductDetails,
  ProductListQuery,
  ProductListResponse,
} from "./types/product";

/**
 * Product API — Variant A edge paths (all public).
 * Edge paths (gateway pass-through): /product/v1/public/products, /products/:id, /products/:id/details
 *
 * When VITE_USE_MOCK=true, all product calls use the in-memory mock store.
 */

/**
 * GET /product/v1/public/products
 * Returns the paginated envelope { items, page, page_size, total_items, total_pages };
 * callers read the array from `.items` (see useProducts).
 */
export async function getProducts(
  params: ProductListQuery = {},
): Promise<ProductListResponse> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetProducts(params);
  const response = await apiClient.get<ProductListResponse>(
    "/product/v1/public/products",
    { params },
  );
  return response.data;
}

/**
 * GET /product/v1/public/products/:id
 */
export async function getProduct(id: string): Promise<Product> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetProduct(id);
  const response = await apiClient.get<Product>(
    `/product/v1/public/products/${id}`,
  );
  return response.data;
}

/**
 * GET /product/v1/public/products/:id/details
 * Aggregation endpoint — use this for the Product Detail Page.
 */
export async function getProductDetails(id: string): Promise<ProductDetails> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetProductDetails(id);
  const response = await apiClient.get<ProductDetails>(
    `/product/v1/public/products/${id}/details`,
  );
  return response.data;
}
