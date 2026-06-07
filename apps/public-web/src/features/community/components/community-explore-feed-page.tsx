"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { CommunityPostCard } from "@/features/community/components/community-post-card";
import { useCommunityFeed } from "@/features/community/lib/hooks";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

export function CommunityExploreFeedPage() {
  const t = useTranslations("public-web");
  const { actions, error, hasNextPage, items, loadInitial, loadMore, loading } = useCommunityFeed();
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const initialLoadStartedRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (initialLoadStartedRef.current) {
      return;
    }

    initialLoadStartedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const response = await getClientAuthSessionStatus();
        if (!cancelled) {
          setIsAuthenticated(response.authenticated);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      }
    })();

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [loadInitial]);

  const exploreItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const leftScore = (left.likesCount ?? 0) * 2 + (left.commentsCount ?? 0) * 3 + (left.savesCount ?? 0);
      const rightScore = (right.likesCount ?? 0) * 2 + (right.commentsCount ?? 0) * 3 + (right.savesCount ?? 0);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return stableRandomScore(right.id) - stableRandomScore(left.id);
    });
  }, [items]);

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
          <h1 className="text-2xl font-semibold text-foreground">{t("exploreFeed.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("exploreFeed.page.description")}</p>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}

        {error ? <p className="px-4 text-sm text-destructive">{t("exploreFeed.errors.loadFailed")}</p> : null}

        {!loading && exploreItems.length === 0 && !error ? (
          <div className="px-4 pt-6 text-center">
            <p className="font-medium">{t("exploreFeed.empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("exploreFeed.empty.description")}</p>
          </div>
        ) : null}

        {exploreItems.map((item) => (
          <CommunityPostCard key={item.id} item={item} actions={actions} isAuthenticated={isAuthenticated} />
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

function stableRandomScore(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash / 0xffffffff;
}
