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

export interface Stock {
  available: boolean;
  quantity: number;
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
  stock: Stock;
  reviews: Review[];
}

export interface CreateReviewRequest {
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string;
}
