import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getMyProfile } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SettingsPageLayout } from "@/features/settings/components/settings-page-layout";
import { AutosaveProfileSelect } from "@/features/settings/components/autosave-profile-select";

export default async function CommentPermissionsSettingsPage() {
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
          <AlertTitle>{t("settings.commentPermissions.loadErrorTitle")}</AlertTitle>
          <AlertDescription>{t("settings.commentPermissions.loadErrorDescription")}</AlertDescription>
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
      headingDescription={t("settings.commentPermissions.description")}
      headingTitle={t("settings.commentPermissions.title")}
    >
      <div className="rounded-none border-none bg-transparent p-0 shadow-none ring-0">
        <AutosaveProfileSelect
          fieldId="commentAudience"
          fieldLabel={t("settings.commentPermissions.fieldLabel")}
          initialValue={profile.commentAudience}
          kind="commentAudience"
          options={[
            { label: t("settings.commentPermissions.options.followers"), value: "Followers" },
            { label: t("settings.commentPermissions.options.mutualFollowers"), value: "MutualFollowers" },
            { label: t("settings.commentPermissions.options.closed"), value: "Closed" },
          ]}
        />
      </div>
    </SettingsPageLayout>
  );
}
