import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { NotificationSettingsForm } from "@/features/notifications/components/notification-settings-form";
import type { NotificationPreferences } from "@/features/notifications/lib/types";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getNotificationPreferences } from "@/lib/api/notifications-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationSettingsPage() {
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
  const preferencesResult = await getNotificationPreferences();
  const initialPreferences: NotificationPreferences =
    preferencesResult.status === 200 && preferencesResult.data
      ? preferencesResult.data
      : { items: [] };

  return (
    <SettingsPageLayout
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.notifications.description")}
      headingTitle={t("settings.notifications.title")}
    >
      <NotificationSettingsForm initialPreferences={initialPreferences} />
    </SettingsPageLayout>
  );
}
