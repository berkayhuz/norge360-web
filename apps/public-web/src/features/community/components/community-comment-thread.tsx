"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EllipsisVertical, Film, Heart, ImagePlus, Loader2, Reply, Send, SmilePlus, X } from "lucide-react";
import EmojiPicker, { Theme as EmojiPickerTheme } from "emoji-picker-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Image } from "@workspace/ui/components/primitives/image";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/overlay/tooltip";

import { CommunityReportDialog } from "@/features/community/components/community-report-dialog";
import {
  CommentImageEditorDialog,
  type CommentAttachment,
  type CommentAttachmentKind,
} from "@/features/community/components/community-comment-image-editor-dialog";
import { useTheme } from "@/components/theme-provider";
import type { CommunityAuthor, CommunityComment, CommunityReportReason } from "@/features/community/lib/types";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { formatRelativeTimeLabel } from "@/lib/date-format";
import { optimizeImageFile } from "@/lib/image-optimize";
import { cn } from "@workspace/ui/lib/utils";

const COMMENT_MAX_LENGTH = 1000;
const MAX_COMMENT_ATTACHMENTS = 1;
const MAX_COMMENT_ATTACHMENT_BYTES = 1 * 1024 * 1024;
const MAX_COMMENT_ATTACHMENT_DIMENSION = 1280;

type CommunityCommentThreadProps = {
  comments: CommunityComment[];
  commentsEnabled?: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasNextPage?: boolean;
  loadMore?: () => Promise<void>;
  loadMoreError?: string | null;
  loadingMore?: boolean;
  onAddComment: (content: string) => Promise<void>;
  onReply: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleLike: (commentId: string, isLiked: boolean) => Promise<void>;
  onReportPost: (reason: CommunityReportReason, description: string) => Promise<void>;
  postAuthor?: CommunityAuthor | null;
  fallbackCreatedAt?: string | null;
  inlineReplies?: boolean;
  commentDetailHref?: (comment: CommunityComment) => string;
  composerPlaceholder?: string;
};

type CommentNode = CommunityComment & {
  replies: CommentNode[];
};

export function CommunityCommentThread({
  comments,
  commentsEnabled = true,
  isAuthenticated,
  loading,
  error,
  hasNextPage,
  loadMore,
  loadMoreError,
  loadingMore,
  onAddComment,
  onReply,
  onDeleteComment,
  onToggleLike,
  onReportPost,
  postAuthor,
  fallbackCreatedAt,
  inlineReplies = true,
  commentDetailHref,
  composerPlaceholder,
}: CommunityCommentThreadProps) {
  const t = useTranslations("public-web");
  const [newComment, setNewComment] = useState("");
  const [newCommentAttachments, setNewCommentAttachments] = useState<CommentAttachment[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const threadedComments = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    if (!hasNextPage || !loadMore || !loadMoreSentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadMore();
      }
    }, { rootMargin: "200px" });

    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, loadingMore, loadMoreError, threadedComments.length]);

  async function requireAuth(callback: () => Promise<void>) {
    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    await callback();
  }

  async function submitComment() {
    const trimmed = newComment.trim();
    if (!trimmed || submittingComment) {
      return;
    }

    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    setSubmittingComment(true);
    try {
      await onAddComment(buildCommentBody(trimmed, newCommentAttachments));
      setNewComment("");
      clearAttachments(newCommentAttachments, setNewCommentAttachments);
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        {commentsEnabled ? (
          <div className="space-y-3">
            <CommentComposer
              disabled={submittingComment}
              maxLength={COMMENT_MAX_LENGTH}
              attachments={newCommentAttachments}
              onAttachmentsChange={setNewCommentAttachments}
              onInsertEmoji={(emoji) => {
                setNewComment((current) => `${current}${emoji}`.slice(0, COMMENT_MAX_LENGTH));
              }}
              value={newComment}
              onChange={setNewComment}
              placeholder={composerPlaceholder ?? t("community.comment.placeholder")}
              onSubmit={() => void submitComment()}
              submitDisabled={submittingComment || !newComment.trim()}
              valueLength={newComment.length}
            />
          </div>
        ) : (
          <p className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {t("community.comment.closed")}
          </p>
        )}
      </div>
      {loading ?
        <div className="flex items-center justify-center">
          <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
        </div> : null}
      {error ? <p className="text-sm text-destructive">{t("community.comment.error")}</p> : null}
      {!loading && threadedComments.length === 0 ? <p className="text-sm text-muted-foreground">{t("community.comment.empty")}</p> : null}

      <div className="space-y-3">
        {threadedComments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            depth={0}
            onReply={onReply}
            onDeleteComment={onDeleteComment}
            onToggleLike={onToggleLike}
            onRequireAuth={requireAuth}
            onReportPost={onReportPost}
            postAuthor={postAuthor}
            fallbackCreatedAt={fallbackCreatedAt}
            inlineReplies={inlineReplies}
            commentDetailHref={commentDetailHref?.(comment)}
          />
        ))}
      </div>

      {loadingMore ? <p className="text-xs text-muted-foreground">{t("community.comment.loadingMore")}</p> : null}
      {loadMoreError ? (
        <Button type="button" variant="outline" onClick={() => void loadMore?.()}>
          {t("community.comment.loadMore")}
        </Button>
      ) : null}
      {hasNextPage && loadMore && !loadMoreError ? <div ref={loadMoreSentinelRef} id="community-comments-sentinel" className="h-1 w-full" /> : null}
    </div>
  );
}

