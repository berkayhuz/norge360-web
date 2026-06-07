import { redirect } from "next/navigation";

import { CommunityPostDetailPage } from "@/features/community/components/community-post-detail-page";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export default async function PostPage(props: { params: Promise<{ username: string; postSlug: string }> }) {
  const { username, postSlug } = await props.params;
  const authSession = await getAuthSessionStatus();
  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  return <CommunityPostDetailPage isAuthenticated postSlug={postSlug} username={username} />;
}
