import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSWRConfig } from "swr";
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "@/api/notificationApi";
import type { AppNotification, NotificationCount } from "@/api/types/notification";
import { useAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import { notify } from "@/lib/notifications";
import { toAppError } from "@/lib/errors";
import PageHeader from "@/components/common/PageHeader";
import LoadingState from "@/components/common/LoadingState";
import AppError from "@/components/common/AppError";
import EmptyState from "@/components/common/EmptyState";
import ApiDebug from "@/components/common/ApiDebug";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";

const TYPE_ICONS: Record<string, string> = {
  order_shipped: "📦",
  order_completed: "✅",
  order_placed: "🛒",
  order_processing: "⚙️",
  review_reminder: "⭐",
  promotion: "🎉",
  cart_reminder: "🛍️",
  email: "📧",
  sms: "📱",
};

function getNotificationIcon(type: string): string {
  return TYPE_ICONS[type] || "🔔";
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return "";
  }
}

function NotificationItem({
  notification,
  action,
}: {
  notification: AppNotification;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2">
          <span aria-hidden="true">{getNotificationIcon(notification.type)}</span>
          {/* Read items de-emphasize via the muted TOKEN (kept at AA) — an
              opacity fade would push muted text below the contrast floor. */}
          <h4
            className={cn(
              "text-sm font-medium",
              notification.read && "text-muted-foreground",
            )}
          >
            {notification.title || notification.message}
          </h4>
          <time
            dateTime={notification.created_at}
            className="text-xs text-muted-foreground"
          >
            {formatDate(notification.created_at)}
          </time>
        </div>
        {notification.title && notification.message !== notification.title && (
          <p className="truncate text-xs text-muted-foreground">
            {notification.message}
          </p>
        )}
      </div>
      {action}
    </li>
  );
}

/**
 * NotificationPage
 * API: GET /notification/v1/private/notifications
 * API: PATCH /notification/v1/private/notifications/:id (+ /read-all)
 */
export default function NotificationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth } = useAuth();

  useEffect(() => {
    requireAuth(navigate, "/notifications");
  }, [requireAuth, navigate]);

  const { data: notifications, loading, error, mutate } = useApiQuery(
    isAuthenticated ? "notifications" : null,
    getNotifications,
  );

  // Cross-revalidate the header bell badge (a separate SWR key) so it updates
  // instantly after a mark, instead of waiting for its background poll.
  const { mutate: globalMutate } = useSWRConfig();
  const [markingAll, setMarkingAll] = useState(false);

  // Serialize single mark-as-read clicks through one promise chain: rapid
  // individual clicks must never fire concurrent PATCHes, because that burst is
  // what trips the gateway rate limit (429). (Bulk "mark all" uses the
  // dedicated endpoint instead.) The chain base never rejects, so one failed
  // link can't stall the rest. `pending` counts in-flight marks to drive the
  // disabled/label states; `inFlight` dedupes repeated clicks on one id.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState(0);

  const enqueueMark = useCallback((id: string) => {
    const run = queueRef.current.then(() => markAsRead(id));
    // Serialize AND pace: even one-at-a-time PATCHes return in a few ms, so a
    // fast run of individual clicks would still exceed the gateway's 5 req/s
    // limit. Hold ~220ms after each settles (success or fail) before the next
    // link runs. The caller still awaits `run` (the PATCH itself), so the UI
    // reacts immediately.
    const gap = () => new Promise((r) => setTimeout(r, 220));
    queueRef.current = run.then(gap, gap);
    return run;
  }, []);

  const markOne = useCallback(
    async (id: string) => {
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);
      setPending((n) => n + 1);
      try {
        await enqueueMark(id);
      } finally {
        inFlight.current.delete(id);
        setPending((n) => n - 1);
      }
    },
    [enqueueMark],
  );

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update; revalidate (or revert) once the PATCH settles.
    void mutate(
      notifications?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      false,
    );
    try {
      await markOne(id);
      void globalMutate(
        "notification-count",
        (prev: NotificationCount | undefined) => ({
          count: Math.max(0, (prev?.count ?? 1) - 1),
        }),
        { revalidate: true },
      );
      notify.success("Marked as read");
    } catch (err) {
      const appErr = toAppError(err);
      if (appErr.isRateLimit) notify.warning(appErr.message);
      else notify.error("Cannot update notification");
    } finally {
      void mutate();
    }
  };

  const handleMarkAll = async () => {
    const ids = (notifications || []).filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    setMarkingAll(true);
    // Optimistically clear the list now; one bulk request replaces the old
    // per-id loop (no rate-limit pacing needed). The badge is zeroed on the
    // response below, then reconciled.
    void mutate(
      notifications?.map((n) => ({ ...n, read: true })),
      false,
    );
    try {
      await markAllAsRead();
      void globalMutate("notification-count", { count: 0 }, { revalidate: true });
      notify.success("All notifications marked as read");
    } catch (err) {
      const appErr = toAppError(err);
      if (appErr.isRateLimit) notify.warning(appErr.message);
      else notify.error("Some notifications could not be marked as read");
    } finally {
      setMarkingAll(false);
      void mutate(); // revalidate list (reverts optimistic on failure)
    }
  };

  const notificationsList = useMemo(() => notifications || [], [notifications]);
  const unreadNotifications = useMemo(
    () => notificationsList.filter((n) => !n.read),
    [notificationsList],
  );
  const readNotifications = useMemo(
    () => notificationsList.filter((n) => n.read),
    [notificationsList],
  );
  const unreadCount = unreadNotifications.length;

  if (!isAuthenticated) {
    return (
      <PageShell>
        <PageHeader title="Notifications" backLink="/" backText="← Back to Home" />
        <EmptyState message="Please log in to view notifications" icon="🔒" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        backLink="/"
        backText="← Back to Home"
        apiLabel={`API: GET /notification/v1/private/notifications • ${notificationsList.length} items`}
      />

      {loading && (
        <LoadingState message="Loading notifications..." variant="list" count={3} />
      )}

      {!loading && error && notificationsList.length === 0 && (
        <AppError
          error={error}
          endpoint="GET /notification/v1/private/notifications"
        />
      )}

      {!loading && !error && notificationsList.length === 0 && (
        <EmptyState message="No notifications" icon="🔔" />
      )}

      {/* Stale-list warning: refresh failed but we still have data to show. */}
      {!loading && error && notificationsList.length > 0 && (
        <Alert variant="destructive" role="alert" className="mb-4">
          <AlertTitle>
            {error.isRateLimit
              ? error.message
              : "Refreshing failed — showing the last loaded list."}
          </AlertTitle>
        </Alert>
      )}

      {!loading && notificationsList.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm">
            {unreadCount > 0 ? (
              <>
                <strong>{unreadCount}</strong> unread notification
                {unreadCount !== 1 ? "s" : ""}
              </>
            ) : (
              "All caught up! 🎉"
            )}
          </p>

          {unreadNotifications.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Unread</CardTitle>
                <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleMarkAll()}
                  disabled={pending > 0 || markingAll}
                >
                  {markingAll ? "Marking..." : "Mark all as read"}
                </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <ul className="-my-2">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      action={
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleMarkAsRead(notification.id)}
                          disabled={pending > 0 || markingAll}
                        >
                          {pending > 0 ? "Marking..." : "Mark as Read"}
                        </Button>
                      }
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {readNotifications.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Read</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="-my-2">
                  {readNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ApiDebug data={notifications} />
    </PageShell>
  );
}
