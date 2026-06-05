"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { getDiscoveryHub } from "@/features/discovery/lib/client";
import type { DiscoverUser, DiscoveryHub } from "@/features/discovery/lib/types";

export default function DiscoverHubPage() {
  const [hub, setHub] = useState<DiscoveryHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await getDiscoveryHub(12);
        if (!cancelled) setHub(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "discovery_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Discover Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kisileri ve topluluk sinyallerini kesfet.</p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-destructive">Discover Hub yuklenemedi.</p> : null}

        {hub ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <DiscoverSection items={hub.popularUsers} title="Populer Kisiler" />
            <DiscoverSection items={hub.trendingUsers} title="Yukselen Kisiler" />
            <DiscoverSection items={hub.suggestedUsers} title="Takip Tavsiyeleri" />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function DiscoverSection({ items, title }: { items: DiscoverUser[]; title: string }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div className="flex items-start gap-3" key={item.profileId}>
            <Avatar className="size-10">
              {item.avatarUrl ? <AvatarImage alt={item.displayName ?? item.username} src={item.avatarUrl} /> : null}
              <DefaultAvatar />
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link className="block truncate text-sm font-medium text-foreground hover:underline" href={`/${item.username}`}>
                {item.displayName ?? item.username}
              </Link>
              <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
              {item.bio ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.bio}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{item.reasonLabel}</p>
            </div>
            <Button aria-label="Takip et" size="icon" type="button" variant="ghost">
              <UserPlus className="size-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
