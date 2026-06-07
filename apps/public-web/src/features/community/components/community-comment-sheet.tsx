"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/overlay/sheet";

import { CommunityCommentThread } from "@/features/community/components/community-comment-thread";
import { useCommunityComments, useCommunityPost } from "@/features/community/lib/hooks";
import { reportPost } from "@/features/community/lib/client";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

export function CommunityCommentSheet({ postId }: { postId: string }) {
  const t = useTranslations("public-web");
  const { item: post, load: loadPost } = useCommunityPost(postId);
  const { addComment, deleteComment, error, hasNextPage, items, load, loadMore, loadMoreError, loading, loadingMore, reply, toggleLike } = useCommunityComments(postId);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await getClientAuthSessionStatus();
      if (!cancelled) {
        setIsAuthenticated(session.authenticated);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <MessageCircle className="size-4" />
          {t("community.post.comment")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("community.comment.title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
            <CommunityCommentThread
              comments={items}
              commentsEnabled={post?.commentsEnabled ?? true}
              error={error}
              isAuthenticated={isAuthenticated}
            hasNextPage={hasNextPage}
            loading={loading}
            loadMore={loadMore}
            loadMoreError={loadMoreError}
            loadingMore={loadingMore}
            onAddComment={addComment}
            onReply={reply}
            onDeleteComment={deleteComment}
            onReportPost={async (reason, description) => {
              await reportPost(postId, reason, description);
            }}
            onToggleLike={toggleLike}
            postAuthor={post?.author ?? null}
            fallbackCreatedAt={post?.createdAt ?? null}
            inlineReplies={false}
            commentDetailHref={(comment) =>
              post?.author?.username && post.slug && comment.slug
                ? `/${post.author.username}/feed/${post.slug}/comments/${comment.slug}`
                : "#"
            }
          />
        </div>
    </SheetContent>
  </Sheet>
  );
}
