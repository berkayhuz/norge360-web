import { redirect } from "next/navigation";

import { CommunityExploreFeedPage } from "@/features/community/components/community-explore-feed-page";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExploreFeedPage() {
  const authSession = await getAuthSessionStatus();
  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  return <CommunityExploreFeedPage />;
}
