import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { getTranslations } from "next-intl/server";

import { NotificationSettingsForm } from "@/features/notifications/components/notification-settings-form";
import type { NotificationPreferences } from "@/features/notifications/lib/types";
import { ProfileSettingsSidebar } from "@/features/profile/components/profile-settings-sidebar";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getNotificationPreferences } from "@/lib/api/notifications-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationSettingsPage() {
  const t = await getTranslations("public-web");
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert variant={authSession.kind === "upstreamError" ? "destructive" : undefined}>
          <AlertTitle>{t("settings.loginRequiredTitle")}</AlertTitle>
          <AlertDescription>{t("settings.loginRequiredDescription")}</AlertDescription>
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
  const preferencesResult = await getNotificationPreferences();
  const initialPreferences: NotificationPreferences =
    preferencesResult.status === 200 && preferencesResult.data
      ? preferencesResult.data
      : { items: [] };

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-2">
      <ProfileSettingsSidebar
        description={t("settings.description")}
        items={sidebarItems}
        title={t("settings.title")}
      />

      <div className="relative col-span-4 block w-full space-y-5 lg:col-span-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            {t("settings.notifications.title")}
          </h1>
        <p className="mt-2 text-sm text-muted-foreground">
            {t("settings.notifications.description")}
          </p>
        </div>
        <NotificationSettingsForm initialPreferences={initialPreferences} />
      </div>
    </main>
  );
}
