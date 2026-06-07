"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

type BlockedUser = {
  avatarUrl: string | null;
  blockedAtUtc: string | null;
  displayName: string | null;
  profileId: string;
  username: string;
};

type BlockedUsersPage = {
  items: BlockedUser[];
  page: number;
  pageSize: number;
};

const BLOCKED_PAGE_SIZE = 20;

export function BlockedUsersPanel() {
  const t = useTranslations("public-web");
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [unblockingUsername, setUnblockingUsername] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(false);
    try {
      const response = await fetch(`/api/accounts/blocks/me?page=${targetPage}&pageSize=${BLOCKED_PAGE_SIZE}`, { cache: "no-store" });
      const pageData = await readBlockedUsersPage(response);
      setItems((current) => (append ? dedupeBlockedUsers([...current, ...pageData.items]) : pageData.items));
      setPage(pageData.page);
      setHasNextPage(pageData.items.length >= pageData.pageSize);
    } catch {
      setError(true);
      if (!append) {
        setItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadPage(1, false));
  }, [loadPage]);

  async function onUnblock(username: string) {
    setUnblockingUsername(username);
    try {
      const response = await fetch(`/api/accounts/blocks/${encodeURIComponent(username)}`, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        setItems((current) => current.filter((item) => item.username !== username));
      }
    } finally {
      setUnblockingUsername(null);
    }
  }

  return (
    <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
      <CardHeader className="sr-only">
        <CardTitle className="text-lg">{t("profile.blocked.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("profile.blocked.description")}</p>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-destructive">{t("profile.blocked.loadError")}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profile.blocked.empty")}</p>
        ) : null}

        {!loading && !error ? (
          <div className="space-y-2">
            {items.map((item) => (
              <BlockedUserRow
                item={item}
                key={item.profileId}
                onUnblock={onUnblock}
                unblocking={unblockingUsername === item.username}
              />
            ))}
          </div>
        ) : null}

        {hasNextPage && !loading ? (
          <Button
            className="w-full"
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, true)}
            size="sm"
            type="button"
            variant="outline"
          >
            {loadingMore ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {t("profile.blocked.loadMore")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BlockedUserRow({
  item,
  onUnblock,
  unblocking,
}: {
  item: BlockedUser;
  onUnblock: (username: string) => void;
  unblocking: boolean;
}) {
  const t = useTranslations("public-web");
  const displayName = item.displayName?.trim() || item.username;

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-border/60 p-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          {item.avatarUrl ? <AvatarImage alt={`${displayName} avatar`} src={item.avatarUrl} /> : null}
          {item.displayName ? <AvatarFallback>{getInitials(displayName)}</AvatarFallback> : <DefaultAvatar />}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
        </div>
      </div>

      <Button
        disabled={unblocking}
        onClick={() => onUnblock(item.username)}
        size="sm"
        type="button"
        variant="outline"
      >
        {unblocking ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        {t("profile.blocked.unblock")}
      </Button>
    </div>
  );
}

async function readBlockedUsersPage(response: Response): Promise<BlockedUsersPage> {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error("blocked_users_load_failed");
  }

  const source = asRecord(data);
  const items = readArray(source, "items", "Items").map(normalizeBlockedUser).filter((item): item is BlockedUser => item !== null);
  const page = readNumber(source, "page", "Page") ?? 1;
  const pageSize = readNumber(source, "pageSize", "PageSize") ?? BLOCKED_PAGE_SIZE;

  return { items, page, pageSize };
}

function normalizeBlockedUser(value: unknown): BlockedUser | null {
  const source = asRecord(value);
  const profileId = readString(source, "profileId", "ProfileId");
  const username = readString(source, "username", "Username");
  if (!profileId || !username) {
    return null;
  }

  return {
    avatarUrl: readNullableString(source, "avatarUrl", "AvatarUrl"),
    blockedAtUtc: readNullableString(source, "blockedAtUtc", "BlockedAtUtc"),
    displayName: readNullableString(source, "displayName", "DisplayName"),
    profileId,
    username,
  };
}

function dedupeBlockedUsers(items: BlockedUser[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.profileId)) {
      return false;
    }

    seen.add(item.profileId);
    return true;
  });
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || value.slice(0, 2).toUpperCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function readArray(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return Array.isArray(value) ? value : [];
}

function readString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNullableString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
