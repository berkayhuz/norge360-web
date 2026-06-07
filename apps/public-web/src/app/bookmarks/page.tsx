import { redirect } from "next/navigation";

import { CommunityBookmarksPage } from "@/features/community/components/community-bookmarks-page";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookmarksPage() {
  const authSession = await getAuthSessionStatus();

  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  return <CommunityBookmarksPage />;
}
