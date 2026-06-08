"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Check, Heart, Loader2, MessageCircle, Search, Share2 } from "lucide-react";

import type { SearchResultItem } from "@workspace/search";
import { normalizeSearchSuggestResponse } from "@workspace/search";
import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Input } from "@workspace/ui/components/forms/input";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { PostActions } from "@workspace/ui/components/app/social/post/post-actions/post-actions";

import { CommunityDeletePostDialog } from "@/features/community/components/community-delete-post-dialog";
import { CommunityEditPostDialog } from "@/features/community/components/community-edit-post-dialog";
import { CommunityReactionDialog } from "@/features/community/components/community-reaction-dialog";
import { CommunityReportDialog } from "@/features/community/components/community-report-dialog";
import { encryptTextForParticipants } from "@/features/messaging/lib/e2ee";
import type { ConversationPageResponse, ConversationSummaryResponse } from "@/features/messaging/lib/types";
import type { CommunityFeedActions } from "@/features/community/lib/hooks";
import type { CommunityFeedItem } from "@/features/community/lib/types";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

export function CommunityPostActions({
  item,
  actions,
  onProtectedAction,
  isAuthenticated = false,
  postHref = item.author?.username && item.slug ? `/${item.author.username}/feed/${item.slug}` : "#",
}: {
  item: CommunityFeedItem;
  actions: CommunityFeedActions;
  onProtectedAction: (callback: () => Promise<void>) => Promise<void>;
  isAuthenticated?: boolean;
  postHref?: string;
}) {
  const t = useTranslations("public-web");
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const likesCount = item.likesCount ?? 0;
  const commentsCount = item.commentsCount ?? 0;
  const hideLikeCounts = item.hideLikeCountOverride ?? item.author?.hideLikeCounts ?? false;

  async function protectedAction(callback: () => Promise<void>) {
    if (!isAuthenticated) {
      window.location.href = getAuthWebLoginUrl();
      return;
    }

    try {
      await onProtectedAction(callback);
    } catch {
      window.location.href = getAuthWebLoginUrl();
    }
  }

  return (
    <>
      <PostActions
        leading={
          <div className="space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rounded="full"
              border="none"
              aria-label={t("community.post.like")}
              className={`gap-2 px-3 ${item.isLikedByCurrentUser ? "text-rose-500 hover:bg-transparent hover:text-rose-500" : "text-muted-foreground hover:bg-transparent hover:text-foreground"}`}
              onClick={() => void protectedAction(() => actions.toggleLike(item.id, !!item.isLikedByCurrentUser))}
            >
              <Heart className="size-6" fill={item.isLikedByCurrentUser ? "currentColor" : "none"} />
              {hideLikeCounts ? null : <span className="text-sm tabular-nums">{likesCount}</span>}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rounded="full"
              border="none"
              aria-label={t("community.post.comment")}
              className="gap-2 px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = getAuthWebLoginUrl();
                  return;
                }

                window.location.href = `${postHref}#comments`;
              }}
            >
              <MessageCircle className="size-6" />
              <span className="text-sm tabular-nums">{commentsCount}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rounded="full"
              border="none"
              aria-label={t("community.post.share")}
              className="gap-2 px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = getAuthWebLoginUrl();
                  return;
                }

                setShareOpen(true);
              }}
            >
              <Share2 className="size-6" />
            </Button>
          </div>
        }
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            rounded="full"
            border="none"
            aria-label={t("community.post.save")}
            className={item.isSavedByCurrentUser ? "text-foreground hover:bg-transparent" : "text-muted-foreground hover:bg-transparent hover:text-foreground"}
            onClick={() => void protectedAction(() => actions.toggleSave(item.id, !!item.isSavedByCurrentUser))}
          >
            <Bookmark className="size-6" fill={item.isSavedByCurrentUser ? "currentColor" : "none"} />
          </Button>
        }
      />

      <CommunityReactionDialog
        currentReaction={item.currentUserReaction ?? null}
        onAdd={(emoji) => protectedAction(() => actions.setReaction(item.id, emoji))}
        onOpenChange={setReactionOpen}
        onRemove={() => protectedAction(() => actions.removeReaction(item.id))}
        open={reactionOpen}
      />
      <CommunityReportDialog
        onOpenChange={setReportOpen}
        onSubmit={(reason, description) => protectedAction(() => actions.reportPost(item.id, reason, description))}
        open={reportOpen}
      />
      <CommunityPostShareDialog
        item={item}
        onOpenChange={setShareOpen}
        open={shareOpen}
        postHref={postHref}
      />
      {item.canEdit ? (
        <CommunityEditPostDialog
          actions={actions}
          item={item}
          onOpenChange={setEditOpen}
          open={editOpen}
        />
      ) : null}
      {item.canDelete ? (
        <CommunityDeletePostDialog
          actions={actions}
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          postId={item.id}
        />
      ) : null}
    </>
  );
}

