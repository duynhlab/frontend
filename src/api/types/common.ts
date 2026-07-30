/** Standard paginated envelope returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}
