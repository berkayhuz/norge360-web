import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@workspace/ui/components/primitives/button";

import { SuspiciousLoginNotificationsCard } from "@/features/security/components/suspicious-login-notifications-card";
import { SecurityScoreDialogButton } from "@/features/security/components/security-summary-dialogs";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getMySessions, getSecurityOverview } from "@/lib/api/accounts-server";
import { getNotificationPreferences } from "@/lib/api/notifications-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PasswordSecurityPage() {
  const t = await getTranslations("public-web");
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  const sidebarItems = buildProfileSettingsSidebarItems({
    accountPrivacy: t("settings.sidebar.accountPrivacy"),
    blockedUsers: t("settings.sidebar.blockedUsers"),
    commentPermissions: t("settings.sidebar.commentPermissions"),
    editProfile: t("profile.hero.editProfile"),
    hideLikeCounts: t("settings.sidebar.hideLikeCounts"),
    notifications: t("settings.notifications.sidebarLabel"),
    searchHistory: t("searchHistory.sidebarLabel"),
    messaging: t("settings.messaging.sidebarLabel"),
    security: t("settings.sidebar.security"),
  });

  const requestHeaders = await headers();
  const sessionsResult = await getMySessions();
  const sessions = sessionsResult.kind === "success" ? sessionsResult.sessions : [];
  const currentSession =
    sessions.find((session) => session.isCurrent) ??
    sessions[0] ?? {
      createdAt: new Date().toISOString(),
      ipAddress: requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? null,
      isCurrent: true,
      isRevoked: false,
      lastSeenAt: null,
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      revokedReason: null,
      sessionId: authSession.session.sessionId,
      userAgent: requestHeaders.get("user-agent"),
    };

  const overviewResult = await getSecurityOverview();
  const overview =
    overviewResult.kind === "success"
      ? overviewResult.overview
      : {
        email: authSession.session.email,
        emailConfirmed: authSession.session.emailConfirmed,
        hasAuthenticator: false,
        isMfaEnabled: false,
        lastLoginAt: null,
        lastSecurityEventAt: null,
        passwordChangedAt: null,
        recoveryCodesRemaining: 0,
        trustedDevicesCount: Math.max(sessions.filter((session) => !session.isRevoked).length, 1),
      };

  const notificationPreferences = await getNotificationPreferences();
  const suspiciousLoginPreference = notificationPreferences.data?.items.find(
    (item) => item.type === "security.suspicious_login",
  );
  const suspiciousLoginEmailEnabled = suspiciousLoginPreference?.emailEnabled ?? false;
  const currentDeviceInfo = describeCurrentDevice(currentSession.userAgent);
  const activeSessionCount = sessions.filter((session) => !session.isRevoked).length || 1;
  const securityScoreState = calculateSecurityScore({
    activeSessionCount,
    emailConfirmed: overview.emailConfirmed,
    hasAuthenticator: overview.hasAuthenticator,
    hasRecentPassword: isWithinDays(overview.passwordChangedAt, 90),
    hasRecoveryCodes: overview.recoveryCodesRemaining > 0,
    hasTwoFactor: overview.isMfaEnabled,
    suspiciousLoginEmailEnabled,
    trustedDevicesCount: overview.trustedDevicesCount,
  });

  return (
    <SettingsPageLayout
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.security.pageDescription")}
      headingTitle={t("settings.security.pageTitle")}
    >
      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.currentEmailLabel")}</div>
            <div className="mt-1 text-foreground">{overview.email}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.currentDevice")}</div>
            <div className="mt-1 text-foreground">{currentDeviceInfo.label}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.sessions.lastLoginTitle")}</div>
            <div className="mt-1 text-foreground">
              <div className="flex items-center justify-start gap-1">
                <p>
                  {t("settings.security.sessions.lastLogin")}:
                </p>
                <span>{formatDate(currentSession.createdAt)}</span>
              </div>
              <div className="flex items-center justify-start gap-1">
                <p>
                  {t("settings.security.sessions.ipAddressLabel")}
                </p>
                <span>{currentSession.ipAddress ?? t("settings.security.sessions.unknown")}</span>
              </div>
            </div>
          </div>
        </div>

      <div className="space-y-2">
          <SummaryTile
            action={
              <Button asChild variant="outline">
                <Link href="/settings/password-security/password">{t("settings.security.actions.manage")}</Link>
              </Button>
            }
            description={overview.passwordChangedAt ? formatDate(overview.passwordChangedAt) : t("settings.security.password.never")}
            title={t("settings.security.password.statusLabel")}
          />
          <SummaryTile
            action={
              <Button asChild variant="outline">
                <Link href="/settings/password-security/email">
                  {overview.emailConfirmed ? t("settings.security.actions.manage") : t("settings.security.email.verifyNow")}
                </Link>
              </Button>
            }
            description={overview.emailConfirmed ? t("settings.security.email.statusLabel") : t("settings.security.email.notVerified")}
            title={t("settings.security.email.statusLabel")}
          />
          <SummaryTile
            action={
              <Button asChild variant="outline">
                <Link href="/settings/password-security/sessions">{t("settings.security.sessions.viewSessions")}</Link>
              </Button>
            }
            description={t("settings.security.sessions.activeBadge", { count: activeSessionCount })}
            title={t("settings.security.sessions.listTitle")}
          />
          <SummaryTile
            action={
              <Button asChild variant="outline">
                <Link href="/settings/password-security/two-factor">{t("settings.security.twoFactor.manage")}</Link>
              </Button>
            }
            description={overview.isMfaEnabled ? t("settings.security.twoFactor.enabled") : t("settings.security.twoFactor.disabled")}
            title={t("settings.security.twoFactor.title")}
          />
          <SummaryTile
            action={
              <Button asChild variant="outline">
                <Link href="/settings/password-security/account-recovery">{t("settings.security.actions.manage")}</Link>
              </Button>
            }
            description={t("settings.security.recovery.description")}
            title={t("settings.security.recovery.title")}
          />
          <SummaryTile
            action={
              <SecurityScoreDialogButton
                missingItems={securityScoreState.missingItems}
                score={securityScoreState.score}
              />
            }
            description={t("settings.security.securityScore.description")}
            title={`${t("settings.security.securityScore.label")} ${securityScoreState.score}/100`}
          />
          <SuspiciousLoginNotificationsCard initialPreferences={notificationPreferences.data ?? { items: [] }} />
      </div>
    </SettingsPageLayout>
  );
}

