"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { useCommunitySavedPosts } from "@/features/community/lib/hooks";

export function CommunityBookmarksPage() {
  const t = useTranslations("public-web");
  const { actions, error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunitySavedPosts();
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => {
    if (initialLoadStartedRef.current) {
      return;
    }

    initialLoadStartedRef.current = true;
    void loadInitial();
  }, [loadInitial]);

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
    <CommunityPageScaffold>
      <main className="mx-auto flex w-full flex-1 flex-col gap-4 py-5">
        <div className="px-4">
          <h1 className="text-2xl font-semibold text-foreground">{t("bookmarks.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("bookmarks.page.description")}</p>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}

        {error ? <p className="px-4 text-sm text-destructive">{t("bookmarks.errors.loadFailed")}</p> : null}

        {!loading && items.length === 0 && !error ? (
          <div className="px-4 pt-6 text-center">
            <p className="font-medium">{t("bookmarks.empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("bookmarks.empty.description")}</p>
          </div>
        ) : null}

        {items.map((item) => (
          <CommunityPostCard key={item.id} item={item} actions={actions} isAuthenticated />
        ))}

        {hasNextPage ? <div ref={loadMoreSentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
        {loading && items.length > 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
      </main>
    </CommunityPageScaffold>
  );
}
