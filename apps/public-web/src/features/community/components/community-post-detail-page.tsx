"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { CommunityPostActions } from "@/features/community/components/community-post-actions";
import { CommunityPostCardUserHeaders } from "@/features/community/components/community-post-card-user-headers";
import { CommunityPostMediaViewer } from "@/features/community/components/community-post-media-viewer";
import { CommunityCommentThread } from "@/features/community/components/community-comment-thread";
import {
  clearPostInterest,
  deleteCommunityPost,
  removePostReaction,
  reportPost,
  setPostInterest,
  setPostReaction,
  setPostCommentsEnabled,
  setPostHideLikeCount,
  togglePostLike,
  togglePostSave,
  updateCommunityPost,
} from "@/features/community/lib/client";
import { useCommunityComments, useCommunityPostBySlug } from "@/features/community/lib/hooks";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { formatRelativeTimeLabel } from "@/lib/date-format";
import { ChevronLeftIcon, Loader2 } from "lucide-react";

export function CommunityPostDetailPage({ username, postSlug, isAuthenticated }: { username: string; postSlug: string; isAuthenticated: boolean }) {
  const t = useTranslations("public-web");
  const { item, load, error, loading } = useCommunityPostBySlug(username, postSlug);
  const {
    addComment,
    deleteComment,
    error: commentsError,
    hasNextPage,
    items: comments,
    load: loadComments,
    loadMore,
    loadMoreError,
    loading: commentsLoading,
    loadingMore,
    reply,
    toggleLike: toggleCommentLike,
  } = useCommunityComments(item?.id ?? "");

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!item?.id) {
      return;
    }

    void loadComments();
  }, [item?.id, loadComments]);

  const createdAtLabel = useMemo(() => formatRelativeTimeLabel(item?.createdAt) ?? "", [item?.createdAt]);

  const actions = useMemo(
    () => ({
      async createPost() {
        throw new Error("not_supported");
      },
      async updatePost(
        targetPostId: string,
        payload: {
          caption: string;
          city: string;
          district: string;
          existingMediaIds: string[];
          removeMediaIds: string[];
          mediaOrder: string[];
          mediaFiles: File[];
        },
      ) {
        await updateCommunityPost(targetPostId, payload);
        window.location.reload();
      },
      async deletePost(targetPostId: string) {
        await deleteCommunityPost(targetPostId);
        window.location.href = "/";
      },
      async setCommentsEnabled(targetPostId: string, enabled: boolean) {
        await setPostCommentsEnabled(targetPostId, enabled);
        window.location.reload();
      },
      async setHideLikeCount(targetPostId: string, hideLikeCount: boolean) {
        await setPostHideLikeCount(targetPostId, hideLikeCount);
        window.location.reload();
      },
      async toggleLike(targetPostId: string, isLiked: boolean) {
        await togglePostLike(targetPostId, !isLiked);
      },
      async toggleSave(targetPostId: string, isSaved: boolean) {
        await togglePostSave(targetPostId, !isSaved);
      },
      async setInterest(targetPostId: string, interest: "Interested" | "NotInterested") {
        if (interest === "NotInterested") {
          await setPostInterest(targetPostId, interest);
          return;
        }
        await setPostInterest(targetPostId, interest);
      },
      async clearInterest(targetPostId: string) {
        await clearPostInterest(targetPostId);
      },
      async setReaction(targetPostId: string, emoji: string) {
        await setPostReaction(targetPostId, emoji);
      },
      async removeReaction(targetPostId: string) {
        await removePostReaction(targetPostId);
      },
      async reportPost(targetPostId: string, reason: "Spam" | "Harassment" | "HateSpeech" | "Nudity" | "Violence" | "Scam" | "Other", description: string) {
        await reportPost(targetPostId, reason, description);
      },
    }),
    [],
  );

  async function protectAction(callback: () => Promise<void>) {
    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    await callback();
  }

  return (
    <CommunityPageScaffold>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeftIcon className="size-4" />
            {t("community.post.backToFeed")}
          </Link>
        </div>

        <section className="space-y-4 pb-2">
          {loading ? <div className="flex items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div> : null}
          {error ? <p className="text-sm text-destructive">{t("community.feed.error")}</p> : null}

          {item ? (
            <>
              <CommunityPostCardUserHeaders
                item={item}
                actions={actions}
                isAuthenticated={isAuthenticated}
                onProtectedAction={protectAction}
                postHref={`/${username}/feed/${item.slug ?? postSlug}`}
              />
              {item.media.length > 0 ? (
                <CommunityPostMediaViewer media={item.media} alt={item.caption ?? t("community.post.mediaAlt")} />
              ) : null}
              {item.caption ? <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{item.caption}</p> : null}
              <div className="space-y-2">
                <CommunityPostActions
                  item={item}
                  actions={actions}
                  isAuthenticated={isAuthenticated}
                  onProtectedAction={protectAction}
                  postHref={`/${username}/feed/${item.slug ?? postSlug}#comments`}
                />
              </div>
            </>
          ) : null}
        </section>

        <div id="comments">
            <CommunityCommentThread
              comments={comments}
              commentsEnabled={item?.commentsEnabled ?? true}
              error={commentsError}
              isAuthenticated={isAuthenticated}
            hasNextPage={hasNextPage}
            loading={commentsLoading}
            loadMore={loadMore}
            loadMoreError={loadMoreError}
            loadingMore={loadingMore}
            onAddComment={addComment}
            onReply={reply}
            onDeleteComment={deleteComment}
            onReportPost={(reason, description) => actions.reportPost(item?.id ?? "", reason, description)}
            onToggleLike={toggleCommentLike}
            postAuthor={item?.author ?? null}
            fallbackCreatedAt={item?.createdAt ?? null}
            inlineReplies={false}
            commentDetailHref={(comment) => (comment.slug ? `/${username}/feed/${item?.slug ?? postSlug}/comments/${comment.slug}` : "#")}
          />
        </div>
      </main>
    </CommunityPageScaffold>
  );
}
