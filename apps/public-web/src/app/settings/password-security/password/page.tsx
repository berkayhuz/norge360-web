import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@workspace/ui/components/primitives/button";

import { PasswordSecurityPanels, type PasswordChangeFormState } from "@/features/security/components/password-security-panels";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PasswordSecurityPasswordPage() {
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

  const passwordInitialState: PasswordChangeFormState = {
    fieldErrors: {},
    values: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
  };

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
      headingDescription={t("settings.security.password.description")}
      headingTitle={t("settings.security.password.title")}
    >
      <PasswordSecurityPanels passwordInitialState={passwordInitialState} />
    </SettingsPageLayout>
  );
}