function SummaryTile({
  action,
  description,
  title,
}: {
  action: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="px-4 py-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function calculateSecurityScore(input: {
  activeSessionCount: number;
  emailConfirmed: boolean;
  hasAuthenticator: boolean;
  hasRecentPassword: boolean;
  hasRecoveryCodes: boolean;
  hasTwoFactor: boolean;
  suspiciousLoginEmailEnabled: boolean;
  trustedDevicesCount: number;
}) {
  const missingItems: string[] = [];
  let score = 0;

  if (input.emailConfirmed) {
    score += 15;
  } else {
    missingItems.push("Verify your email address.");
  }

  if (input.hasTwoFactor) {
    score += 25;
  } else {
    missingItems.push("Enable two-factor authentication.");
  }

  if (input.hasAuthenticator) {
    score += 10;
  } else {
    missingItems.push("Set up an authenticator app or passkey.");
  }

  if (input.hasRecoveryCodes) {
    score += 10;
  } else {
    missingItems.push("Generate backup recovery codes.");
  }

  if (input.hasRecentPassword) {
    score += 10;
  } else {
    missingItems.push("Change your password regularly.");
  }

  if (input.suspiciousLoginEmailEnabled) {
    score += 10;
  } else {
    missingItems.push("Turn on suspicious login email alerts.");
  }

  if (input.activeSessionCount <= 3) {
    score += 10;
  } else {
    missingItems.push("Close devices you no longer use.");
  }

  if (input.trustedDevicesCount > 0) {
    score += 10;
  } else {
    missingItems.push("Add a trusted device for quicker recovery.");
  }

  return {
    missingItems,
    score: Math.min(score, 100),
  };
}

function isWithinDays(value: string | null, maxDays: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= maxDays;
}

function describeCurrentDevice(userAgent: string | null) {
  if (!userAgent) {
    return {
      browser: "Unknown browser",
      label: "Unknown device",
      os: "Unknown OS",
    };
  }

  const os = detectOs(userAgent);
  const browser = detectBrowser(userAgent);
  const device = /Mobile|iPhone|Android/i.test(userAgent) ? "mobile device" : "desktop device";
  return {
    browser,
    label: `${os} ${device} - ${browser}`.trim(),
    os,
  };
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