function CommentCard({
  comment,
  depth,
  onReply,
  onDeleteComment,
  onToggleLike,
  onRequireAuth,
  onReportPost,
  postAuthor,
  fallbackCreatedAt,
  inlineReplies = true,
  commentDetailHref,
}: {
  comment: CommentNode;
  depth: number;
  onReply: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleLike: (commentId: string, isLiked: boolean) => Promise<void>;
  onRequireAuth: (callback: () => Promise<void>) => Promise<void>;
  onReportPost: (reason: CommunityReportReason, description: string) => Promise<void>;
  postAuthor?: CommunityAuthor | null;
  fallbackCreatedAt?: string | null;
  inlineReplies?: boolean;
  commentDetailHref?: string;
}) {
  const t = useTranslations("public-web");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<CommentAttachment[]>([]);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const authorName = comment.author?.displayName ?? comment.author?.username ?? t("community.post.authorFallback");
  const authorInitials = useMemo(() => {
    const parts = authorName.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join("");
    return (initials || authorName.slice(0, 2) || "N").toUpperCase();
  }, [authorName]);
  const createdAtLabel = useMemo(
    () => formatRelativeTimeLabel(comment.createdAt) ?? formatRelativeTimeLabel(fallbackCreatedAt) ?? "",
    [comment.createdAt, fallbackCreatedAt],
  );
  const commentHref = commentDetailHref;

  async function submitReply() {
    const trimmed = replyValue.trim();
    if (!trimmed || replySubmitting) {
      return;
    }

    await onRequireAuth(async () => {
      setReplySubmitting(true);
      try {
        await onReply(comment.id, buildCommentBody(trimmed, replyAttachments));
        setReplyValue("");
        clearAttachments(replyAttachments, setReplyAttachments);
        setReplyOpen(false);
      } finally {
        setReplySubmitting(false);
      }
    });
  }

  async function handleToggleLike() {
    await onRequireAuth(() => onToggleLike(comment.id, !!comment.isLikedByCurrentUser));
  }

  async function handleDeleteComment(targetCommentId: string) {
    if (!onDeleteComment) {
      return;
    }

    const confirmed = window.confirm(t("community.comment.deleteConfirmPrompt"));
    if (!confirmed) {
      return;
    }

    await onRequireAuth(async () => {
      await onDeleteComment(targetCommentId);
    });
  }

  async function handleFollowOwner() {
    if (!postAuthor?.username) {
      return;
    }

    await onRequireAuth(async () => {
      await fetch(`/api/accounts/follows/${encodeURIComponent(postAuthor.username!)}`, { method: "POST" });
    });
  }

  async function handleBlockOwner() {
    if (!postAuthor?.username) {
      return;
    }

    await onRequireAuth(async () => {
      await fetch(`/api/accounts/blocks/${encodeURIComponent(postAuthor.username!)}`, { method: "POST" });
    });
  }

  return (
    <div className={cn(depth > 0 && "ml-8 border-dashed")}>
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-10 shrink-0">
          <AvatarImage src={comment.author?.avatarUrl ?? undefined} alt={authorName} />
          <AvatarFallback>{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
              <p className="truncate text-xs text-muted-foreground">@{comment.author?.username ?? comment.author?.id ?? comment.id}</p>
            </div>

            <div className="flex items-start gap-2">
              <p className="whitespace-nowrap text-xs text-muted-foreground">{createdAtLabel}</p>
              <CommentActionsMenu
                canDelete={Boolean(comment.canDelete)}
                onBlockOwner={() => void handleBlockOwner()}
                onFollowOwner={() => void handleFollowOwner()}
                onReportPost={() => setReportOpen(true)}
                onDeleteComment={() => void handleDeleteComment(comment.id)}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {commentHref ? (
              <Link href={commentHref} className="block">
                <CommentContent body={comment.content} />
              </Link>
            ) : (
              <CommentContent body={comment.content} />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground",
                  comment.isLikedByCurrentUser && "text-rose-500 hover:text-rose-500",
                )}
                onClick={() => void handleToggleLike()}
              >
                <Heart className="size-4" fill={comment.isLikedByCurrentUser ? "currentColor" : "none"} />
                <span className="text-sm tabular-nums">{comment.likesCount ?? 0}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => {
                  if (commentHref) {
                    window.location.href = commentHref;
                  }
                }}
              >
                <Reply className="size-4" />
                <span className="text-sm tabular-nums">{comment.replyCount ?? comment.replies?.length ?? 0}</span>
              </Button>

              {inlineReplies ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setReplyOpen((current) => !current)}
                >
                  <Reply className="size-4" />
                  {t("community.comment.reply")}
                </Button>
              ) : null}
            </div>

            {inlineReplies && replyOpen ? (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-3">
                <CommentComposer
                  compact
                  disabled={replySubmitting}
                  maxLength={COMMENT_MAX_LENGTH}
                  attachments={replyAttachments}
                  onAttachmentsChange={setReplyAttachments}
                  onInsertEmoji={(emoji) => {
                    setReplyValue((current) => `${current}${emoji}`.slice(0, COMMENT_MAX_LENGTH));
                  }}
                  value={replyValue}
                  onChange={setReplyValue}
                  placeholder={t("community.comment.replyPrompt")}
                  onSubmit={() => void submitReply()}
                  submitDisabled={replySubmitting || !replyValue.trim()}
                  valueLength={replyValue.length}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearAttachments(replyAttachments, setReplyAttachments);
                      setReplyOpen(false);
                    }}
                  >
                    {t("community.post.deleteCancel")}
                  </Button>
                </div>
              </div>
            ) : null}

            {!inlineReplies && comment.pinnedReply ? (
              <div className="ml-8 rounded-2xl border border-border/50 bg-muted/20 p-3">
                <div className="flex items-start gap-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={comment.pinnedReply.author?.avatarUrl ?? undefined} alt={comment.pinnedReply.author?.displayName ?? comment.pinnedReply.author?.username ?? ""} />
                    <AvatarFallback>{(comment.pinnedReply.author?.displayName ?? comment.pinnedReply.author?.username ?? "N").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("community.comment.reply")}</p>
                        <p className="truncate text-sm font-medium">
                          {comment.pinnedReply.author?.displayName ?? comment.pinnedReply.author?.username ?? t("community.post.authorFallback")}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatRelativeTimeLabel(comment.pinnedReply.createdAt) ?? formatRelativeTimeLabel(fallbackCreatedAt) ?? ""}
                      </p>
                    </div>
                    <CommentContent body={comment.pinnedReply.content} />
                  </div>
                </div>
              </div>
            ) : null}

            {inlineReplies && (comment.replies?.length ?? 0) > 0 ? (
              <div className="space-y-3 border-l border-border/70 pl-4">
                {comment.replies!.map((reply) => (
                  <div key={reply.id} className="py-3 px-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t("community.comment.reply")}
                        </p>
                        <p className="truncate text-sm font-medium">{reply.author?.displayName ?? reply.author?.username ?? t("community.post.authorFallback")}</p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatRelativeTimeLabel(reply.createdAt) ?? formatRelativeTimeLabel(fallbackCreatedAt) ?? ""}
                      </p>
                    </div>
                    <CommentContent body={reply.content} />
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "gap-2 px-2 text-muted-foreground hover:bg-transparent hover:text-foreground",
                          reply.isLikedByCurrentUser && "text-rose-500 hover:text-rose-500",
                        )}
                        onClick={() => void onRequireAuth(() => onToggleLike(reply.id, !!reply.isLikedByCurrentUser))}
                      >
                        <Heart className="size-4" fill={reply.isLikedByCurrentUser ? "currentColor" : "none"} />
                        <span className="text-sm tabular-nums">{reply.likesCount ?? 0}</span>
                      </Button>
                      <CommentActionsMenu
                        canDelete={Boolean(reply.canDelete)}
                        onBlockOwner={() => void handleBlockOwner()}
                        onFollowOwner={() => void handleFollowOwner()}
                        onReportPost={() => setReportOpen(true)}
                        onDeleteComment={() => void handleDeleteComment(reply.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CommunityReportDialog
        onOpenChange={setReportOpen}
        onSubmit={(reason, description) => onReportPost(reason, description)}
        open={reportOpen}
      />
    </div>
  );
}

function CommentActionsMenu({
  canDelete,
  onBlockOwner,
  onFollowOwner,
  onReportPost,
  onDeleteComment,
}: {
  canDelete: boolean;
  onBlockOwner: () => void;
  onFollowOwner: () => void;
  onReportPost: () => void;
  onDeleteComment: () => void;
}) {
  const t = useTranslations("public-web");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          rounded="full"
          border="none"
          aria-label={t("community.post.moreActions")}
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onSelect={() => void onDeleteComment()}>
            {t("community.comment.delete")}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => void onBlockOwner()}>
              {t("profile.actionsMenu.block")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void onFollowOwner()}>
              {t("discovery.actions.follow")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void onReportPost()}>{t("community.post.report")}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommentComposer({
  value,
  onChange,
  onInsertEmoji,
  placeholder,
  disabled,
  maxLength,
  onSubmit,
  submitDisabled,
  valueLength,
  compact = false,
  attachments,
  onAttachmentsChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onInsertEmoji: (emoji: string) => void;
  placeholder: string;
  disabled?: boolean;
  maxLength: number;
  onSubmit: () => void;
  submitDisabled?: boolean;
  valueLength: number;
  compact?: boolean;
  attachments: CommentAttachment[];
  onAttachmentsChange: (attachments: CommentAttachment[]) => void;
}) {
  const t = useTranslations("public-web");
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const gifFileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<CommentAttachment[]>(attachments);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const activeAttachment = useMemo(
    () => attachments.find((attachment) => attachment.id === activeAttachmentId) ?? null,
    [attachments, activeAttachmentId],
  );

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  function openFilePicker(kind: CommentAttachmentKind) {
    if (disabled) {
      return;
    }

    if (kind === "gif") {
      gifFileInputRef.current?.click();
      return;
    }

    imageFileInputRef.current?.click();
  }

  async function handleFileSelection(kind: CommentAttachmentKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      const remainingSlots = MAX_COMMENT_ATTACHMENTS - attachments.length;
      if (remainingSlots <= 0) {
        event.target.value = "";
        return;
      }

      const selectedFiles = files.slice(0, remainingSlots);
      const optimizedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          let nextFile = file;
          if (kind === "image" && file.type !== "image/gif") {
            try {
              nextFile = await optimizeImageFile(file, {
                maxBytes: MAX_COMMENT_ATTACHMENT_BYTES,
                maxDimension: MAX_COMMENT_ATTACHMENT_DIMENSION,
              });
            } catch {
              nextFile = file;
            }
          }

          return {
            id: crypto.randomUUID(),
            file: nextFile,
            previewUrl: URL.createObjectURL(nextFile),
            kind,
          } satisfies CommentAttachment;
        }),
      );

      onAttachmentsChange([...attachments, ...optimizedFiles]);
    } catch {
      // Ignore selection failures silently to avoid blocking comment flow.
    } finally {
      event.target.value = "";
    }
  }

  function removeAttachment(id: string) {
    const target = attachments.find((attachment) => attachment.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    if (activeAttachmentId === id) {
      setActiveAttachmentId(null);
    }

    onAttachmentsChange(attachments.filter((attachment) => attachment.id !== id));
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-2")}>
      {attachments.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-7">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              role="button"
              tabIndex={0}
              className="group relative overflow-hidden rounded-xl border border-border/60 text-left transition hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => setActiveAttachmentId(attachment.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveAttachmentId(attachment.id);
                }
              }}
            >
              <Image src={attachment.previewUrl} alt={attachment.file.name} aspect="square" radius="none" />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute top-1 right-1 z-10 h-6 w-6 opacity-0 shadow-sm transition group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAttachment(attachment.id);
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(compact && "min-h-24")}
      />

      <input ref={imageFileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handleFileSelection("image", event)} />
      <input ref={gifFileInputRef} type="file" className="hidden" accept="image/gif" multiple onChange={(event) => void handleFileSelection("gif", event)} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => openFilePicker("image")}>
            <ImagePlus className="size-4" />
            {t("community.post.addImages")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => openFilePicker("gif")}>
            <Film className="size-4" />
            {t("community.comment.addGif")}
          </Button>
          <EmojiPickerButton disabled={disabled} onPick={onInsertEmoji} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {valueLength > 0 ? (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-border/70 bg-background/90 p-0.5"
                    aria-label={`${valueLength}/${maxLength}`}
                  >
                    <span
                      className={cn(
                        "h-full w-full rounded-full transition-transform duration-200",
                        valueLength >= maxLength ? "bg-destructive" : "bg-sky-400",
                      )}
                      style={{
                        transform: `scale(${Math.max(0.2, Math.min(1, valueLength / maxLength))})`,
                        transformOrigin: "center",
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {valueLength}/{maxLength}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          <Button type="button" className="shrink-0" onClick={onSubmit} disabled={disabled || submitDisabled}>
            <Send className="size-4" />
            {t("community.comment.send")}
          </Button>
        </div>
      </div>

      <CommentImageEditorDialog
        attachment={activeAttachment}
        open={Boolean(activeAttachment)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAttachmentId(null);
          }
        }}
        onSave={(nextAttachment, previousPreviewUrl) => {
          if (!activeAttachment) {
            return;
          }

          onAttachmentsChange(
            attachments.map((attachment) => (attachment.id === activeAttachment.id ? nextAttachment : attachment)),
          );
          URL.revokeObjectURL(previousPreviewUrl);
          setActiveAttachmentId(nextAttachment.id);
        }}
      />
    </div>
  );
}

