# Notifications Module

This folder is a **placeholder** for future integration with the backend
**notification microservice**.

## Current State

Transient toasts are raised through the project notification API — a module
singleton over the shadcn (Base UI) Toast, mounted once in `AppLayout`:

```tsx
import { notify } from "@/lib/notifications";

notify.success("Item added to cart");
notify.error("Failed to save");
notify.info("You already reviewed this product");
notify.warning("You're doing that too fast");

// Loading → settled (one toast, no stacking):
const id = notify.loading("Placing order...");
notify.dismiss(id);
notify.success("Order placed successfully");
// …or let promise() drive the lifecycle:
await notify.promise(saveThing(), {
  loading: "Saving…",
  success: "Saved",
  error: (appError) => appError.message,
});

// Dedup: the same key updates the existing toast in place.
notify.success("Added to cart", { dedupKey: "cart-add" });

// Normalized error copy for any thrown value:
notify.apiError(err, "Cannot add item to cart");
```

Rules (see `AGENTS.md`): exactly one `<Toaster />`; no second toast library;
toast is for transient operation feedback — actionable form errors are inline.

Persistent notification history is rendered by `NotificationPage` and fetched
from `notificationApi` — that is separate from local toasts.

## Related Files

- `src/lib/notifications.ts` — the notification API (module singleton)
- `src/components/ui/toast.tsx` — shadcn Toast primitive + `<Toaster />`
- `src/components/layout/AppLayout.tsx` — the single `<Toaster />` mount
- `src/pages/NotificationPage/` — backend notification history (not toasts)

## Future Integration

To consume real-time notifications from the notification microservice:

1. **Create a connector** (e.g., `NotificationConnector.tsx`) that:
   - Opens a WebSocket / SSE connection to the notification service
   - Listens for incoming events
   - Calls `notify.*` for foreground events and revalidates the
     `notifications` / `notification-count` SWR keys for the page and badge
2. Mount the connector once inside `AppLayout` (only when authenticated).
