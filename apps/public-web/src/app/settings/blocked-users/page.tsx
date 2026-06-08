import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { BlockedUsersPanel } from "@/features/profile/components/blocked-users-panel";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export default async function BlockedUsersSettingsPage() {
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

  return (
    <SettingsPageLayout
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("profile.blocked.description")}
      headingTitle={t("profile.blocked.title")}
    >
      <BlockedUsersPanel />
    </SettingsPageLayout>
  );
}
