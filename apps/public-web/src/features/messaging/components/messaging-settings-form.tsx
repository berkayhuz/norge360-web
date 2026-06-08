"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";
import { Switch } from "@workspace/ui/components/forms/switch";

type MessagingSettings = {
  messagePermission: number | string;
  groupInvitePermission: number | string;
  onlineVisibility: number | string;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  linkPreviewsEnabled: boolean;
  showMessagePreviewInNotifications: boolean;
};

const MESSAGE_PERMISSION_OPTIONS = [1, 2, 3, 4, 5] as const;
const GROUP_INVITE_OPTIONS = [1, 2, 3, 4] as const;
const ONLINE_VISIBILITY_OPTIONS = [1, 2, 3, 4, 5] as const;

export function MessagingSettingsForm() {
  const t = useTranslations("public-web");
  const [settings, setSettings] = useState<MessagingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/messaging/settings", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("load_failed");
        const payload = (await response.json()) as MessagingSettings;
        if (!cancelled) setSettings(payload);
      } catch {
        if (!cancelled) setError(t("settings.messaging.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function save(nextSettings: MessagingSettings) {
    setSettings(nextSettings);
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/messaging/settings", {
        body: JSON.stringify(toPayload(nextSettings)),
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      if (!response.ok) throw new Error("save_failed");
      setSettings((await response.json()) as MessagingSettings);
      setSaved(true);
    } catch {
      setError(t("settings.messaging.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <div className="rounded-lg border border-destructive/30 px-4 py-8 text-center text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="divide-y divide-border/70">
      <SettingsSelectRow
        label={t("settings.messaging.messagePermission")}
        description={t("settings.messaging.messagePermissionDescription")}
        value={String(toEnumValue(settings.messagePermission, 1))}
        options={MESSAGE_PERMISSION_OPTIONS.map((value) => ({ value, label: t(`settings.messaging.permissions.${value}`) }))}
        onChange={(value) => void save({ ...settings, messagePermission: Number(value) })}
      />
      <SettingsSelectRow
        label={t("settings.messaging.groupInvitePermission")}
        description={t("settings.messaging.groupInvitePermissionDescription")}
        value={String(toEnumValue(settings.groupInvitePermission, 1))}
        options={GROUP_INVITE_OPTIONS.map((value) => ({ value, label: t(`settings.messaging.groupInvites.${value}`) }))}
        onChange={(value) => void save({ ...settings, groupInvitePermission: Number(value) })}
      />
      <SettingsSelectRow
        label={t("settings.messaging.onlineVisibility")}
        description={t("settings.messaging.onlineVisibilityDescription")}
        value={String(toEnumValue(settings.onlineVisibility, 4))}
        options={ONLINE_VISIBILITY_OPTIONS.map((value) => ({ value, label: t(`settings.messaging.online.${value}`) }))}
        onChange={(value) => void save({ ...settings, onlineVisibility: Number(value) })}
      />
      <SettingsSwitchRow
        label={t("settings.messaging.readReceipts")}
        description={t("settings.messaging.readReceiptsDescription")}
        checked={settings.readReceiptsEnabled}
        onChange={(checked) => void save({ ...settings, readReceiptsEnabled: checked })}
      />
      <SettingsSwitchRow
        label={t("settings.messaging.typingIndicators")}
        description={t("settings.messaging.typingIndicatorsDescription")}
        checked={settings.typingIndicatorsEnabled}
        onChange={(checked) => void save({ ...settings, typingIndicatorsEnabled: checked })}
      />
      <SettingsSwitchRow
        label={t("settings.messaging.linkPreviews")}
        description={t("settings.messaging.linkPreviewsDescription")}
        checked={settings.linkPreviewsEnabled}
        onChange={(checked) => void save({ ...settings, linkPreviewsEnabled: checked })}
      />

      <div className="flex min-h-10 items-center justify-center gap-3 pt-4">
        {saving ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        {saved ? <p className="text-sm text-muted-foreground">{t("settings.messaging.saved")}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function SettingsSelectRow({
  description,
  label,
  onChange,
  options,
  value,
}: {
  description: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: number; label: string }>;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SettingsSwitchRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function toPayload(settings: MessagingSettings) {
  return {
    messagePermission: toEnumValue(settings.messagePermission, 1),
    groupInvitePermission: toEnumValue(settings.groupInvitePermission, 1),
    onlineVisibility: toEnumValue(settings.onlineVisibility, 4),
    readReceiptsEnabled: settings.readReceiptsEnabled,
    typingIndicatorsEnabled: settings.typingIndicatorsEnabled,
    linkPreviewsEnabled: settings.linkPreviewsEnabled,
    showMessagePreviewInNotifications: false,
  };
}

function toEnumValue(value: number | string, fallback: number) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const normalized = value.toLowerCase();
  if (normalized === "everyone") return 1;
  if (normalized === "followers") return 2;
  if (normalized === "following") return 3;
  if (normalized === "mutuals") return 4;
  if (normalized === "nobody") return 5;
  return fallback;
}
