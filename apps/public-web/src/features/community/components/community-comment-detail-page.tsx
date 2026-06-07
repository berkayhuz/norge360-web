"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart, Loader2, Reply } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";

import { CommunityCommentThread } from "@/features/community/components/community-comment-thread";
import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { reportPost } from "@/features/community/lib/client";
import { useCommunityCommentBySlug, useCommunityCommentReplies, useCommunityPostBySlug } from "@/features/community/lib/hooks";
import type { CommunityComment } from "@/features/community/lib/types";
import { formatRelativeTimeLabel } from "@/lib/date-format";
import { cn } from "@workspace/ui/lib/utils";

export function CommunityCommentDetailPage({
  username,
  postSlug,
  commentSlug,
  isAuthenticated,
}: {
  username: string;
  postSlug: string;
  commentSlug: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("public-web");
  const { item: post, load: loadPost } = useCommunityPostBySlug(username, postSlug);
  const { item: comment, load: loadComment, error: commentError, loading: commentLoading, toggleLike: toggleCommentLike } = useCommunityCommentBySlug(username, postSlug, commentSlug);
  const {
    addReply,
    deleteReply,
    error: repliesError,
    hasNextPage,
    items: replies,
    load: loadReplies,
    loadMore,
    loadMoreError,
    loading: repliesLoading,
    loadingMore,
    toggleLike,
  } = useCommunityCommentReplies(comment?.id ?? "", post?.id, {
    commentSlug,
    postSlug,
    username,
  });
  const replyComposerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadPost();
    void loadComment();
  }, [loadComment, loadPost]);

  useEffect(() => {
    if (!comment?.id) {
      return;
    }

    void loadReplies();
  }, [comment?.id, loadReplies]);

  const createdAtLabel = useMemo(
    () => formatRelativeTimeLabel(comment?.createdAt) ?? formatRelativeTimeLabel(post?.createdAt) ?? "",
    [comment?.createdAt, post?.createdAt],
  );

  async function addReplyAndRefresh(content: string) {
    await addReply(content);
    await loadComment();
  }

  async function deleteReplyAndRefresh(replyId: string) {
    await deleteReply(replyId);
    await loadComment();
  }

  return (
    <CommunityPageScaffold>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 py-6">
        <div className="flex items-center justify-between">
          <Link href={`/${username}/feed/${postSlug}`} className="text-sm font-medium text-primary hover:underline">
            {t("community.post.backToFeed")}
          </Link>
        </div>

        <section className="space-y-4 pb-2">
          {commentLoading ?
            <div className="flex items-center justify-center">
              <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
            </div> : null}
          {commentError ? <p className="text-sm text-destructive">{t("community.comment.error")}</p> : null}

          {post ? (
            <CommunityPostCard item={post} isAuthenticated={isAuthenticated} readOnly postHref={`/${username}/feed/${post.slug ?? postSlug}`} />
          ) : null}

          {comment ? (
            <CommentDetailCard
              comment={comment}
              createdAtLabel={createdAtLabel}
              onReplyClick={() => {
                replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onToggleLike={toggleCommentLike}
            />
          ) : null}

        </section>

        <section className="space-y-3" ref={replyComposerRef}>
          <CommunityCommentThread
            comments={replies}
            error={repliesError}
            isAuthenticated={isAuthenticated}
            hasNextPage={hasNextPage}
            loading={repliesLoading}
            loadMore={loadMore}
            loadMoreError={loadMoreError}
            loadingMore={loadingMore}
            onAddComment={addReplyAndRefresh}
            onReply={addReplyAndRefresh}
            onDeleteComment={deleteReplyAndRefresh}
            onReportPost={async (reason, description) => {
              if (!post?.id) {
                return;
              }
              await reportPost(post.id, reason, description);
            }}
            onToggleLike={toggleLike}
            postAuthor={post?.author ?? null}
            fallbackCreatedAt={post?.createdAt ?? null}
            inlineReplies={false}
            composerPlaceholder={t("community.comment.replyPrompt")}
            commentDetailHref={(reply) => (reply.slug ? `/${username}/feed/${postSlug}/comments/${reply.slug}` : "#")}
          />
        </section>
      </main>
    </CommunityPageScaffold>
  );
}

function CommentDetailCard({
  comment,
  createdAtLabel,
  onReplyClick,
  onToggleLike,
}: {
  comment: CommunityComment;
  createdAtLabel: string;
  onReplyClick: () => void;
  onToggleLike: (isLiked: boolean) => Promise<void>;
}) {
  const t = useTranslations("public-web");
  const authorName = comment.author?.displayName ?? comment.author?.username ?? t("community.post.authorFallback");
  const authorInitials = (authorName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || authorName.slice(0, 2) || "N").toUpperCase();

  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-10 shrink-0">
          <AvatarImage src={comment.author?.avatarUrl ?? undefined} alt={authorName} />
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
              <p className="truncate text-xs text-muted-foreground">@{comment.author?.username ?? comment.author?.id ?? comment.id}</p>
            </div>
            <p className="whitespace-nowrap text-xs text-muted-foreground">{createdAtLabel}</p>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{comment.content}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground",
                comment.isLikedByCurrentUser && "text-rose-500 hover:text-rose-500",
              )}
              onClick={() => void onToggleLike(!!comment.isLikedByCurrentUser)}
            >
              <Heart className="size-4" fill={comment.isLikedByCurrentUser ? "currentColor" : "none"} />
              <span className="text-sm tabular-nums">{comment.likesCount ?? 0}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={onReplyClick}
            >
              <Reply className="size-4" />
              <span className="text-sm tabular-nums">{comment.replyCount ?? 0}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
