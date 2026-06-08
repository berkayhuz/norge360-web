"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Edit3, Maximize2, MessageCircle, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Badge } from "@workspace/ui/components/data-display/badge";
import { Button } from "@workspace/ui/components/primitives/button";

import { MessagingPage } from "@/features/messaging/components/messaging-page";
import type { ConversationPageResponse, ConversationSummaryResponse } from "@/features/messaging/lib/types";

type AccountSummary = {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type MyProfileResponse = {
  authUserId?: string | null;
};

type BatchSummaryResponse = {
  items: AccountSummary[];
};

export function MessagingFloatingDock() {
  const t = useTranslations("public-web");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummaryResponse[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AccountSummary>>({});

  const hidden = pathname?.startsWith("/messages");
  const unreadCount = conversations.reduce((total, conversation) => total + Math.max(0, conversation.unreadCount), 0);
  const avatarProfiles = useMemo(
    () => conversations
      .map((conversation) => {
        const other = conversation.participants.find((participant) => participant.userId !== currentUserId);
        return other ? profiles[other.userId] : null;
      })
      .filter((profile): profile is AccountSummary => profile != null)
      .slice(0, 3),
    [conversations, currentUserId, profiles],
  );

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;

    async function load() {
      try {
        const [profileResponse, conversationsResponse] = await Promise.all([
          fetch("/api/accounts/profiles/me", { cache: "no-store", credentials: "include" }),
          fetch("/api/messaging/conversations?pageSize=20", { cache: "no-store", credentials: "include" }),
        ]);

        if (!profileResponse.ok || !conversationsResponse.ok) {
          return;
        }

        const profile = (await profileResponse.json().catch(() => null)) as MyProfileResponse | null;
        const payload = (await conversationsResponse.json().catch(() => ({ items: [] }))) as ConversationPageResponse;
        if (cancelled) return;

        const userId = typeof profile?.authUserId === "string" ? profile.authUserId : null;
        setAvailable(true);
        setCurrentUserId(userId);
        setConversations(payload.items ?? []);
        void loadProfileSummaries(payload.items.flatMap((conversation) => conversation.participants.map((participant) => participant.userId)), setProfiles);
      } catch {
        // Dock stays hidden for signed-out or unavailable messaging states.
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hidden]);

  if (hidden || !available) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden md:block">
      {open ? (
        <div className="h-[min(76vh,40rem)] w-[min(88vw,46rem)] overflow-hidden rounded-lg border border-border/70 bg-background shadow-2xl">
          <div className="flex h-14 items-center justify-between border-b border-border/70 px-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{t("messaging.title")}</h2>
              {unreadCount > 0 ? <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">{unreadCount}</Badge> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button asChild size="icon-sm" variant="ghost" border="none" aria-label={t("messaging.actions.openFull")}>
                <Link href="/messages">
                  <Maximize2 className="size-4" />
                </Link>
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" border="none" aria-label={t("messaging.actions.closeDock")} onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
          </div>
          <div className="h-[calc(100%-3.5rem)]">
            <MessagingPage surface="widget" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-14 items-center gap-3 rounded-full border border-border/70 bg-background px-4 text-sm font-semibold shadow-xl transition hover:-translate-y-0.5 hover:bg-muted"
          onClick={() => setOpen(true)}
        >
          <span className="relative">
            <MessageCircle className="size-6" />
            {unreadCount > 0 ? <Badge className="absolute -bottom-2 -right-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">{unreadCount}</Badge> : null}
          </span>
          <span>{t("messaging.title")}</span>
          <span className="flex -space-x-2">
            {avatarProfiles.map((profile) => (
              <Avatar key={profile.userId} className="size-7 border-2 border-background">
                {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.displayName ?? profile.username ?? t("messaging.title")} /> : null}
                {profile.displayName || profile.username ? <AvatarFallback>{(profile.displayName ?? profile.username ?? "").slice(0, 1).toUpperCase()}</AvatarFallback> : <DefaultAvatar />}
              </Avatar>
            ))}
          </span>
          <Edit3 className="size-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

async function loadProfileSummaries(userIds: string[], setProfiles: (updater: (current: Record<string, AccountSummary>) => Record<string, AccountSummary>) => void) {
  const distinct = Array.from(new Set(userIds.filter(Boolean)));
  if (distinct.length === 0) return;
  const response = await fetch("/api/accounts/internal/users/batch-summary", {
    body: JSON.stringify({ userIds: distinct }),
    cache: "no-store",
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return;
  const payload = (await response.json().catch(() => ({ items: [] }))) as BatchSummaryResponse;
  setProfiles((current) => {
    const next = { ...current };
    for (const item of payload.items ?? []) {
      next[item.userId] = item;
    }
    return next;
  });
}
