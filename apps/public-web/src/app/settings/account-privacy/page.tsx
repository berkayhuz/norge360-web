import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getMyProfile } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";
import { AutosaveProfileSelect } from "@/features/settings/components/autosave-profile-select";

export default async function AccountPrivacySettingsPage() {
  const t = await getTranslations("public-web");
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  const myProfile = await getMyProfile();
  if (myProfile.kind !== "success") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertTitle>{t("settings.accountPrivacy.loadErrorTitle")}</AlertTitle>
          <AlertDescription>{t("settings.accountPrivacy.loadErrorDescription")}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const profile = myProfile.profile;
  const sidebarItems = buildProfileSettingsSidebarItems({
    accountPrivacy: t("settings.sidebar.accountPrivacy"),
    blockedUsers: t("settings.sidebar.blockedUsers"),
    commentPermissions: t("settings.sidebar.commentPermissions"),
    editProfile: t("profile.hero.editProfile"),
    hideLikeCounts: t("settings.sidebar.hideLikeCounts"),
    notifications: t("settings.notifications.sidebarLabel"),
    security: t("settings.sidebar.security"),
  });

  return (
    <SettingsPageLayout
      description={t("settings.description")}
      items={sidebarItems}
      title={t("settings.title")}
      headingDescription={t("settings.accountPrivacy.description")}
      headingTitle={t("settings.accountPrivacy.title")}
    >
      <div className="rounded-none border-none bg-transparent p-0 shadow-none ring-0">
        <AutosaveProfileSelect
          fieldId="profileVisibility"
          fieldLabel={t("settings.accountPrivacy.fieldLabel")}
          initialValue={profile.profileVisibility}
          kind="profileVisibility"
          options={[
            { label: t("settings.visibility.public"), value: "Public" },
            { label: t("settings.visibility.private"), value: "Private" },
            { label: t("settings.visibility.followersOnly"), value: "FollowersOnly" },
          ]}
        />
      </div>
    </SettingsPageLayout>
  );
}