type ShareProfile = {
  profileId: string;
  userId?: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function CommunityPostShareDialog({
  item,
  onOpenChange,
  open,
  postHref,
}: {
  item: CommunityFeedItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  postHref: string;
}) {
  const t = useTranslations("public-web");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationSummaryResponse[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ShareProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<SearchResultItem[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<ConversationSummaryResponse[]>([]);

  async function ensureAuthenticatedSession() {
    const session = await getClientAuthSessionStatus();
    if (!session.authenticated) {
      window.location.href = getAuthWebLoginUrl();
      return false;
    }

    return true;
  }

  const visibleResults = useMemo(
    () => results.filter((result) => result.type === "user").slice(0, 10),
    [results],
  );
  const selectedCount = selectedUsers.length + selectedConversations.length;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/messaging/conversations?pageSize=20", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as ConversationPageResponse;
      if (cancelled) return;
      setRecentConversations(payload.items);
      await loadShareProfiles(payload.items.flatMap((conversation) => conversation.participants.map((participant) => participant.userId)), setProfiles);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length === 0) {
      queueMicrotask(() => setResults([]));
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search_failed");
        const payload = normalizeSearchSuggestResponse(await response.json().catch(() => null));
        setResults(payload?.items ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  async function shareToConversation(conversation: ConversationSummaryResponse) {
    if (!(await ensureAuthenticatedSession())) {
      throw new Error("unauthorized");
    }

    const draft = await encryptTextForParticipants(
      message.trim() || item.caption?.trim() || t("messaging.message.postShare"),
      conversation.participants.map((participant) => participant.userId),
      {
        share: {
          kind: "post",
          postId: item.id,
          postHref,
          caption: item.caption ?? null,
        },
      },
    );

    const response = await fetch(`/api/messaging/conversations/${conversation.id}/messages`, {
      body: JSON.stringify({
        clientMessageId: `share-${crypto.randomUUID()}`,
        senderDeviceId: draft.senderDeviceId,
        kind: 6,
        body: draft.body,
        attachments: [],
        replyToMessageId: null,
        forwardedFromConversationId: null,
        forwardedFromMessageId: null,
        sharedPostId: item.id,
        viewOnce: false,
        disappearingTtlSeconds: null,
        associatedDataJson: draft.associatedDataJson,
        clientSearchTokenHash: draft.clientSearchTokenHash,
      }),
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = getAuthWebLoginUrl();
      throw new Error("unauthorized");
    }

    if (!response.ok) throw new Error("share_failed");
  }

  async function shareToSearchResult(result: SearchResultItem) {
    if (!(await ensureAuthenticatedSession())) {
      throw new Error("unauthorized");
    }

    const response = await fetch(`/api/messaging/profiles/${encodeURIComponent(result.id)}/conversation`, {
      cache: "no-store",
      credentials: "include",
      method: "POST",
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = getAuthWebLoginUrl();
      throw new Error("unauthorized");
    }

    if (!response.ok) throw new Error("conversation_failed");
    const conversation = (await response.json()) as ConversationSummaryResponse;
    await shareToConversation(conversation);
  }

  function toggleUser(result: SearchResultItem) {
    setSelectedUsers((current) => {
      const exists = current.some((item) => item.id === result.id);
      return exists ? current.filter((item) => item.id !== result.id) : [...current, result];
    });
  }

  function toggleConversation(conversation: ConversationSummaryResponse) {
    setSelectedConversations((current) => {
      const exists = current.some((item) => item.id === conversation.id);
      return exists ? current.filter((item) => item.id !== conversation.id) : [...current, conversation];
    });
  }

  function isUserSelected(id: string) {
    return selectedUsers.some((item) => item.id === id);
  }

  function isConversationSelected(id: string) {
    return selectedConversations.some((item) => item.id === id);
  }

  async function shareSelectedTargets() {
    if (selectedCount === 0) return;

    setSending(true);
    setError(null);
    try {
      for (const result of selectedUsers) {
        await shareToSearchResult(result);
      }

      for (const conversation of selectedConversations) {
        await shareToConversation(conversation);
      }

      setMessage("");
      setQuery("");
      setResults([]);
      setSelectedUsers([]);
      setSelectedConversations([]);
      onOpenChange(false);
    } catch {
      setError(t("messaging.errors.share"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("messaging.share.title")}</DialogTitle>
          <DialogDescription>{t("messaging.share.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
          {selectedCount > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">{t("messaging.share.selected")}</span>
              <span className="text-xs text-muted-foreground">{selectedCount}</span>
            </div>
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("messaging.share.search")} className="pl-9" />
          </div>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t("messaging.share.messagePlaceholder")} />
          <div className="max-h-72 space-y-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {searching ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("messaging.status.connecting")}
              </div>
            ) : null}
            {visibleResults.map((result) => (
              <ShareTargetRow
                avatarUrl={result.avatarUrl ?? null}
                key={result.id}
                onClick={() => toggleUser(result)}
                selected={isUserSelected(result.id)}
                subtitle={result.username ? `@${result.username}` : result.summary}
                title={result.displayName || result.title}
                disabled={sending}
              />
            ))}
            {query.trim() && !searching && visibleResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("messaging.share.empty")}</p>
            ) : null}
            {!query.trim() ? (
              <>
                <p className="px-1 text-xs font-medium uppercase text-muted-foreground">{t("messaging.share.recent")}</p>
                {recentConversations.map((conversation) => {
                  const other = conversation.participants[1] ?? conversation.participants[0];
                  const profile = profiles[other?.userId ?? ""];
                  return (
                    <ShareTargetRow
                      avatarUrl={profile?.avatarUrl ?? null}
                      key={conversation.id}
                      onClick={() => toggleConversation(conversation)}
                      selected={isConversationSelected(conversation.id)}
                      subtitle={profile?.username ? `@${profile.username}` : conversation.id.slice(0, 8)}
                      title={profile?.displayName || profile?.username || conversation.id.slice(0, 8)}
                      disabled={sending}
                    />
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("messaging.actions.cancel")}</Button>
          <Button type="button" disabled={sending || selectedCount === 0} onClick={() => void shareSelectedTargets()}>
            {selectedCount > 1 ? `${t("messaging.share.send")} (${selectedCount})` : t("messaging.share.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareTargetRow({
  avatarUrl,
  disabled,
  onClick,
  subtitle,
  title,
  selected,
}: {
  avatarUrl: string | null;
  disabled: boolean;
  onClick: () => void;
  subtitle: string;
  title: string;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-muted disabled:opacity-60 ${selected ? "bg-muted/80 ring-1 ring-border" : ""}`}
    >
      <Avatar className="size-10">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
        {title ? <AvatarFallback>{title.slice(0, 1).toUpperCase()}</AvatarFallback> : <DefaultAvatar />}
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {selected ? <Check className="size-4 text-foreground" /> : <SendIcon />}
    </button>
  );
}

function SendIcon() {
  return <Share2 className="size-4 text-muted-foreground" />;
}

async function loadShareProfiles(
  userIds: string[],
  setProfiles: (updater: (current: Record<string, ShareProfile>) => Record<string, ShareProfile>) => void,
) {
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
  const payload = (await response.json().catch(() => ({ items: [] }))) as { items: ShareProfile[] };
  setProfiles((current) => {
    const next = { ...current };
    for (const item of payload.items ?? []) {
      next[item.userId ?? item.profileId] = item;
    }
    return next;
  });
}
