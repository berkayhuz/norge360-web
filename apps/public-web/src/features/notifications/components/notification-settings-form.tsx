"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Switch } from "@workspace/ui/components/forms/switch";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/features/notifications/lib/client";
import { NotificationType, type NotificationPreference, type NotificationPreferences } from "@/features/notifications/lib/types";

type NotificationSettingsFormProps = {
  initialPreferences: NotificationPreferences;
};

export function NotificationSettingsForm({ initialPreferences }: NotificationSettingsFormProps) {
  const t = useTranslations("public-web");
  const [items, setItems] = useState<NotificationPreference[]>(initialPreferences.items);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveRequestIdRef = useRef(0);

  const grouped = useMemo(() => groupPreferences(items), [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const preferences = await getNotificationPreferences();
      setItems(preferences.items);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function togglePreference(type: string, checked: boolean) {
    const previousItems = items;
    const nextItems = items.map((item) => item.type === type ? { ...item, inAppEnabled: checked } : item);
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;

    setSaved(false);
    setError(false);
    setItems(nextItems);
    setSaving(true);

    try {
      const preferences = await updateNotificationPreferences({ items: nextItems });
      if (saveRequestIdRef.current === requestId) {
        setItems(preferences.items);
        setSaved(true);
      }
    } catch {
      if (saveRequestIdRef.current === requestId) {
        setItems(previousItems);
        setError(true);
      }
    } finally {
      if (saveRequestIdRef.current === requestId) {
        setSaving(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/30 px-4 py-8 text-center">
        <p className="text-sm text-destructive">{t("settings.notifications.loadError")}</p>
        <Button className="mt-4" onClick={() => void load()} type="button" variant="outline">
          {t("settings.notifications.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <Card className="rounded-none border-none bg-transparent p-0 shadow-none ring-0" key={group.category}>
          <CardHeader className="px-0">
            <CardTitle className="text-lg">{t(categoryLabelKey(group.category))}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/70 p-0">
            {group.items.map((item) => (
              <div className="flex items-center justify-between gap-4 py-4" key={item.type}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t(typeLabelKey(item.type))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(typeDescriptionKey(item.type))}</p>
                </div>
                <Switch
                  aria-label={t(typeLabelKey(item.type))}
                  checked={item.inAppEnabled}
                  onCheckedChange={(checked) => void togglePreference(item.type, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-center gap-3">
        {error ? <p className="text-sm text-destructive">{t("settings.notifications.saveError")}</p> : null}
      </div>
    </div>
  );
}

function groupPreferences(items: NotificationPreference[]) {
  const order = ["Social", "Community", "Security", "System"];
  const groups = new Map<string, NotificationPreference[]>();
  for (const item of items) {
    const key = item.category || "Community";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([category, groupItems]) => ({
      category,
      items: groupItems.sort((a, b) => typeLabelKey(a.type).localeCompare(typeLabelKey(b.type))),
    }))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}

function categoryLabelKey(category: string) {
  if (category === "Social") return "settings.notifications.categories.social";
  if (category === "Community") return "settings.notifications.categories.community";
  if (category === "Security") return "settings.notifications.categories.security";
  return "settings.notifications.categories.system";
}

function typeLabelKey(type: string) {
  switch (type) {
    case NotificationType.NewFollower:
      return "settings.notifications.types.newFollower.label";
    case NotificationType.FollowRequest:
      return "settings.notifications.types.followRequest.label";
    case NotificationType.FollowRequestAccepted:
      return "settings.notifications.types.followRequestAccepted.label";
    case NotificationType.ProfilePost:
      return "settings.notifications.types.profilePost.label";
    case NotificationType.CityPost:
      return "settings.notifications.types.cityPost.label";
    case NotificationType.FollowedFirstPost:
      return "settings.notifications.types.followedFirstPost.label";
    case NotificationType.PostLike:
      return "settings.notifications.types.postLike.label";
    case NotificationType.CommentLike:
      return "settings.notifications.types.commentLike.label";
    case NotificationType.PostComment:
      return "settings.notifications.types.postComment.label";
    case NotificationType.CommentReply:
      return "settings.notifications.types.commentReply.label";
    case NotificationType.SuspiciousLogin:
      return "settings.notifications.types.suspiciousLogin.label";
    default:
      return "settings.notifications.types.generic.label";
  }
}

function typeDescriptionKey(type: string) {
  switch (type) {
    case NotificationType.NewFollower:
      return "settings.notifications.types.newFollower.description";
    case NotificationType.FollowRequest:
      return "settings.notifications.types.followRequest.description";
    case NotificationType.FollowRequestAccepted:
      return "settings.notifications.types.followRequestAccepted.description";
    case NotificationType.ProfilePost:
      return "settings.notifications.types.profilePost.description";
    case NotificationType.CityPost:
      return "settings.notifications.types.cityPost.description";
    case NotificationType.FollowedFirstPost:
      return "settings.notifications.types.followedFirstPost.description";
    case NotificationType.PostLike:
      return "settings.notifications.types.postLike.description";
    case NotificationType.CommentLike:
      return "settings.notifications.types.commentLike.description";
    case NotificationType.PostComment:
      return "settings.notifications.types.postComment.description";
    case NotificationType.CommentReply:
      return "settings.notifications.types.commentReply.description";
    case NotificationType.SuspiciousLogin:
      return "settings.notifications.types.suspiciousLogin.description";
    default:
      return "settings.notifications.types.generic.description";
  }
}
