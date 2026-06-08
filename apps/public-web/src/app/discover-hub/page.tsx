import { redirect } from "next/navigation";

import { DiscoverHubPage } from "@/features/discovery/components/discover-hub-page";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiscoverHubRoute() {
  const authSession = await getAuthSessionStatus();
  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  return <DiscoverHubPage />;
}
