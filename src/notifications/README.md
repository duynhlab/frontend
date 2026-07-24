# Notifications Module

This folder is a **placeholder** for future integration with the backend **notification microservice**.

## Current State

Toast notifications are triggered **locally** via the `useToast()` hook:

```jsx
import { useToast } from '../../hooks/useToast';

function MyComponent() {
    const { notify } = useToast();

    notify('success', 'Item added to cart');
    notify('error', 'Failed to save');
    notify('info', 'You already reviewed this product');
}
```

Persistent notification history is rendered by `NotificationPage` and fetched from
`notificationApi` — that is separate from local toasts.

## Future Integration

To consume real-time notifications from the notification microservice:

1. **Create a connector** (e.g., `notificationService.js`) that:
   - Opens a WebSocket / SSE connection to the notification service
   - Listens for incoming events
   - Calls `notify(type, message)` for each event

2. **Wire it at app root**:

```jsx
// Example: frontend/src/notifications/NotificationConnector.jsx
import { useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

export function NotificationConnector({ children }) {
    const { notify } = useToast();

    useEffect(() => {
        const ws = new WebSocket('ws://notification-svc/subscribe');

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            notify(data.type || 'info', data.message);
        };

        return () => ws.close();
    }, [notify]);

    return children;
}
```

## API Reference

### `notify(type, message, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `'success' \| 'error' \| 'info' \| 'warning'` | Notification severity |
| `message` | `string` | Text to display |
| `options.duration` | `number` | Auto-dismiss time in ms |

### Extended helpers

`useToast()` also exposes `success`, `error`, `info`, `warning`, `loading`, `dismiss`, `promise`, and `apiError`.

## Related Files

- `hooks/useToast.js` — react-hot-toast adapter
- `App.jsx` — `<Toaster />` mount point
- `pages/NotificationPage/` — backend notification history (not toasts)
