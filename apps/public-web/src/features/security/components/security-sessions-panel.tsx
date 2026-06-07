"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Badge } from "@workspace/ui/components/data-display/badge";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Button } from "@workspace/ui/components/primitives/button";

import type { AuthSessionSummary } from "@/lib/api/accounts-types";

type SecuritySessionsPanelProps = {
  currentDevice: string;
  currentSession: AuthSessionSummary;
  sessions: AuthSessionSummary[];
};

export function SecuritySessionsPanel({
  currentDevice,
  currentSession,
  sessions,
}: SecuritySessionsPanelProps) {
  const t = useTranslations("public-web");
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeSessions = sessions.filter((session) => !session.isRevoked);

  function revokeAllOthers() {
    setError(null);
    setPendingKey("revoke-others");
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/sessions/revoke-others", {
          credentials: "include",
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("revoke_others_failed");
        }

        router.refresh();
      } catch {
        setError(t("settings.security.sessions.actionsError"));
      } finally {
        setPendingKey(null);
      }
    });
  }

  function revokeSession(session: AuthSessionSummary) {
    const actionKey = `revoke-${session.sessionId}`;
    setError(null);
    setPendingKey(actionKey);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/auth/sessions/${session.sessionId}`, {
          credentials: "include",
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("revoke_session_failed");
        }

        if (session.isCurrent) {
          await fetch("/api/auth/logout", {
            body: JSON.stringify({}),
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });
        }

        router.refresh();
      } catch {
        setError(t("settings.security.sessions.actionsError"));
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <>
      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader className="space-y-3 px-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t("settings.security.sessions.currentSessionTitle")}</CardTitle>
              <CardDescription>{t("settings.security.sessions.currentSessionDescription")}</CardDescription>
            </div>
            <Button
              disabled={isPending && pendingKey === "revoke-others"}
              onClick={revokeAllOthers}
              variant="outline"
            >
              {isPending && pendingKey === "revoke-others"
                ? t("settings.security.actions.saving")
                : t("settings.security.sessions.revokeOthers")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 px-0">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.currentDevice")}</div>
            <div className="mt-1 text-foreground">{currentDevice}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.sessions.lastLogin")}</div>
            <div className="mt-1 text-foreground">{formatDate(currentSession.createdAt)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.sessions.ipAddressLabel")}</div>
            <div className="mt-1 text-foreground">{currentSession.ipAddress ?? t("settings.security.sessions.unknown")}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t("settings.security.sessions.listTitle")}</CardTitle>
              <CardDescription>{t("settings.security.sessions.listDescription")}</CardDescription>
            </div>
            <Badge variant="secondary">{t("settings.security.sessions.activeBadge", { count: activeSessions.length })}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-0">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("settings.security.alert.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {activeSessions.length > 0 ? (
            activeSessions.map((session) => {
              const device = describeDevice(session.userAgent);
              return (
                <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-4" key={session.sessionId}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{device.device}</p>
                        {session.isCurrent ? <Badge>{t("settings.security.sessions.currentBadge")}</Badge> : null}
                        {session.isRevoked ? <Badge variant="secondary">{t("settings.security.sessions.revokedBadge")}</Badge> : null}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">{t("settings.security.sessions.osLabel")}:</span>{" "}
                          {device.os}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">{t("settings.security.sessions.browserLabel")}:</span>{" "}
                          {device.browser}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">{t("settings.security.sessions.createdAtLabel")}:</span>{" "}
                          {formatDate(session.createdAt)}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">{t("settings.security.sessions.ipAddressLabel")}:</span>{" "}
                          {session.ipAddress ?? t("settings.security.sessions.unknown")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={Boolean(pendingKey) && pendingKey === `revoke-${session.sessionId}`}
                        onClick={() => revokeSession(session)}
                        variant="outline"
                      >
                        {Boolean(pendingKey) && pendingKey === `revoke-${session.sessionId}`
                          ? t("settings.security.actions.saving")
                          : session.isCurrent
                            ? t("settings.security.sessions.terminateCurrent")
                            : t("settings.security.sessions.terminate")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {t("settings.security.sessions.noOtherSessions")}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function describeDevice(userAgent: string | null) {
  const ua = userAgent ?? "";
  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  const device = /Mobile|iPhone|Android/i.test(ua) ? "Mobile device" : "Desktop device";
  return { browser, device: `${os} ${device}`.trim(), os };
}

function detectOs(userAgent: string) {
  if (/Windows NT/i.test(userAgent)) return "Windows";
  if (/Mac OS X/i.test(userAgent) && /Mobile/i.test(userAgent)) return "iOS";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function detectBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Google Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "Unknown browser";
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
