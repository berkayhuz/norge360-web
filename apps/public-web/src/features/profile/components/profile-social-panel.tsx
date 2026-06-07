"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BellRing, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";

import { ProfileActionsMenu } from "@/features/profile/components/profile-actions-menu";
import { cn } from "@workspace/ui/lib/utils";

type ProfileSocialPanelProps = {
  initialFollowersCount: number;
  initialFollowingCount: number;
  initialIsFollowing: boolean;
  initialIsFollowRequestPending: boolean;
  initialPostsCount: number;
  initialProfileNotificationsEnabled: boolean;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  loginHref: string;
  profileId: string;
  username: string;
};

type FollowListKind = "followers" | "following";

type FollowUser = {
  avatarUrl: string | null;
  displayName: string | null;
  followedAtUtc: string | null;
  isFollowRequestPending: boolean | null;
  isFollowing: boolean | null;
  profileId: string;
  username: string;
};

type FollowUsersPage = {
  items: FollowUser[];
  page: number;
  pageSize: number;
};

const FOLLOW_PAGE_SIZE = 20;

export function ProfileSocialPanel({
  initialFollowersCount,
  initialFollowingCount,
  initialIsFollowing,
  initialIsFollowRequestPending,
  initialPostsCount,
  initialProfileNotificationsEnabled,
  isAuthenticated,
  isOwnProfile,
  loginHref,
  profileId,
  username,
}: ProfileSocialPanelProps) {
  const t = useTranslations("public-web");
  const locale = useLocale();
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [isFollowHover, setIsFollowHover] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount] = useState(initialFollowingCount);
  const [following, setFollowing] = useState(initialIsFollowing);
  const [followRequestPending, setFollowRequestPending] = useState(initialIsFollowRequestPending);
  const [profileNotificationsEnabled, setProfileNotificationsEnabled] = useState(initialProfileNotificationsEnabled);
  const postsCount = initialPostsCount;
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [pendingProfileNotifications, setPendingProfileNotifications] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openList, setOpenList] = useState<FollowListKind | null>(null);

  const handleBlockChange = useCallback((blocked: boolean) => {
    setBlockedByMe(blocked);
    if (blocked) {
      setFollowing((wasFollowing) => {
        if (wasFollowing) {
          setFollowersCount((count) => Math.max(0, count - 1));
        }

        return false;
      });
      setFollowRequestPending(false);
      setProfileNotificationsEnabled(false);
    }
  }, []);

  async function onToggleFollow() {
    if (!isAuthenticated || isOwnProfile || blockedByMe || pendingFollow) {
      return;
    }

    const method = following || followRequestPending ? "DELETE" : "POST";
    setPendingFollow(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/accounts/follows/${encodeURIComponent(username)}`, {
        credentials: "include",
        method,
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("follow_request_failed");
      }

      const result = response.status === 204 ? null : await readFollowMutationResponse(response);
      setFollowing(result?.isFollowing ?? false);
      setFollowRequestPending(result?.isFollowRequestPending ?? false);
      if (typeof result?.followersCount === "number") {
        setFollowersCount(result.followersCount);
      }
    } catch {
      setActionError(t("profile.social.actionError"));
    } finally {
      setPendingFollow(false);
    }
  }

  async function onToggleProfileNotifications() {
    if (!isAuthenticated || isOwnProfile || blockedByMe || pendingProfileNotifications) {
      return;
    }

    const nextEnabled = !profileNotificationsEnabled;
    setPendingProfileNotifications(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/accounts/profile-notifications/${encodeURIComponent(username)}`, {
        credentials: "include",
        method: nextEnabled ? "POST" : "DELETE",
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error("profile_notifications_failed");
      }

      const source = asRecord(data);
      const isSubscribed = readBoolean(source, "isSubscribed", "IsSubscribed");
      setProfileNotificationsEnabled(isSubscribed ?? nextEnabled);
    } catch {
      setActionError(t("profile.social.actionError"));
    } finally {
      setPendingProfileNotifications(false);
    }
  }

  const followButtonLabel = followRequestPending && isFollowHover
    ? t("profile.hero.cancelRequest")
    : followRequestPending
      ? t("profile.hero.requested")
      : following && isFollowHover
        ? t("profile.hero.unfollow")
        : following
          ? t("profile.hero.following")
          : t("profile.hero.follow");

  return (
    <>
      <div className="mt-1 flex flex-col items-start gap-3 sm:items-end">
        <div className="grid w-full grid-cols-3 sm:w-auto">
          <CompactStatItem label={t("profile.stats.posts")} value={formatter.format(postsCount)} />
          <CompactStatButton
            label={t("profile.stats.followers")}
            onClick={() => {
              if (!isAuthenticated) {
                window.location.href = loginHref;
                return;
              }

              setOpenList("followers");
            }}
            value={formatter.format(followersCount)}
          />
          <CompactStatButton
            label={t("profile.stats.following")}
            onClick={() => {
              if (!isAuthenticated) {
                window.location.href = loginHref;
                return;
              }

              setOpenList("following");
            }}
            value={formatter.format(followingCount)}
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {isOwnProfile ? (
            <Button asChild className="flex-1 sm:flex-none" size="sm" variant="outline">
              <Link href="/settings/profile">{t("profile.hero.editProfile")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="flex-1 sm:flex-none" size="sm" variant="outline">
                <Link href={isAuthenticated ? "#" : loginHref}>{t("profile.hero.message")}</Link>
              </Button>
              {blockedByMe ? null : (
                isAuthenticated ? (
                  <Button
                    className={cn(
                      "flex-1 sm:flex-none min-w-25",
                      (following || followRequestPending) && "hover:bg-destructive hover:bg-destructive hover:text-white"
                    )}
                    disabled={pendingFollow}
                    onClick={onToggleFollow}
                    onMouseEnter={() => setIsFollowHover(true)}
                    onMouseLeave={() => setIsFollowHover(false)}
                    size="sm"
                    type="button"
                    variant={following || followRequestPending ? "outline" : "default"}
                  >
                    {pendingFollow ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    ) : null}

                    {followButtonLabel}
                  </Button>
                ) : (
                  <Button asChild className="flex-1 sm:flex-none" size="sm">
                    <Link href={loginHref}>{t("profile.hero.follow")}</Link>
                  </Button>
                )
              )}
              {isAuthenticated && !blockedByMe ? (
                <Button
                  aria-pressed={profileNotificationsEnabled}
                  className="shrink-0"
                  disabled={pendingProfileNotifications}
                  onClick={onToggleProfileNotifications}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {pendingProfileNotifications ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : profileNotificationsEnabled ? (
                    <BellRing aria-hidden="true" className="size-4" />
                  ) : (
                    <Bell aria-hidden="true" className="size-4" />
                  )}
                  <span className="hidden sm:inline">
                    {profileNotificationsEnabled
                      ? t("profile.hero.notificationsOn")
                      : t("profile.hero.notificationsOff")}
                  </span>
                </Button>
              ) : null}
              {isAuthenticated ? (
                <ProfileActionsMenu onBlockChange={handleBlockChange} profileId={profileId} username={username} />
              ) : null}
            </>
          )}
        </div>

        {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      </div>

      <FollowListDialog
        kind={openList}
        onOpenChange={(open) => {
          if (!open) {
            setOpenList(null);
          }
        }}
        username={username}
      />
    </>
  );
}

function CompactStatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 text-center sm:min-w-20">
      <p className="text-base font-semibold leading-none text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CompactStatButton({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className="flex items-center gap-1 rounded-2xl px-3 py-2.5 text-center transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-20"
      onClick={onClick}
      type="button"
    >
      <p className="text-base font-semibold leading-none text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

function FollowListDialog({
  kind,
  onOpenChange,
  username,
}: {
  kind: FollowListKind | null;
  onOpenChange: (open: boolean) => void;
  username: string;
}) {
  const t = useTranslations("public-web");
  const [items, setItems] = useState<FollowUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const open = kind !== null;
  const title = kind === "following" ? t("profile.social.followingTitle") : t("profile.social.followersTitle");
  const description =
    kind === "following"
      ? t("profile.social.followingDescription", { username })
      : t("profile.social.followersDescription", { username });
  const emptyLabel = kind === "following" ? t("profile.social.emptyFollowing") : t("profile.social.emptyFollowers");

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!kind) {
      return;
    }

    if (!append) {
      setItems([]);
      setPage(1);
      setHasNextPage(false);
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(false);
    try {
      const response = await fetch(
        `/api/accounts/follows/${encodeURIComponent(username)}/${kind}?page=${targetPage}&pageSize=${FOLLOW_PAGE_SIZE}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );
      const pageData = await readFollowUsersPage(response);
      setItems((current) => (append ? dedupeFollowUsers([...current, ...pageData.items]) : pageData.items));
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
  }, [kind, username]);

  useEffect(() => {
    if (!open || !kind) {
      return;
    }

    queueMicrotask(() => void loadPage(1, false));
  }, [kind, loadPage, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/accounts/profiles/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          return;
        }

        const profile = (await response.json().catch(() => null)) as { username?: string | null; normalizedUsername?: string | null } | null;
        const nextUsername = profile?.normalizedUsername ?? profile?.username ?? null;
        if (!cancelled) {
          setCurrentUsername(typeof nextUsername === "string" ? nextUsername : null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUsername(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(720px,calc(100vh-2rem))] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-48 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {!loading && error ? (
            <p className="px-3 py-8 text-center text-sm text-destructive">{t("profile.social.loadError")}</p>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
          ) : null}

          {!loading && !error ? (
            <div className="space-y-1.5">
              {items.map((item) => (
                <FollowUserRow currentUsername={currentUsername} item={item} key={item.profileId} />
              ))}
            </div>
          ) : null}

          {hasNextPage && !loading ? (
            <div className="flex justify-center pt-4">
              <Button
                disabled={loadingMore}
                onClick={() => void loadPage(page + 1, true)}
                size="sm"
                type="button"
                variant="outline"
              >
                {loadingMore ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                {t("profile.social.loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowUserRow({ currentUsername, item }: { currentUsername: string | null; item: FollowUser }) {
  const t = useTranslations("public-web");
  const displayName = item.displayName?.trim() || item.username;
  const [isFollowing, setIsFollowing] = useState(item.isFollowing ?? false);
  const [isFollowRequestPending, setIsFollowRequestPending] = useState(item.isFollowRequestPending ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const isOwnProfile = currentUsername?.trim().toLowerCase() === item.username.trim().toLowerCase();

  useEffect(() => {
    if (isOwnProfile) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/accounts/follows/${encodeURIComponent(item.username)}/status`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          return;
        }

        const status = normalizeFollowStatus(await response.json().catch(() => null));
        if (!cancelled) {
          setIsFollowing(status.isFollowing ?? item.isFollowing ?? false);
          setIsFollowRequestPending(status.isFollowRequestPending ?? item.isFollowRequestPending ?? false);
        }
      } catch {
        if (!cancelled) {
          setIsFollowing(item.isFollowing ?? false);
          setIsFollowRequestPending(item.isFollowRequestPending ?? false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, item.isFollowRequestPending, item.isFollowing, item.username]);

  async function onToggleFollow() {
    if (pending || isOwnProfile) {
      return;
    }

    setPending(true);
    setError(false);
    const method = isFollowing || isFollowRequestPending ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/accounts/follows/${encodeURIComponent(item.username)}`, {
        credentials: "include",
        method,
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("follow_request_failed");
      }

      const status = response.status === 204 ? null : normalizeFollowStatus(await response.json().catch(() => null));
      setIsFollowing(status?.isFollowing ?? false);
      setIsFollowRequestPending(status?.isFollowRequestPending ?? false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const buttonLabel = isFollowRequestPending
    ? t("profile.hero.cancelRequest")
    : isFollowing
      ? t("profile.hero.unfollow")
      : t("profile.hero.follow");

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl px-3 py-2.5 transition hover:bg-muted/70">
      <Link href={`/${encodeURIComponent(item.username)}`} className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10">
            {item.avatarUrl ? <AvatarImage alt={`${displayName} avatar`} src={item.avatarUrl} /> : null}
            {item.displayName ? <AvatarFallback>{getInitials(displayName)}</AvatarFallback> : <DefaultAvatar />}
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
          </div>
        </div>
      </Link>

      {isOwnProfile ? null : (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            disabled={pending}
            onClick={() => void onToggleFollow()}
            size="sm"
            type="button"
            variant={isFollowing || isFollowRequestPending ? "outline" : "default"}
          >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {buttonLabel}
          </Button>
          {error ? <span className="text-[11px] text-destructive">{t("profile.social.actionError")}</span> : null}
        </div>
      )}
    </div>
  );
}

async function readFollowUsersPage(response: Response): Promise<FollowUsersPage> {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error("follow_users_load_failed");
  }

  const source = asRecord(data);
  const items = readArray(source, "items", "Items").map(normalizeFollowUser).filter((item): item is FollowUser => item !== null);
  const page = readNumber(source, "page", "Page") ?? 1;
  const pageSize = readNumber(source, "pageSize", "PageSize") ?? FOLLOW_PAGE_SIZE;

  return { items, page, pageSize };
}

function normalizeFollowUser(value: unknown): FollowUser | null {
  const source = asRecord(value);
  const profileId = readString(source, "profileId", "ProfileId");
  const username = readString(source, "username", "Username");
  if (!profileId || !username) {
    return null;
  }

  return {
    avatarUrl: readNullableString(source, "avatarUrl", "AvatarUrl"),
    displayName: readNullableString(source, "displayName", "DisplayName"),
    followedAtUtc: readNullableString(source, "followedAtUtc", "FollowedAtUtc"),
    isFollowRequestPending: readBoolean(source, "isFollowRequestPending", "IsFollowRequestPending"),
    isFollowing: readBoolean(source, "isFollowing", "IsFollowing", "viewerFollowsThisUser", "ViewerFollowsThisUser"),
    profileId,
    username,
  };
}

function dedupeFollowUsers(items: FollowUser[]) {
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

function readBoolean(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "boolean" ? value : null;
}

async function readFollowMutationResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as unknown;
  const source = asRecord(data);
  return {
    followersCount: readNumber(source, "followersCount", "FollowersCount"),
    isFollowRequestPending: readBoolean(source, "isFollowRequestPending", "IsFollowRequestPending"),
    isFollowing: readBoolean(source, "isFollowing", "IsFollowing"),
  };
}

function normalizeFollowStatus(value: unknown) {
  const source = asRecord(value);
  return {
    isFollowRequestPending: readBoolean(source, "isFollowRequestPending", "IsFollowRequestPending"),
    isFollowing: readBoolean(source, "isFollowing", "IsFollowing", "viewerFollowsThisUser", "ViewerFollowsThisUser"),
  };
}
