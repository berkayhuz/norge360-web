"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageCircle, Send } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Image } from "@workspace/ui/components/primitives/image";

import { CommunityPostActions } from "@/features/community/components/community-post-actions";
import {
  clearPostInterest,
  deleteCommunityPost,
  removePostReaction,
  reportPost,
  setPostInterest,
  setPostReaction,
  togglePostLike,
  togglePostSave,
  updateCommunityPost,
} from "@/features/community/lib/client";
import { useCommunityComments, useCommunityPost } from "@/features/community/lib/hooks";
import { getCommunityLocationLabel } from "@/features/community/lib/location-options";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

export function CommunityPostDetailPage({ postId }: { postId: string }) {
  const t = useTranslations("public-web");
  const { item, load, error, loading } = useCommunityPost(postId);
  const { addComment, items: comments, load: loadComments, loading: commentsLoading, error: commentsError, reply } = useCommunityComments(postId);
  const [newComment, setNewComment] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await getClientAuthSessionStatus();
        if (!cancelled) setIsAuthenticated(response.authenticated);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load();
    void loadComments();
  }, [load, loadComments]);

  const authorName = item?.author?.displayName ?? item?.author?.username ?? t("community.post.authorFallback");
  const authorInitials = useMemo(() => {
    const parts = authorName.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join("");
    return (initials || authorName.slice(0, 2) || "N").toUpperCase();
  }, [authorName]);
  const locationLabel = useMemo(() => getCommunityLocationLabel(item?.city ?? null, item?.district ?? null), [item?.city, item?.district]);
  const createdAtLabel = useMemo(() => {
    if (!item) {
      return "";
    }

    const date = new Date(item.createdAt);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }, [item]);

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

  async function onSubmitComment() {
    if (!newComment.trim()) {
      return;
    }

    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    setSubmittingComment(true);
    try {
      await addComment(newComment.trim());
      setNewComment("");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function protectAction(callback: () => Promise<void>) {
    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    await callback();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          {"← Feed'e dön"}
        </Link>
      </div>

      <section className="space-y-4 pb-2">
        {loading ? <p>{t("community.feed.loading")}</p> : null}
        {error ? <p className="text-sm text-destructive">{t("community.feed.error")}</p> : null}

        {item ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Avatar className="mt-0.5" size="lg">
                  <AvatarImage src={item.author?.avatarUrl ?? undefined} alt={authorName} />
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
                  <p className="truncate text-xs text-muted-foreground">{locationLabel}</p>
                </div>
              </div>
            </div>

            {item.media.length > 0 ? (
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {item.media.map((media, index) => (
                  <div key={media.id ?? `${media.url}-${index}`} className="min-w-full snap-start">
                    <Image
                      src={media.url}
                      alt={media.altText ?? item.caption ?? t("community.post.mediaAlt")}
                      aspect="video"
                      radius="xl"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {item.caption ? <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{item.caption}</p> : null}

            <div className="space-y-2">
              <CommunityPostActions item={item} actions={actions} onProtectedAction={protectAction} postHref={`/posts/${item.id}#comments`} />
              <p className="text-xs text-muted-foreground">{createdAtLabel}</p>
            </div>
          </>
        ) : null}
      </section>

      <Card id="comments">
        <CardHeader>
          <CardTitle className="text-lg">Yorumlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-2xl bg-muted/20 p-4">
            <Textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Yorum yaz..." />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Bu gönderiye düşünceni bırak.</p>
              <Button type="button" onClick={() => void onSubmitComment()} disabled={submittingComment || !newComment.trim()}>
                <Send className="size-4" />
                Paylaş
              </Button>
            </div>
          </div>

          {commentsLoading ? <p>{t("community.comment.loading")}</p> : null}
          {commentsError ? <p className="text-sm text-destructive">{t("community.comment.error")}</p> : null}
          {!commentsLoading && comments.length === 0 ? <p className="text-sm text-muted-foreground">{t("community.comment.empty")}</p> : null}

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{comment.author?.displayName ?? comment.author?.username ?? t("community.post.authorFallback")}</p>
                    <p className="text-xs text-muted-foreground">@{comment.author?.username ?? comment.author?.id ?? comment.id}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt))}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{comment.content}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = getAuthWebLoginUrl();
                        return;
                      }

                      const replyText = window.prompt("Cevabını yaz");
                      if (!replyText?.trim()) {
                        return;
                      }

                      void reply(comment.id, replyText.trim());
                    }}
                  >
                    <MessageCircle className="size-4" />
                    Yanıtla
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
