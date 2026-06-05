import { CommunityPostDetailPage } from "@/features/community/components/community-post-detail-page";

export default async function PostPage(props: { params: Promise<{ postId: string }> }) {
  const { postId } = await props.params;
  return <CommunityPostDetailPage postId={postId} />;
}
