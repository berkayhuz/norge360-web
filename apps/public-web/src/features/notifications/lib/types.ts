export type InAppNotification = {
  actorAvatarUrl: string | null;
  actorDisplayName: string | null;
  actorUserId: string | null;
  actorUsername: string | null;
  body: string;
  category: string;
  createdAtUtc: string;
  entityId: string | null;
  entityType: string | null;
  id: string;
  metadata: Record<string, string>;
  subject: string;
  type: string;
  url: string | null;
};

export type NotificationsPage = {
  items: InAppNotification[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
};

export type NotificationSummary = {
  latestReadAtUtc: string | null;
  unreadCount: number;
};

export type NotificationPreference = {
  category: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  type: string;
};

export type NotificationPreferences = {
  items: NotificationPreference[];
};

export const NotificationType = {
  NewFollower: "social.new_follower",
  FollowRequest: "social.follow_request",
  FollowRequestAccepted: "social.follow_request_accepted",
  ProfilePost: "community.profile_post",
  CityPost: "community.city_post",
  FollowedFirstPost: "community.followed_first_post",
  PostLike: "community.post_like",
  CommentLike: "community.comment_like",
  PostComment: "community.post_comment",
  CommentReply: "community.comment_reply",
  SuspiciousLogin: "security.suspicious_login",
} as const;

export function normalizeNotificationsPage(input: unknown): NotificationsPage {
  const source = asRecord(input);
  const items = readArray(source, "items", "Items").map(normalizeNotification).filter((item): item is InAppNotification => item !== null);

  return {
    items,
    page: readNumber(source, "page", "Page") ?? 1,
    pageSize: readNumber(source, "pageSize", "PageSize") ?? items.length,
    total: readNumber(source, "total", "Total") ?? items.length,
    unreadCount: readNumber(source, "unreadCount", "UnreadCount") ?? 0,
  };
}

export function normalizeNotificationSummary(input: unknown): NotificationSummary {
  const source = asRecord(input);
  return {
    latestReadAtUtc: readNullableString(source, "latestReadAtUtc", "LatestReadAtUtc"),
    unreadCount: readNumber(source, "unreadCount", "UnreadCount") ?? 0,
  };
}

export function normalizeNotificationPreferences(input: unknown): NotificationPreferences {
  const source = asRecord(input);
  return {
    items: readArray(source, "items", "Items")
      .map(normalizeNotificationPreference)
      .filter((item): item is NotificationPreference => item !== null),
  };
}

function normalizeNotification(input: unknown): InAppNotification | null {
  const source = asRecord(input);
  const id = readString(source, "id", "Id");
  const type = readString(source, "type", "Type");
  const category = readString(source, "category", "Category");
  const subject = readString(source, "subject", "Subject");
  const body = readString(source, "body", "Body");
  const createdAtUtc = readString(source, "createdAtUtc", "CreatedAtUtc");
  if (!id || !type || !category || !subject || !body || !createdAtUtc) {
    return null;
  }

  return {
    actorAvatarUrl: readNullableString(source, "actorAvatarUrl", "ActorAvatarUrl"),
    actorDisplayName: readNullableString(source, "actorDisplayName", "ActorDisplayName"),
    actorUserId: readNullableString(source, "actorUserId", "ActorUserId"),
    actorUsername: readNullableString(source, "actorUsername", "ActorUsername"),
    body,
    category,
    createdAtUtc,
    entityId: readNullableString(source, "entityId", "EntityId"),
    entityType: readNullableString(source, "entityType", "EntityType"),
    id,
    metadata: readStringRecord(source, "metadata", "Metadata"),
    subject,
    type,
    url: readNullableString(source, "url", "Url"),
  };
}

function normalizeNotificationPreference(input: unknown): NotificationPreference | null {
  const source = asRecord(input);
  const type = readString(source, "type", "Type");
  const category = readString(source, "category", "Category");
  const inAppEnabled = readBoolean(source, "inAppEnabled", "InAppEnabled");
  const emailEnabled = readBoolean(source, "emailEnabled", "EmailEnabled");
  const pushEnabled = readBoolean(source, "pushEnabled", "PushEnabled");
  if (!type || !category || inAppEnabled === null || emailEnabled === null || pushEnabled === null) {
    return null;
  }

  return { category, emailEnabled, inAppEnabled, pushEnabled, type };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function readArray(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return Array.isArray(value) ? value : [];
}

function readString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNullableString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "boolean" ? value : null;
}

function readStringRecord(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0,
    ),
  );
}