function EmojiPickerButton({
  onPick,
  disabled,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("public-web");
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT;

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <SmilePlus className="size-4" />
        {t("community.comment.addEmoji")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-h-[92vh] overflow-hidden sm:max-w-[32rem] shadow-none bg-transparent ring-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("community.comment.emojiPickerTitle")}</DialogTitle>
          </DialogHeader>
          <div>
            <EmojiPicker
              className="!rounded-4xl !border-border"
              open={open}
              theme={pickerTheme}
              width="100%"
              height={420}
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              searchDisabled={false}
              onEmojiClick={(emojiData) => {
                onPick(emojiData.emoji);
                setOpen(false);
              }}
            />
            <style>{`
              .EmojiPickerReact .epr-search-container input {
                border-radius: 1.5rem !important;
              }
            `}</style>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommentContent({ body }: { body: string }) {
  const t = useTranslations("public-web");
  const parts = splitCommentContent(body);

  if (parts.length === 1 && parts[0].type === "text") {
    return <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{parts[0].value}</p>;
  }

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <p key={`${index}-${part.value.slice(0, 16)}`} className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {part.value}
            </p>
          );
        }

        return <Image key={`${index}-${part.url}`} src={part.url} alt={part.alt || t("community.comment.mediaAlt")} aspect="video" radius="xl" />;
      })}
    </div>
  );
}

