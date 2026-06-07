"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BellRing, Check, Heart, MessageCircle, UserPlus } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { cn } from "@workspace/ui/lib/utils";

import { NotificationType, type InAppNotification } from "@/features/notifications/lib/types";

type NotificationListItemProps = {
  compact?: boolean;
  notification: InAppNotification;
};

const iconByType: Record<string, ComponentType<{ className?: string }>> = {
  [NotificationType.NewFollower]: UserPlus,
  [NotificationType.FollowRequest]: UserPlus,
  [NotificationType.FollowRequestAccepted]: Check,
  [NotificationType.PostLike]: Heart,
  [NotificationType.CommentLike]: Heart,
  [NotificationType.PostComment]: MessageCircle,
  [NotificationType.CommentReply]: MessageCircle,
  [NotificationType.ProfilePost]: BellRing,
  [NotificationType.CityPost]: BellRing,
  [NotificationType.FollowedFirstPost]: BellRing,
};

export function NotificationListItem({ compact = false, notification }: NotificationListItemProps) {
  const t = useTranslations("public-web");
  const locale = useLocale();
  const [actionState, setActionState] = useState<"idle" | "pending" | "done">("idle");
  const href = normalizeInternalHref(notification.url);
  const Icon = iconByType[notification.type] ?? BellRing;
  const actorName = notification.actorDisplayName ?? notification.actorUsername;
  const createdAt = useMemo(
    () => formatNotificationDate(notification.createdAtUtc, locale),
    [locale, notification.createdAtUtc],
  );
  const action = getNotificationAction(notification);

  async function onActionClick() {
    if (!action || actionState !== "idle") {
      return;
    }

    setActionState("pending");
    try {
      const response = await fetch(action.url, { method: action.method });
      if (!response.ok && response.status !== 204) {
        throw new Error("notification_action_failed");
      }

      setActionState("done");
    } catch {
      setActionState("idle");
    }
  }

  const content = (
    <div className={cn("min-w-0 flex-1", href && "transition hover:text-foreground")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-medium text-foreground", compact ? "text-sm" : "text-[15px]")}>
            {notification.subject}
          </p>
          <p className={cn("mt-1 text-muted-foreground", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {notification.body}
          </p>
        </div>
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {actorName ? <span className="truncate">{actorName}</span> : null}
        {actorName ? <span aria-hidden="true">•</span> : null}
        <time dateTime={notification.createdAtUtc}>{createdAt}</time>
      </div>
    </div>
  );

  return (
    <div className={cn("flex items-start gap-3 rounded-lg px-3 py-3", !compact && "border border-border/70")}>
      <Avatar className="mt-0.5 size-9 shrink-0">
        {notification.actorAvatarUrl ? (
          <AvatarImage alt={actorName ?? notification.subject} src={notification.actorAvatarUrl} />
        ) : null}
        <DefaultAvatar />
      </Avatar>

      {href ? (
        <Link className="min-w-0 flex-1" href={href}>
          {content}
        </Link>
      ) : (
        content
      )}

      {action ? (
        <Button
          className="mt-0.5 shrink-0"
          disabled={actionState === "pending" || actionState === "done"}
          onClick={onActionClick}
          size="sm"
          type="button"
          variant={action.variant}
        >
          {actionState === "done" ? t("notifications.actions.done") : t(action.labelKey)}
        </Button>
      ) : null}
    </div>
  );
}

function getNotificationAction(notification: InAppNotification): {
  labelKey: "notifications.actions.accept" | "notifications.actions.followBack";
  method: "POST";
  url: string;
  variant: "default" | "outline";
} | null {
  const username = notification.actorUsername?.trim();
  if (!username) {
    return null;
  }

  if (notification.type === NotificationType.NewFollower) {
    return {
      labelKey: "notifications.actions.followBack",
      method: "POST",
      url: `/api/accounts/follows/${encodeURIComponent(username)}`,
      variant: "outline",
    };
  }

  if (notification.type === NotificationType.FollowRequest) {
    return {
      labelKey: "notifications.actions.accept",
      method: "POST",
      url: `/api/accounts/follows/requests/${encodeURIComponent(username)}/accept`,
      variant: "default",
    };
  }

  return null;
}

function normalizeInternalHref(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function formatNotificationDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
