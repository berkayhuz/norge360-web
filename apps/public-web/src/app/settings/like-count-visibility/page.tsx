import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Button } from "@workspace/ui/components/primitives/button";
import { Field, FieldContent, FieldLabel } from "@workspace/ui/components/primitives/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { ProfileSettingsSidebar } from "@/features/profile/components/profile-settings-sidebar";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import { getAuthSessionStatus, getMyProfile, updateMyProfile } from "@/lib/api/accounts-server";

export default async function LikeCountVisibilitySettingsPage() {
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

  const myProfile = await getMyProfile();
  if (myProfile.kind !== "success") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert variant="destructive">
          <AlertTitle>Beğeni sayıları yüklenemedi</AlertTitle>
          <AlertDescription>Lütfen daha sonra tekrar deneyin.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const profile = myProfile.profile;
  const sidebarItems = buildProfileSettingsSidebarItems({
    accountPrivacy: "Hesap gizliliği",
    blockedUsers: "Engellenenler",
    commentPermissions: "Yorum izinleri",
    editProfile: t("profile.hero.editProfile"),
    hideLikeCounts: "Beğeni sayıları",
    notifications: t("settings.notifications.sidebarLabel"),
  });

  async function updateAction(formData: FormData) {
    "use server";

    await updateMyProfile({
      hideLikeCounts: getString(formData, "hideLikeCounts") === "true",
    });
    redirect("/settings/like-count-visibility");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-2">
      <ProfileSettingsSidebar description={t("settings.description")} items={sidebarItems} title={t("settings.title")} />

      <div className="relative col-span-4 block w-full lg:col-span-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Beğeni sayıları</CardTitle>
            <CardDescription>Beğeni sayılarını tüm platformda gizleyebilir veya gösterebilirsin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-6">
              <Field>
                <FieldLabel htmlFor="hideLikeCounts">Görünürlük</FieldLabel>
                <FieldContent>
                  <Select defaultValue={profile.hideLikeCounts ? "true" : "false"} name="hideLikeCounts">
                    <SelectTrigger id="hideLikeCounts">
                      <SelectValue placeholder="Görünürlük" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Beğeni sayılarını göster</SelectItem>
                      <SelectItem value="true">Beğeni sayılarını gizle</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <div className="flex justify-end">
                <Button type="submit">Kaydet</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}
