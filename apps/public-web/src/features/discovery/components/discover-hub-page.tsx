"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { CommunityPageScaffold } from "@/features/community/components/community-page-scaffold";
import { getDiscoveryHub } from "@/features/discovery/lib/client";
import type { DiscoverUser, DiscoveryHub } from "@/features/discovery/lib/types";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

export function DiscoverHubPage() {
  const t = useTranslations("public-web");
  const pageSize = 10;
  const [hub, setHub] = useState<DiscoveryHub | null>(null);
  const [items, setItems] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const itemsLengthRef = useRef(0);
  const hasNextPageRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getClientAuthSessionStatus();
        if (cancelled) return;
        if (!session.authenticated) {
          window.location.href = getAuthWebLoginUrl();
          return;
        }

        const response = await getDiscoveryHub(pageSize);
        if (cancelled) return;
        setHub(response);
        const initialItems = response.suggestedUsers.slice(0, pageSize);
        setItems(initialItems);
        itemsLengthRef.current = initialItems.length;
        const nextPageExists = response.suggestedUsers.length > pageSize;
        setHasNextPage(nextPageExists);
        hasNextPageRef.current = nextPageExists;
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageSize]);

  async function followUser(item: DiscoverUser) {
    if (!item.username) return;

    setFollowingUserId(item.profileId);
    try {
      const response = await fetch(`/api/accounts/follows/${encodeURIComponent(item.username)}`, {
        credentials: "include",
        method: "POST",
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = getAuthWebLoginUrl();
        return;
      }

      if (!response.ok) {
        throw new Error("follow_failed");
      }

      setItems((current) => current.filter((entry) => entry.profileId !== item.profileId));
    } catch {
      setError(true);
    } finally {
      setFollowingUserId(null);
    }
  }

  async function loadMore() {
    if (loadingMoreRef.current || !hasNextPageRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const currentLength = itemsLengthRef.current;
      const nextLimit = currentLength + pageSize;
      const response = await getDiscoveryHub(nextLimit);
      const nextItems = response.suggestedUsers.slice(currentLength, nextLimit);

      setHub(response);
      setItems((current) => {
        const merged = [...current, ...nextItems];
        itemsLengthRef.current = merged.length;
        return merged;
      });
      const nextPageExists = response.suggestedUsers.length > nextLimit;
      setHasNextPage(nextPageExists);
      hasNextPageRef.current = nextPageExists;
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  useEffect(() => {
    if (loading || !hasNextPage) {
      return;
    }

    let rafId = 0;

    const maybeLoadMore = () => {
      if (loadingMoreRef.current || !hasNextPageRef.current) {
        return;
      }

      const scrollBottom = window.scrollY + window.innerHeight;
      const documentBottom = document.documentElement.scrollHeight;
      if (scrollBottom >= documentBottom - 400) {
        void loadMore();
      }
    };

    const onScroll = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(maybeLoadMore);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    maybeLoadMore();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hasNextPage, loading, items.length]);

  return (
    <CommunityPageScaffold publishHref="/feed">
      <main className="mx-auto flex w-full flex-1 flex-col py-5 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("discovery.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("discovery.page.description")}</p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-destructive">{t("discovery.errors.loadFailed")}</p> : null}

        {hub ? (
          <div className="grid gap-5 lg:grid-cols-1">
            <DiscoverSection
              followingUserId={followingUserId}
              items={items}
              onFollowUser={followUser}
              title={t("discovery.sections.suggested")}
            />
          </div>
        ) : null}

        {loadingMore ? (
          <div className="flex justify-center py-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
      </main>
    </CommunityPageScaffold>
  );
}

function DiscoverSection({
  followingUserId,
  items,
  onFollowUser,
  title,
}: {
  followingUserId: string | null;
  items: DiscoverUser[];
  onFollowUser: (item: DiscoverUser) => void;
  title: string;
}) {
  const t = useTranslations("public-web");

  return (
    <Card className="border-border/70 rounded-xl px-0">
      <CardHeader className="px-4 pb-0 pt-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {items.map((item) => (
          <div className="flex items-start gap-3" key={item.profileId}>
            <div className="flex w-full items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 dark:hover:bg-muted/25">
              <Link href={`/${item.username ?? ""}`} className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar className="size-9">
                  {item.avatarUrl ? <AvatarImage alt={item.displayName ?? item.username} src={item.avatarUrl} /> : null}
                  <DefaultAvatar />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.displayName ?? item.username}
                  </span>
                  <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
                </div>
              </Link>
              <Button
                type="button"
                variant={followingUserId === item.profileId ? "secondary" : item.viewerFollowsThisUser ? "outline" : "default"}
                size="sm"
                rounded="full"
                className="shrink-0"
                disabled={followingUserId !== null}
                onClick={() => void onFollowUser(item)}
              >
                {item.viewerFollowsThisUser ? t("profile.hero.following") : t("profile.hero.follow")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
