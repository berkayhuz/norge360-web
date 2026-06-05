"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { getPopularUsers } from "@/features/discovery/lib/client";
import type { DiscoverUser } from "@/features/discovery/lib/types";

export function CommunityPopularUsersWidget() {
  const [items, setItems] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await getPopularUsers(10);
        if (!cancelled) setItems(response);
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
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Populer Kisiler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {!loading && error ? <p className="text-sm text-destructive">Liste yuklenemedi.</p> : null}
        {items.map((item) => (
          <div className="flex items-start gap-3" key={item.profileId}>
            <Avatar className="size-9">
              {item.avatarUrl ? <AvatarImage alt={item.displayName ?? item.username} src={item.avatarUrl} /> : null}
              <DefaultAvatar />
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link className="block truncate text-sm font-medium text-foreground hover:underline" href={`/${item.username}`}>
                {item.displayName ?? item.username}
              </Link>
              <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
              {item.bio ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.bio}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">{item.reasonLabel}</p>
            </div>
            <Button aria-label="Takip et" size="icon" type="button" variant="ghost">
              <UserPlus className="size-4" />
            </Button>
          </div>
        ))}
        <Button asChild className="w-full" size="sm" variant="outline">
          <Link href="/discover-hub">Daha fazla goster</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
