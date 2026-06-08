import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { MessagingSettingsForm } from "@/features/messaging/components/messaging-settings-form";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MessagingSettingsPage() {
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
    messaging: t("settings.messaging.sidebarLabel"),
    notifications: t("settings.notifications.sidebarLabel"),
    searchHistory: t("searchHistory.sidebarLabel"),
    security: t("settings.sidebar.security"),
  });

  return (
    <SettingsPageLayout
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.messaging.description")}
      headingTitle={t("settings.messaging.title")}
    >
      <MessagingSettingsForm />
    </SettingsPageLayout>
  );
}
