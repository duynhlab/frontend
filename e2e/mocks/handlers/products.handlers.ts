import type { ProductDetails } from "@/api/types/product";
import {
  availabilityFor,
  DEFAULT_PAGE_SIZE,
  productIndexOf,
} from "@/api/mock/seed-constants";
import { apiError, json, type ApiHandler } from "../server";
import { buildProductsPage } from "../responses/products.responses";

export const productHandlers: ApiHandler[] = [
  {
    method: "GET",
    path: /\/product\/v1\/public\/products\/[^/]+\/details$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-2);
      const product = state.products.find((p) => p.id === id);
      if (!product) return apiError(route, "Resource not found", 404);
      const details: ProductDetails = {
        product,
        availability: availabilityFor(productIndexOf(id ?? "")),
        stock: { available: product.stock > 0, quantity: product.stock },
        reviews: state.reviews.filter((r) => r.product_id === id),
      };
      return json(route, details);
    },
  },
  {
    method: "GET",
    path: /\/product\/v1\/public\/products\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-1);
      const product = state.products.find((p) => p.id === id);
      if (!product) return apiError(route, "Resource not found", 404);
      return json(route, product);
    },
  },
  {
    method: "GET",
    path: /\/product\/v1\/public\/products$/,
    fulfill: ({ route, url, state }) => {
      const page = Number(url.searchParams.get("page")) || 1;
      const pageSize =
        Number(url.searchParams.get("page_size")) || DEFAULT_PAGE_SIZE;
      return json(route, buildProductsPage(state.products, page, pageSize));
    },
  },
];
