"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { cn } from "@workspace/ui/lib/utils";
import { getPopularUsers } from "@/features/discovery/lib/client";
import type { DiscoverUser } from "@/features/discovery/lib/types";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { SURFACE_SOFT_CLASS } from "@/lib/surface";

export function CommunityPopularUsersWidget() {
  const t = useTranslations("public-web");
  const [items, setItems] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await getPopularUsers(5);
        if (!cancelled) setItems(response.filter((item) => !item.viewerFollowsThisUser));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function followUser(item: DiscoverUser) {
    if (!item.username) {
      return;
    }

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

  return (
    <Card className={cn("border-border/70 p-0 rounded-xl gap-3", SURFACE_SOFT_CLASS)}>
      <CardHeader className="px-4 pt-2">
        <CardTitle className="text-base p-0">{t("discovery.sections.popular")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {!loading && error ? <div className="px-4 py-6"><p className="text-sm text-center text-destructive">{t("discovery.errors.loadFailed")}</p></div> : null}
        {items.slice(0, 5).map((item) => (
          <div key={item.profileId}>
            <div className="px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/60 dark:hover:bg-muted/25">
              <Link href={`/${item.username}`} className="flex min-w-0 flex-1 items-start gap-3">
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
                className="w-fit min-w-20 cursor-pointer"
                aria-label={t("discovery.actions.follow")}
                disabled={followingUserId === item.profileId || !item.username}
                size="sm"
                type="button"
                variant="default"
                onClick={() => void followUser(item)}
              >
                {t("discovery.actions.follow")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      <Button asChild className="px-4 py-4 w-full border-none rounded-none flex items-center justify-start hover:text-primary" size="sm" variant="outline">
        <Link href="/discover-hub">{t("discovery.actions.viewMore")}</Link>
      </Button>
    </Card>
  );
}
