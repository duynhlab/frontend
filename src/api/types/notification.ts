export interface AppNotification {
  id: string;
  /** Open set — the UI maps known types to icons and falls back for the rest. */
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationCount {
  count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}
