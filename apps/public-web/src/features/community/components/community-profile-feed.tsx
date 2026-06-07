"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { useCommunityUserPosts } from "@/features/community/lib/hooks";

export function CommunityProfileFeed({ userId }: { userId: string | null }) {
  const t = useTranslations("public-web");
  const { error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunityUserPosts(userId ?? "");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => {
    if (!userId || initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void loadInitial();
  }, [loadInitial, userId]);

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
        {items.map((item) => <CommunityPostCard key={item.id} item={item} readOnly />)}
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
