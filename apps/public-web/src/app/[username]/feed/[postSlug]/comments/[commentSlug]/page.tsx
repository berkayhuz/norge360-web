import { redirect } from "next/navigation";

import { CommunityCommentDetailPage } from "@/features/community/components/community-comment-detail-page";
import { getAuthSessionStatus } from "@/lib/api/accounts-server";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export default async function CommentPage(props: { params: Promise<{ username: string; postSlug: string; commentSlug: string }> }) {
  const { username, postSlug, commentSlug } = await props.params;
  const authSession = await getAuthSessionStatus();
  if (authSession.kind !== "authenticated") {
    redirect(getAuthWebLoginUrl());
  }

  return <CommunityCommentDetailPage commentSlug={commentSlug} isAuthenticated postSlug={postSlug} username={username} />;
}
