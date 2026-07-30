export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  item_count: number;
  subtotal: number;
  shipping: number;
  total: number;
}

export interface CartCount {
  count: number;
}

export interface AddCartItemRequest {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}