function splitCommentContent(content: string): Array<{ type: "text"; value: string } | { type: "image"; url: string; alt: string }> {
  const result: Array<{ type: "text"; value: string } | { type: "image"; url: string; alt: string }> = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }

    const mediaUrl = normalizeCommentMediaUrl(match[2]);
    if (mediaUrl) {
      result.push({ type: "image", alt: match[1] || "", url: mediaUrl });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    result.push({ type: "text", value: content.slice(lastIndex) });
  }

  return result.length > 0 ? result : [{ type: "text", value: content }];
}

function normalizeCommentMediaUrl(value: string) {
  const trimmed = value.trim();
  if (!/^(https?:\/\/|blob:)/i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "blob:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function buildCommentTree(comments: CommunityComment[]) {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    if (comment.parentCommentId && nodes.has(comment.parentCommentId)) {
      nodes.get(comment.parentCommentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function buildCommentBody(text: string, attachments: CommentAttachment[]) {
  const mediaTokens = attachments.map((attachment) => `![${attachment.kind}](${attachment.previewUrl})`);
  return [...mediaTokens, text].filter(Boolean).join("\n").slice(0, COMMENT_MAX_LENGTH);
}

function clearAttachments(
  attachments: CommentAttachment[],
  setAttachments: Dispatch<SetStateAction<CommentAttachment[]>>,
) {
  for (const attachment of attachments) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  setAttachments([]);
}
