import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { NotificationsPageClient } from "@/features/notifications/components/notifications-page-client";
import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getNotificationsPage } from "@/lib/api/notifications-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  const t = await getTranslations("public-web");
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  const notificationsResult = await getNotificationsPage({
    markAsSeen: true,
    page: 1,
    pageSize: 20,
  });
  const initialPage = notificationsResult.status === 200 ? notificationsResult.data ?? null : null;

  return (
    <CommunityPageScaffold>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">{t("notifications.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("notifications.description")}</p>
        </div>

        <NotificationsPageClient initialPage={initialPage} />
      </main>
    </CommunityPageScaffold>
  );
}
