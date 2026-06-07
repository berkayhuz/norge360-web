"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Badge } from "@workspace/ui/components/data-display/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Button } from "@workspace/ui/components/primitives/button";

export type TrustedDevice = {
  deviceName: string | null;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  isRevoked: boolean;
  lastSeenAt: string | null;
  trustedAt: string;
  userAgent: string | null;
};

type AccountRecoveryPanelProps = {
  currentEmail: string;
  initialDevices: unknown[];
  recoveryCodesRemaining: number;
  trustedDevicesCount: number;
};

export function AccountRecoveryPanel({
  currentEmail,
  initialDevices,
  recoveryCodesRemaining,
  trustedDevicesCount,
}: AccountRecoveryPanelProps) {
  const t = useTranslations("public-web");
  const messages = {
    forbidden: t("settings.security.alert.forbidden"),
    unauthorized: t("settings.security.alert.unauthorized"),
    unavailable: t("settings.security.alert.unavailable"),
    unexpected: t("settings.security.alert.unexpected"),
    validation: t("settings.security.alert.validationError"),
  } as const;
  const [devices, setDevices] = useState<TrustedDevice[]>(() => normalizeDevices(initialDevices));
  const [trustedDeviceCount, setTrustedDeviceCount] = useState(trustedDevicesCount);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeTrustedDeviceCount = Math.max(trustedDeviceCount, devices.filter((device) => !device.isRevoked).length);

  function revokeDevice(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/auth/security/trusted-devices/${id}`, {
          credentials: "include",
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 404) {
            setDevices((current) => current.filter((item) => item.id !== id));
            setTrustedDeviceCount((current) => Math.max(0, current - 1));
            setSuccess(t("settings.security.recovery.deviceRevoked"));
            return;
          }

          const problem = await readProblemOrJson(response);
          setError(resolveSecurityErrorMessage(response.status, problem, messages));
          return;
        }
        setDevices((current) => current.filter((item) => item.id !== id));
        setTrustedDeviceCount((current) => Math.max(0, current - 1));
        setSuccess(t("settings.security.recovery.deviceRevoked"));
      } catch {
        setError(t("settings.security.alert.unexpected"));
      }
    });
  }

  return (
    <div>
      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader className="sr-only">
          <CardTitle>{t("settings.security.recovery.title")}</CardTitle>
          <CardDescription>{t("settings.security.recovery.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-0">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("settings.security.alert.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertTitle>{t("settings.security.alert.successTitle")}</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <div>
            <Tile label={t("settings.security.recovery.recoveryEmail")} value={currentEmail} />
            <Tile label={t("settings.security.recovery.recoveryCodes")} value={String(recoveryCodesRemaining)} />
            <Tile label={t("settings.security.recovery.passkeys")} value={String(activeTrustedDeviceCount)} />
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">{t("settings.security.recovery.passkeyTitle")}</div>
              <p className="text-sm text-muted-foreground">{t("settings.security.recovery.passkeyDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Windows Hello", "Face ID", "Touch ID", "YubiKey"].map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{t("settings.security.recovery.trustedDevices")}</div>
                <p className="text-sm text-muted-foreground">{t("settings.security.recovery.trustedDevicesDescription")}</p>
              </div>
              <Button asChild variant="outline">
                <a href="/settings/password-security/two-factor">{t("settings.security.recovery.manageRecoveryCodes")}</a>
              </Button>
            </div>

            <div className="space-y-3">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <div className="rounded-2xl border border-border/70 bg-background px-4 py-4" key={device.id}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{device.deviceName ?? t("settings.security.recovery.deviceFallback")}</p>
                          {device.isCurrent ? <Badge>{t("settings.security.sessions.currentBadge")}</Badge> : null}
                          {device.isRevoked ? <Badge variant="secondary">{t("settings.security.sessions.revokedBadge")}</Badge> : null}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{device.ipAddress ?? t("settings.security.sessions.unknown")}</p>
                          <p>{formatDate(device.lastSeenAt ?? device.trustedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          disabled={isPending || device.isRevoked}
                          onClick={() => revokeDevice(device.id)}
                          type="button"
                          variant="outline"
                        >
                          {isPending ? t("settings.security.actions.saving") : t("settings.security.recovery.removeDevice")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("settings.security.recovery.noTrustedDevices")}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-foreground">{value}</div>
    </div>
  );
}

function normalizeDevices(input: unknown): TrustedDevice[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : typeof record.Id === "string" ? record.Id : null;
      if (!id) return null;
      return {
        deviceName: readOptionalString(record, "deviceName", "DeviceName"),
        id,
        ipAddress: readOptionalString(record, "ipAddress", "IpAddress"),
        isCurrent: readBoolean(record, "isCurrent", "IsCurrent"),
        isRevoked: readBoolean(record, "isRevoked", "IsRevoked"),
        lastSeenAt: readOptionalString(record, "lastSeenAt", "LastSeenAt"),
        trustedAt: readOptionalString(record, "trustedAt", "TrustedAt") ?? new Date().toISOString(),
        userAgent: readOptionalString(record, "userAgent", "UserAgent"),
      };
    })
    .filter((item): item is TrustedDevice => item !== null);
}

function readOptionalString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readBoolean(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function readProblemOrJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
}

function resolveSecurityErrorMessage(
  status: number,
  payload: unknown,
  messages: {
    forbidden: string;
    unauthorized: string;
    unavailable: string;
    unexpected: string;
    validation: string;
  },
) {
  const record = asRecord(payload);
  const detail = typeof record?.detail === "string" ? record.detail : null;

  if (status === 401) {
    return messages.unauthorized;
  }

  if (status === 403) {
    return messages.forbidden;
  }

  if (status >= 500) {
    return messages.unavailable;
  }

  if (status === 400) {
    return detail ?? messages.validation;
  }

  return detail ?? messages.unexpected;
}

function asRecord(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  return input as Record<string, unknown>;
}
