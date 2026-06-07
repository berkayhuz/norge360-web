import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@workspace/ui/components/primitives/button";

import { AccountRecoveryPanel } from "@/features/security/components/account-recovery-panel";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getSecurityOverview, getTrustedDevices } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountRecoveryPage() {
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
    security: t("settings.sidebar.security"),
  });

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
          trustedDevicesCount: 0,
        };
  const trustedDevices = await getTrustedDevices();

  return (
    <SettingsPageLayout
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/settings/password-security">{t("settings.security.sessions.back")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/password-security/two-factor">{t("settings.security.twoFactor.manage")}</Link>
          </Button>
        </>
      }
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.security.recovery.description")}
      headingTitle={t("settings.security.recovery.title")}
    >
      <AccountRecoveryPanel
        currentEmail={overview.email}
        initialDevices={trustedDevices}
        recoveryCodesRemaining={overview.recoveryCodesRemaining}
        trustedDevicesCount={overview.trustedDevicesCount}
      />
    </SettingsPageLayout>
  );
}
