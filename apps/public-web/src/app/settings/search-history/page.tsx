import { getTranslations } from "next-intl/server";

import { SearchHistorySettingsPanel } from "@/features/search/components/search-history-settings-panel";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchHistorySettingsPage() {
  const t = await getTranslations("public-web");
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
      headingDescription={t("searchHistory.description")}
      headingTitle={t("searchHistory.title")}
    >
      <SearchHistorySettingsPanel />
    </SettingsPageLayout>
  );
}
