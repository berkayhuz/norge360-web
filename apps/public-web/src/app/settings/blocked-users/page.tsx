import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { getTranslations } from "next-intl/server";

import { BlockedUsersPanel } from "@/features/profile/components/blocked-users-panel";
import { ProfileSettingsSidebar } from "@/features/profile/components/profile-settings-sidebar";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";

export default async function BlockedUsersSettingsPage() {
  const t = await getTranslations("public-web");
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert>
          <AlertTitle>{t("notifications.loginRequiredTitle")}</AlertTitle>
          <AlertDescription>{t("notifications.loginRequiredDescription")}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const sidebarItems = buildProfileSettingsSidebarItems({
    accountPrivacy: "Hesap gizliliği",
    blockedUsers: "Engellenenler",
    commentPermissions: "Yorum izinleri",
    editProfile: t("profile.hero.editProfile"),
    hideLikeCounts: "Beğeni sayıları",
    notifications: t("settings.notifications.sidebarLabel"),
  });

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-2">
      <ProfileSettingsSidebar
        description={t("settings.description")}
        items={sidebarItems}
        title={t("settings.title")}
      />

      <div className="relative col-span-4 block w-full lg:col-span-3">
        <BlockedUsersPanel />
      </div>
    </main>
  );
}
