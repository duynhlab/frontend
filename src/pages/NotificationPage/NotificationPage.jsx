import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notificationApi';
import { useAuth } from '../../hooks/useAuth';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useToast } from '../../hooks/useToast';
import PageHeader from '../../components/common/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import ApiError from '../../components/common/ApiError';
import EmptyState from '../../components/common/EmptyState';
import ApiDebug from '../../components/common/ApiDebug';
import './NotificationPage.css';

/**
 * NotificationPage
 * API: GET /notification/v1/private/notifications
 * API: PATCH /notification/v1/private/notifications/:id
 * 
 * Displays user notifications with read/unread status
 * Uses shared hooks for consistent data fetching and auth
 */
export default function NotificationPage() {
    const navigate = useNavigate();
    const { isAuthenticated, requireAuth } = useAuth();

    // Auth guard
    useEffect(() => {
        requireAuth(navigate, '/notifications');
    }, [requireAuth, navigate]);

    // Fetch notifications using shared hook
    const { data: notifications, loading, error, mutate } = useApiQuery(
        isAuthenticated ? 'notifications' : null,
        getNotifications
    );

    const { notify } = useToast();
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
    const queueRef = useRef(Promise.resolve());
    const inFlight = useRef(new Set());
    const [pending, setPending] = useState(0);

    const enqueueMark = useCallback((id) => {
        const run = queueRef.current.then(() => markAsRead(id));
        // Serialize AND pace: even one-at-a-time PATCHes return in a few ms, so a
        // fast run of individual clicks would still exceed the gateway's 5 req/s
        // limit. Hold ~220ms after each settles (success or fail) before the next
        // link runs. The caller still awaits `run` (the PATCH itself), so the UI
        // reacts immediately.
        const gap = () => new Promise(r => setTimeout(r, 220));
        queueRef.current = run.then(gap, gap);
        return run;
    }, []);

    const markOne = useCallback(async (id) => {
        if (inFlight.current.has(id)) return;
        inFlight.current.add(id);
        setPending(n => n + 1);
        try {
            await enqueueMark(id);
        } finally {
            inFlight.current.delete(id);
            setPending(n => n - 1);
        }
    }, [enqueueMark]);

    const handleMarkAsRead = async (id) => {
        // Optimistic update; revalidate (or revert) once the PATCH settles.
        mutate(notifications?.map(n => n.id === id ? { ...n, read: true } : n), false);
        try {
            await markOne(id);
            globalMutate('notification-count', prev => ({ count: Math.max(0, (prev?.count ?? 1) - 1) }), { revalidate: true });
            notify('success', 'Marked as read');
        } catch (err) {
            if (err?.isRateLimit) notify('warning', err.message);
            else notify('error', 'Cannot update notification');
        } finally {
            mutate();
        }
    };

    const handleMarkAll = async () => {
        const ids = (notifications || []).filter(n => !n.read).map(n => n.id);
        if (ids.length === 0) return;
        setMarkingAll(true);
        // Optimistically clear the list now; one bulk request replaces the old
        // per-id loop (no rate-limit pacing needed). The badge is zeroed on the
        // response below, then reconciled.
        mutate(notifications?.map(n => ({ ...n, read: true })), false);
        try {
            await markAllAsRead();
            globalMutate('notification-count', { count: 0 }, { revalidate: true });
            notify('success', 'All notifications marked as read');
        } catch (err) {
            if (err?.isRateLimit) notify('warning', err.message);
            else notify('error', 'Some notifications could not be marked as read');
        } finally {
            setMarkingAll(false);
            mutate(); // revalidate list (reverts optimistic on failure)
        }
    };

    // Computed values
    const notificationsList = useMemo(() => notifications || [], [notifications]);
    const unreadCount = useMemo(() => notificationsList.filter(n => !n.read).length, [notificationsList]);
    const unreadNotifications = useMemo(() => notificationsList.filter(n => !n.read), [notificationsList]);
    const readNotifications = useMemo(() => notificationsList.filter(n => n.read), [notificationsList]);

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        const icons = {
            order_shipped: '📦',
            order_completed: '✅',
            order_placed: '🛒',
            order_processing: '⚙️',
            review_reminder: '⭐',
            promotion: '🎉',
            cart_reminder: '🛍️',
            email: '📧',
            sms: '📱',
        };
        return icons[type] || '🔔';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return '';
        }
    };

    // Auth gate
    if (!isAuthenticated) {
        return (
            <div className="page container">
                <PageHeader title="Notifications" backLink="/" backText="← Back to Home" />
                <EmptyState message="Please log in to view notifications" icon="🔒" />
            </div>
        );
    }

    return (
        <div className="page container">
            <PageHeader 
                title="Notifications" 
                backLink="/" 
                backText="← Back to Home"
                apiLabel={`API: GET /notification/v1/private/notifications • ${notificationsList.length} items`}
            />

            {/* Loading State */}
            {loading && <LoadingState message="Loading notifications..." variant="list" count={3} />}

            {/* Error State */}
            {!loading && error && notificationsList.length === 0 && (
                <ApiError error={error} endpoint="GET /notification/v1/private/notifications" />
            )}

            {/* Empty State */}
            {!loading && !error && notificationsList.length === 0 && (
                <EmptyState message="No notifications" icon="🔔" />
            )}

            {/* Notifications Content */}
            {!loading && error && notificationsList.length > 0 && (
                <div className="error-box" role="alert">
                    {error?.isRateLimit ? error.message : 'Refreshing failed — showing the last loaded list.'}
                </div>
            )}
            {!loading && notificationsList.length > 0 && (
                <>
                    {/* Summary */}
                    <div className="notification-summary">
                        <p>
                            {unreadCount > 0 ? (
                                <><strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}</>
                            ) : (
                                'All caught up! 🎉'
                            )}
                        </p>
                    </div>

                    {/* Unread Notifications */}
                    {unreadNotifications.length > 0 && (
                        <div className="notification-section unread">
                            <div className="notification-section-head">
                                <h3>Unread</h3>
                                <button
                                    className="mark-all-btn"
                                    onClick={handleMarkAll}
                                    disabled={pending > 0 || markingAll}
                                >
                                    {markingAll ? 'Marking...' : 'Mark all as read'}
                                </button>
                            </div>
                            {unreadNotifications.map(notification => (
                                <div key={notification.id} className="notification-item unread">
                                    <div className="notification-content">
                                        <div className="notification-body">
                                            <div className="notification-header">
                                                <span className="notification-icon">
                                                    {getNotificationIcon(notification.type)}
                                                </span>
                                                <h4 className="notification-title">
                                                    {notification.title || notification.message}
                                                </h4>
                                            </div>
                                            {notification.title && notification.message !== notification.title && (
                                                <p className="notification-message">{notification.message}</p>
                                            )}
                                            <p className="notification-time">
                                                {formatDate(notification.created_at)}
                                            </p>
                                        </div>
                                        <div className="notification-actions">
                                            <button
                                                className="primary"
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                disabled={pending > 0 || markingAll}
                                            >
                                                {pending > 0 ? 'Marking...' : 'Mark as Read'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Read Notifications */}
                    {readNotifications.length > 0 && (
                        <div className="notification-section read">
                            <h3>Read</h3>
                            {readNotifications.map(notification => (
                                <div key={notification.id} className="notification-item read">
                                    <div className="notification-body">
                                        <div className="notification-header">
                                            <span className="notification-icon">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <h4 className="notification-title">
                                                {notification.title || notification.message}
                                            </h4>
                                        </div>
                                        {notification.title && notification.message !== notification.title && (
                                            <p className="notification-message">{notification.message}</p>
                                        )}
                                        <p className="notification-time">
                                            {formatDate(notification.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* API Debug */}
            <ApiDebug data={notifications} />
        </div>
    );
}
