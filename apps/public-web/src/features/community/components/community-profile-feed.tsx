"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

import { CommunityPostCard } from "@/features/community/components/community-post-card";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import { useCommunityUserPosts } from "@/features/community/lib/hooks";
import {
  clearPostInterest,
  createCommunityPost,
  deleteCommunityPost,
  removePostReaction,
  reportPost as reportCommunityPost,
  setPostCommentsEnabled,
  setPostHideLikeCount,
  setPostInterest,
  setPostReaction,
  togglePostLike,
  togglePostSave,
  updateCommunityPost,
} from "@/features/community/lib/client";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

export function CommunityProfileFeed({ userId }: { userId: string | null }) {
  const t = useTranslations("public-web");
  const { error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunityUserPosts(userId ?? "");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadStartedRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const actions = useMemo<CommunityFeedActions>(
    () => ({
      async createPost(caption: string, city: string, district: string, images: File[]) {
        await createCommunityPost({ caption, city, district, images });
        await loadInitial();
      },
      async updatePost(
        postId: string,
        payload: { caption: string; city: string; district: string; existingMediaIds: string[]; removeMediaIds: string[]; mediaOrder: string[]; mediaFiles: File[] },
      ) {
        await updateCommunityPost(postId, payload);
        await loadInitial();
      },
      async deletePost(postId: string) {
        await deleteCommunityPost(postId);
        await loadInitial();
      },
      async setCommentsEnabled(postId: string, enabled: boolean) {
        await setPostCommentsEnabled(postId, enabled);
        await loadInitial();
      },
      async setHideLikeCount(postId: string, hideLikeCount: boolean) {
        await setPostHideLikeCount(postId, hideLikeCount);
        await loadInitial();
      },
      async toggleLike(postId: string, isLiked: boolean) {
        await togglePostLike(postId, !isLiked);
        await loadInitial();
      },
      async toggleSave(postId: string, isSaved: boolean) {
        await togglePostSave(postId, !isSaved);
        await loadInitial();
      },
      async setInterest(postId: string, interest: "Interested" | "NotInterested") {
        await setPostInterest(postId, interest);
        await loadInitial();
      },
      async clearInterest(postId: string) {
        await clearPostInterest(postId);
        await loadInitial();
      },
      async setReaction(postId: string, emoji: string) {
        await setPostReaction(postId, emoji);
        await loadInitial();
      },
      async removeReaction(postId: string) {
        await removePostReaction(postId);
        await loadInitial();
      },
      async reportPost(postId: string, reason: "Spam" | "Harassment" | "HateSpeech" | "Nudity" | "Violence" | "Scam" | "Other", description: string) {
        await reportCommunityPost(postId, reason, description);
      },
    }),
    [loadInitial],
  );

  useEffect(() => {
    if (!userId || initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void loadInitial();
  }, [loadInitial, userId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getClientAuthSessionStatus();
        if (!cancelled) {
          setIsAuthenticated(session.authenticated);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loading) {
          return;
        }
        void loadMore();
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, loading, items.length]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("profile.feed.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!userId ? <p className="text-sm text-muted-foreground">{t("community.error.generic")}</p> : null}
        {loading && items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{t("community.feed.error")}</p> : null}
        {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">{t("community.feed.emptyDescription")}</p> : null}
        {items.map((item) => <CommunityPostCard key={item.id} item={item} actions={actions} isAuthenticated={isAuthenticated} />)}
        {hasNextPage ? <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
        {loading && items.length > 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
