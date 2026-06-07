import {
  normalizeNotificationPreferences,
  normalizeNotificationsPage,
  normalizeNotificationSummary,
  type NotificationPreferences,
  type NotificationsPage,
  type NotificationSummary,
} from "@/features/notifications/lib/types";

type ListNotificationsOptions = {
  markAsSeen?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listNotifications({
  markAsSeen = true,
  page = 1,
  pageSize = 20,
}: ListNotificationsOptions = {}): Promise<NotificationsPage> {
  const params = new URLSearchParams({
    markAsSeen: String(markAsSeen),
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(`/api/notifications?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("notifications_load_failed");
  }

  return normalizeNotificationsPage(data);
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const response = await fetch("/api/notifications/summary", {
    cache: "no-store",
    credentials: "include",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("notifications_summary_failed");
  }

  return normalizeNotificationSummary(data);
}

export async function markNotificationsSeen(): Promise<void> {
  const response = await fetch("/api/notifications/seen", {
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("notifications_seen_failed");
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch("/api/notifications/preferences", {
    cache: "no-store",
    credentials: "include",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("notifications_preferences_failed");
  }

  return normalizeNotificationPreferences(data);
}

export async function updateNotificationPreferences(input: NotificationPreferences): Promise<NotificationPreferences> {
  const response = await fetch("/api/notifications/preferences", {
    body: JSON.stringify({
      items: input.items.map((item) => ({
        emailEnabled: item.emailEnabled,
        inAppEnabled: item.inAppEnabled,
        pushEnabled: item.pushEnabled,
        type: item.type,
      })),
    }),
    headers: { "content-type": "application/json" },
    credentials: "include",
    method: "PUT",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("notifications_preferences_update_failed");
  }

  return normalizeNotificationPreferences(data);
}
