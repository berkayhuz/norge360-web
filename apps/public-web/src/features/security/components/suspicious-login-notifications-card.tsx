"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Switch } from "@workspace/ui/components/forms/switch";

import { getNotificationPreferences, updateNotificationPreferences } from "@/features/notifications/lib/client";
import { NotificationType, type NotificationPreferences } from "@/features/notifications/lib/types";

type SuspiciousLoginNotificationsCardProps = {
  initialPreferences: NotificationPreferences;
};

export function SuspiciousLoginNotificationsCard({
  initialPreferences,
}: SuspiciousLoginNotificationsCardProps) {
  const t = useTranslations("public-web");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [emailEnabled, setEmailEnabled] = useState(getSuspiciousLoginEmailEnabled(initialPreferences));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void getNotificationPreferences()
      .then((result) => {
        if (active) {
          setPreferences(result);
          setEmailEnabled(getSuspiciousLoginEmailEnabled(result));
        }
      })
      .catch(() => {
        if (active) {
          setError(t("settings.security.notifications.loadError"));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  function toggle(checked: boolean) {
    setError(null);
    const previousEnabled = emailEnabled;
    setEmailEnabled(checked);
    startTransition(async () => {
      const nextItems = preferences.items.map((item) =>
        item.type === NotificationType.SuspiciousLogin ? { ...item, emailEnabled: checked } : item,
      );
      const hasItem = preferences.items.some((item) => item.type === NotificationType.SuspiciousLogin);
      const resolvedItems = hasItem
        ? nextItems
        : [
          ...nextItems,
          {
            category: "Security",
            emailEnabled: checked,
            inAppEnabled: true,
            pushEnabled: false,
            type: NotificationType.SuspiciousLogin,
          },
        ];

      try {
        const updated = await updateNotificationPreferences({
          items: resolvedItems,
        });
        setPreferences(updated);
        setEmailEnabled(getSuspiciousLoginEmailEnabled(updated));
      } catch {
        setEmailEnabled(previousEnabled);
        setError(t("settings.security.notifications.saveError"));
      }
    });
  }

  if (isLoading) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("settings.security.notifications.title")}</CardTitle>
          <CardDescription>{t("settings.security.notifications.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            {t("settings.security.actions.saving")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{t("settings.security.notifications.emailAlerts")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("settings.security.notifications.emailAlertsDescription")}
        </p>
      </div>
      <Switch
        aria-label={t("settings.security.notifications.emailAlerts")}
        checked={emailEnabled}
        onCheckedChange={(checked) => toggle(Boolean(checked))}
        disabled={isSaving}
      />
    </div>
  );
}

function getSuspiciousLoginEmailEnabled(preferences: NotificationPreferences) {
  return (
    preferences.items.find((item) => item.type === NotificationType.SuspiciousLogin)?.emailEnabled ?? false
  );
}
