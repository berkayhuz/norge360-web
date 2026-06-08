import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@workspace/ui/components/primitives/button";

import { SecuritySessionsPanel } from "@/features/security/components/security-sessions-panel";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getMySessions } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PasswordSecuritySessionsPage() {
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
  const currentDevice = describeCurrentDevice(currentSession.userAgent, t("settings.security.sessions.unknown"));

  return (
    <SettingsPageLayout
      actions={
        <Button asChild variant="outline">
          <Link href="/settings/password-security">{t("settings.security.sessions.back")}</Link>
        </Button>
      }
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.security.sessions.pageDescription")}
      headingTitle={t("settings.security.sessions.pageTitle")}
    >
      <SecuritySessionsPanel
        currentDevice={currentDevice}
        currentSession={currentSession}
        sessions={sessions.length > 0 ? sessions : [currentSession]}
      />
    </SettingsPageLayout>
  );
}

function describeCurrentDevice(userAgent: string | null, fallback: string) {
  if (!userAgent) {
    return fallback;
  }

  const os = detectOs(userAgent);
  const browser = detectBrowser(userAgent);
  const device = /Mobile|iPhone|Android/i.test(userAgent) ? "Mobile" : "Desktop";
  return `${os} ${device} - ${browser}`.trim();
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
