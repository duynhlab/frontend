import type { Paginated } from "./common";

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
}

export interface ProductListQuery {
  page?: number;
  page_size?: number;
}

export type ProductListResponse = Paginated<Product>;

/** The product's own frozen stock column. Superseded by `Availability`. */
export interface Stock {
  available: boolean;
  quantity: number;
}

export type AvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "unknown";

/**
 * Inventory-sourced availability (RFC-0021). Inventory-service is the authority;
 * it answers with a status rather than a raw column.
 *
 * `unknown` is what inventory soft-fails to when it cannot be reached, and
 * `available_to_promise` is **omitted rather than zeroed** on that answer, so a
 * missing figure can never be mistaken for a real zero.
 */
export interface Availability {
  status: AvailabilityStatus;
  available_to_promise?: number | undefined;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  username: string;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
}

/** Aggregation endpoint payload for the product detail page. */
export interface ProductDetails {
  product: Product;
  availability?: Availability | undefined;
  /**
   * Optional because it is being removed: it is product-service's own column,
   * frozen at the phase-3 write cutover. Read only as a fallback for a product
   * build older than the inventory enrichment, which keeps the page working
   * regardless of the order the two services deploy in.
   */
  stock?: Stock | undefined;
  reviews: Review[];
}

export interface CreateReviewRequest {
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string;
}
