"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import EmojiPicker, { Theme as EmojiPickerTheme } from "emoji-picker-react";
import {
  Archive,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Trash2,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Badge } from "@workspace/ui/components/data-display/badge";
import { Button } from "@workspace/ui/components/primitives/button";
import { Input } from "@workspace/ui/components/forms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/overlay/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import type { SearchResultItem } from "@workspace/search";
import { normalizeSearchSuggestResponse } from "@workspace/search";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";

import {
  encryptTextForParticipants,
  ensureMessagingDeviceRegistered,
  readAssociatedData,
  normalizeSearchableText,
  readPlainMessageText,
} from "@/features/messaging/lib/e2ee";
import type {
  ConversationPageResponse,
  ConversationParticipantResponse,
  ConversationSummaryResponse,
  MessagePageResponse,
  MessagingPresenceEvent,
  MessagingReadReceiptEvent,
  MessagingTypingEvent,
  MessageResponse,
} from "@/features/messaging/lib/types";
import { useTheme } from "@/components/theme-provider";

type AccountSummary = {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean | null;
};

type MyProfileResponse = {
  authUserId?: string | null;
};

type BatchSummaryResponse = {
  items: AccountSummary[];
};

type ReportReason = "Spam" | "Harassment" | "HateSpeech" | "Nudity" | "Violence" | "Scam" | "Other";
type RealtimeConnection = import("@microsoft/signalr").HubConnection;

const MUTED_UNTIL_DAYS = 3650;
const REPORT_REASONS: ReportReason[] = ["Spam", "Harassment", "HateSpeech", "Nudity", "Violence", "Scam", "Other"];
const TYPING_IDLE_MS = 2_500;
const TYPING_TIMEOUT_MS = 4_500;
const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"] as const;

type MessagingPageProps = {
  surface?: "page" | "widget";
};

export function MessagingPage({ surface = "page" }: MessagingPageProps) {
  const t = useTranslations("public-web");
  const tNavigation = useTranslations("navigation");
  const locale = useLocale();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummaryResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [chatSearchMatches, setChatSearchMatches] = useState<MessageResponse[]>([]);
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const [plaintext, setPlaintext] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, AccountSummary>>({});
  const [query, setQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearching, setChatSearching] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<MessageResponse | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageQuery, setNewMessageQuery] = useState("");
  const [newMessageSearching, setNewMessageSearching] = useState(false);
  const [newMessageResults, setNewMessageResults] = useState<SearchResultItem[]>([]);
  const [newMessageSending, setNewMessageSending] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const realtimeConnectionRef = useRef<RealtimeConnection | null>(null);
  const typingIdleTimerRef = useRef<number | null>(null);
  const typingClearTimersRef = useRef<Map<string, number>>(new Map());
  const groupConversationLabel = t("messaging.details.groupConversation");
  const someoneLabel = t("messaging.details.someone");

  async function ensureAuthenticatedSession() {
    const sessionStatus = await getClientAuthSessionStatus();
    if (!sessionStatus.authenticated) {
      setActionError(t("messaging.errors.unauthorized"));
      return false;
    }

    return true;
  }

  const sortedConversations = useMemo(
    () => [...conversations].sort(sortConversations),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedConversations
      .filter((conversation) => (showArchived ? conversation.isArchived : !conversation.isArchived))
      .filter((conversation) => {
        if (!normalizedQuery) return true;
        const title = conversationTitle(conversation, currentUserId, profiles, groupConversationLabel).toLowerCase();
        return title.includes(normalizedQuery) || conversation.id.toLowerCase().includes(normalizedQuery);
      });
  }, [currentUserId, groupConversationLabel, profiles, query, showArchived, sortedConversations]);

  const activeConversation = useMemo(
    () => sortedConversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, sortedConversations],
  );

  const activeMessages = messages;
  const activeSearchMatch = chatSearchMatches[chatSearchIndex] ?? null;
  const viewerParticipant = activeConversation ? findViewerParticipant(activeConversation, currentUserId) : null;
  const otherParticipant = activeConversation ? findOtherParticipant(activeConversation, currentUserId) : null;
  const otherProfile = otherParticipant ? profiles[otherParticipant.userId] : null;
  const otherProfileHref = otherProfile?.username ? `/${otherProfile.username}` : null;
  const otherIsOnline = isUserOnline(otherParticipant?.userId ?? null, onlineUserIds);
  const typingParticipants = useMemo(
    () => typingUserIds
      .filter((userId) => userId !== currentUserId)
      .map((userId) => activeConversation?.participants.find((participant) => participant.userId === userId) ?? null)
      .filter((participant): participant is ConversationParticipantResponse => participant !== null),
    [activeConversation?.participants, currentUserId, typingUserIds],
  );
  const archivedCount = conversations.filter((conversation) => conversation.isArchived).length;
  const newMessageRecent = useMemo(
    () => sortedConversations.filter((conversation) => !conversation.isArchived),
    [sortedConversations],
  );

  const loadConversations = useCallback(async () => {
    setActionError(null);
    const sessionStatus = await getClientAuthSessionStatus();
    if (!sessionStatus.authenticated) {
      setConversations([]);
      setActiveConversationId(null);
      setActionError(t("messaging.errors.unauthorized"));
      return;
    }

    const [profileResponse, conversationsResponse] = await Promise.all([
      fetch("/api/accounts/profiles/me", { cache: "no-store", credentials: "include" }),
      fetch("/api/messaging/conversations?pageSize=60", { cache: "no-store", credentials: "include" }),
    ]);

    if (profileResponse.ok) {
      const profile = (await profileResponse.json().catch(() => null)) as MyProfileResponse | null;
      setCurrentUserId(typeof profile?.authUserId === "string" ? profile.authUserId : null);
      void ensureMessagingDeviceRegistered(profile?.authUserId).catch(() => undefined);
    }

    if (!conversationsResponse.ok) {
      setConversations([]);
      setActiveConversationId(null);
      setActionError(conversationsResponse.status === 401 ? t("messaging.errors.unauthorized") : t("messaging.errors.loadConversations"));
      return;
    }

    const payload = (await conversationsResponse.json()) as ConversationPageResponse;
    setConversations(payload.items);
    setActiveConversationId((current) => (current && payload.items.some((item) => item.id === current) ? current : null));
    void loadProfileSummaries(payload.items.flatMap((conversation) => conversation.participants.map((participant) => participant.userId)), setProfiles);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadConversations();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const timer = window.setInterval(() => {
      void loadConversations().catch(() => undefined);
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversation?.id) {
      queueMicrotask(() => {
        setMessages([]);
        setChatSearchMatches([]);
        setChatSearchIndex(0);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setMessagesLoading(true);
      setChatSearchMatches([]);
      setChatSearchIndex(0);
    });
    void (async () => {
      try {
        const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/messages?pageSize=80`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          if (!cancelled) setActionError(t("messaging.errors.loadMessages"));
          return;
        }

        const payload = (await response.json()) as MessagePageResponse;
        const ordered = [...payload.items].reverse();
        if (cancelled) return;
        setMessages(ordered);
        const lastMessageId = ordered.at(-1)?.id ?? null;
        if (lastMessageId) {
          void markRead(activeConversation.id, lastMessageId);
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id, t]);

  useEffect(() => {
    if (!currentUserId || !activeConversation?.id) {
      queueMicrotask(() => setTypingUserIds([]));
      return;
    }

    let cancelled = false;
    const conversationId = activeConversation.id;
    const typingClearTimers = typingClearTimersRef.current;

    void (async () => {
      const isAuthenticated = await ensureAuthenticatedSession();
      if (cancelled) return;
      if (!isAuthenticated) {
        return;
      }

      const signalR = await import("@microsoft/signalr");
      if (cancelled) return;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(getMessagingHubUrl(), { withCredentials: true })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on("messaging.message.created", (message: MessageResponse) => {
        if (message.conversationId !== conversationId) return;
        setMessages((current) => upsertMessage(current, message));
        setPlaintext((current) => migratePlaintextForSavedMessage(current, message));
        if (message.senderUserId !== currentUserId) {
          void markRead(conversationId, message.id);
        }
      });

      connection.on("messaging.message.updated", (message: MessageResponse) => {
        if (message.conversationId !== conversationId) return;
        setMessages((current) => upsertMessage(current, message));
      });

      connection.on("messaging.conversation.updated", (conversation: ConversationSummaryResponse) => {
        setConversations((current) => upsertConversation(current, conversation));
      });

      connection.on("messaging.receipt.read", (receipt: MessagingReadReceiptEvent) => {
        if (receipt.conversationId !== conversationId) return;
        setMessages((current) => updateReadReceipt(current, receipt, currentUserId));
      });

      connection.on("messaging.typing", (event: MessagingTypingEvent) => {
        if (event.conversationId !== conversationId || event.userId === currentUserId) return;
        setTypingUser(event.userId, event.isTyping, setTypingUserIds, typingClearTimers);
      });

      connection.on("messaging.presence", (event: MessagingPresenceEvent) => {
        if (event.conversationId !== conversationId || event.userId === currentUserId) return;
        setPresenceUser(event.userId, event.isOnline, setOnlineUserIds);
      });

      connection.onreconnected(() => {
        void connection.invoke("JoinConversation", conversationId).catch(() => undefined);
        void connection.invoke("SetActiveConversation", conversationId, true).catch(() => undefined);
      });

      try {
        await connection.start();
        if (cancelled) {
          await connection.stop();
          return;
        }
        realtimeConnectionRef.current = connection;
        await connection.invoke("JoinConversation", conversationId);
        await connection.invoke("SetActiveConversation", conversationId, true);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (cancelled || message.includes("stopped during negotiation")) {
          return;
        }

        if (!cancelled) setActionError(t("messaging.errors.realtime"));
      }
    })();

    return () => {
      cancelled = true;
      setTypingUserIds([]);
      setOnlineUserIds([]);
      for (const timer of typingClearTimers.values()) {
        window.clearTimeout(timer);
      }
      typingClearTimers.clear();
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      const connection = realtimeConnectionRef.current;
      realtimeConnectionRef.current = null;
      if (connection) {
        void connection.invoke("Typing", conversationId, false).catch(() => undefined);
        void connection.invoke("SetActiveConversation", conversationId, false).catch(() => undefined);
        void connection.invoke("LeaveConversation", conversationId).catch(() => undefined);
        void connection.stop().catch(() => undefined);
      }
    };
  }, [activeConversation?.id, currentUserId, t]);

  useEffect(() => {
    if (!newMessageOpen || newMessageQuery.trim().length === 0) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setNewMessageSearching(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(newMessageQuery.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search_failed");
        const payload = normalizeSearchSuggestResponse(await response.json().catch(() => null));
        setNewMessageResults(dedupeUserSearchResults((payload?.items ?? []).filter((item) => item.type === "user")));
      } catch {
        if (!controller.signal.aborted) setNewMessageResults([]);
      } finally {
        if (!controller.signal.aborted) setNewMessageSearching(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [newMessageOpen, newMessageQuery]);

  useEffect(() => {
    if (!activeConversation || !chatSearchOpen) {
      queueMicrotask(() => {
        setChatSearchMatches([]);
        setChatSearchIndex(0);
      });
      return;
    }

    const searchToken = normalizeSearchableText(chatSearchQuery);
    if (!searchToken) {
      queueMicrotask(() => {
        setChatSearchMatches([]);
        setChatSearchIndex(0);
        setChatSearching(false);
      });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChatSearching(true);
      try {
        const response = await fetch("/api/messaging/search", {
          body: JSON.stringify({
            conversationId: activeConversation.id,
            clientSearchTokenHashes: [searchToken],
            fromUtc: null,
            toUtc: null,
            attachmentKind: null,
            senderUserId: null,
            pageSize: 100,
            beforeUtc: null,
          }),
          cache: "no-store",
          credentials: "include",
          headers: { "content-type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search_failed");
        const payload = (await response.json()) as MessagePageResponse;
        const matches = [...payload.items].reverse();
        setChatSearchMatches(matches);
        setChatSearchIndex(0);
        setPlaintext((current) => {
          const next = { ...current };
          for (const message of matches) {
            const text = readPlainMessageText(message);
            if (text) next[message.id] = text;
          }
          return next;
        });
      } catch {
        if (!controller.signal.aborted) {
          setChatSearchMatches([]);
          setChatSearchIndex(0);
          setActionError(t("messaging.errors.search"));
        }
      } finally {
        if (!controller.signal.aborted) setChatSearching(false);
      }
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeConversation, chatSearchOpen, chatSearchQuery, t]);

  useEffect(() => {
    const nextEntries = activeMessages
      .map((message) => {
        if (plaintext[message.id]) return null;
        const text = readPlainMessageText(message);
        return text ? [message.id, text] as const : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null);

    if (nextEntries.length > 0) {
      queueMicrotask(() => {
        setPlaintext((current) => ({ ...current, ...Object.fromEntries(nextEntries) }));
      });
    }
  }, [activeMessages, plaintext]);

  useEffect(() => {
    if (!activeSearchMatch) return;
    queueMicrotask(() => {
      setMessages((current) => upsertMessage(current, activeSearchMatch));
    });
    window.requestAnimationFrame(() => {
      messageRefs.current[activeSearchMatch.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [activeSearchMatch]);

  async function sendMessage() {
    const trimmed = messageText.trim();
    if ((!trimmed && !selectedFile) || !activeConversation || !currentUserId) return;

    if (!(await ensureAuthenticatedSession())) {
      return;
    }

    setActionError(null);
    const localId = `local-${crypto.randomUUID()}`;
    const textToEncrypt = trimmed || selectedFile?.name || "";
    let draft;
    try {
      draft = await encryptTextForParticipants(
        textToEncrypt,
        activeConversation.participants.map((participant) => participant.userId),
        undefined,
        currentUserId,
      );
    } catch {
      setActionError(t("messaging.errors.encryption"));
      return;
    }

    const optimisticMessage = createOptimisticMessage({
      associatedDataJson: draft.associatedDataJson,
      body: draft.body,
      clientMessageId: localId,
      conversationId: activeConversation.id,
      kind: selectedFile ? "Media" : "Text",
      replyToMessageId: replyTo?.id ?? null,
      replyPreview: replyTo,
      senderDeviceId: draft.senderDeviceId,
      senderUserId: currentUserId,
    });

    setMessages((current) => [...current, optimisticMessage]);
    setPlaintext((current) => ({ ...current, [localId]: textToEncrypt }));
    setMessageText("");
    setSelectedFile(null);
    setReplyTo(null);
    composerRef.current?.focus();

    const attachments = selectedFile ? [createAttachmentRequest(selectedFile, localId)] : [];
    let saved: MessageResponse;
    try {
      const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/messages`, {
        body: JSON.stringify({
          clientMessageId: localId,
          senderDeviceId: draft.senderDeviceId,
          kind: selectedFile ? 3 : 1,
          body: draft.body,
          attachments,
          replyToMessageId: replyTo?.id ?? null,
          forwardedFromConversationId: null,
          forwardedFromMessageId: null,
          sharedPostId: null,
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

      if (!response.ok) {
        throw new Error("send_failed");
      }

      saved = (await response.json()) as MessageResponse;
    } catch {
      setActionError(t("messaging.errors.send"));
      setMessages((current) => current.map((message) => (message.id === localId ? { ...message, state: "Failed" } : message)));
      return;
    }

    setMessages((current) => upsertMessage(current, saved));
    setPlaintext((current) => {
      const next = { ...current };
      delete next[localId];
      next[saved.id] = textToEncrypt;
      return next;
    });
    void loadConversations();
  }

  async function toggleParticipant(update: ParticipantUpdate, options?: { openArchives?: boolean }) {
    if (!activeConversation) return;
    const payload = buildParticipantPayload(activeConversation, currentUserId, update);
    const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/me`, {
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    if (!response.ok) {
      setActionError(t("messaging.errors.action"));
      return;
    }

    const updated = (await response.json()) as ConversationSummaryResponse;
    setConversations((current) => upsertConversation(current, updated));
    if (options?.openArchives && updated.isArchived) {
      setShowArchived(true);
    }
  }

  function moveChatSearchMatch(direction: 1 | -1) {
    if (chatSearchMatches.length === 0) return;
    setChatSearchIndex((current) => (current + direction + chatSearchMatches.length) % chatSearchMatches.length);
  }

  async function reactToMessage(message: MessageResponse, emoji?: string) {
    if (!activeConversation) return;
    if (emoji) {
      const existingReaction = message.reactions.some((reaction) => reaction.userId === currentUserId && reaction.emoji === emoji);
      const response = await fetch(
        existingReaction
          ? `/api/messaging/conversations/${activeConversation.id}/messages/${message.id}/reactions/${encodeURIComponent(emoji)}`
          : `/api/messaging/conversations/${activeConversation.id}/messages/${message.id}/reactions`,
        {
          body: existingReaction ? undefined : JSON.stringify({ emoji }),
          cache: "no-store",
          credentials: "include",
          headers: existingReaction ? undefined : { "content-type": "application/json" },
          method: existingReaction ? "DELETE" : "POST",
        },
      );
      if (response.ok) {
        const updated = (await response.json()) as MessageResponse;
        setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
      return;
    }

    const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/messages/${message.id}/reactions`, {
      body: JSON.stringify({ emoji: "❤️" }),
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (response.ok) {
      const updated = (await response.json()) as MessageResponse;
      setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
  }

  async function recallMessage(message: MessageResponse) {
    if (!activeConversation) return;
    const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/messages/${message.id}/recall`, {
      cache: "no-store",
      credentials: "include",
      method: "POST",
    });
    if (response.ok) {
      const updated = (await response.json()) as MessageResponse;
      setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
  }

  async function blockConversationUser() {
    if (!otherProfile?.username) return;
    const response = await fetch(`/api/accounts/blocks/${encodeURIComponent(otherProfile.username)}`, {
      credentials: "include",
      method: "POST",
    });
    if (!response.ok && response.status !== 204) {
      setActionError(t("messaging.errors.block"));
      return;
    }

    setBlockOpen(false);
    setActionError(null);
  }

  async function reportConversation() {
    if (!activeConversation) return;
    const response = await fetch(`/api/messaging/conversations/${activeConversation.id}/reports`, {
      body: JSON.stringify({
        reportedUserId: otherParticipant?.userId ?? null,
        messageId: null,
        reasonCode: reportReason,
        metadataJson: reportDescription.trim() ? JSON.stringify({ description: reportDescription.trim() }) : null,
        userProvidedEvidence: null,
      }),
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      setActionError(t("messaging.errors.report"));
      return;
    }

    setReportOpen(false);
    setReportDescription("");
    setReportReason("Spam");
  }

  function resetNewMessageDialogState() {
    setNewMessageQuery("");
    setNewMessageResults([]);
    setNewMessageSearching(false);
    setNewMessageSending(null);
  }

  function handleNewMessageDialogOpenChange(open: boolean) {
    setNewMessageOpen(open);
    if (!open) {
      resetNewMessageDialogState();
    }
  }

  async function openConversationFromProfile(profileId: string, username?: string | null) {
    if (!profileId || newMessageSending) {
      return;
    }

    setNewMessageSending(profileId);
    setActionError(null);

    try {
      const conversationTarget = username?.trim() || profileId;
      const conversationUrl = new URL(`/api/messaging/profiles/${encodeURIComponent(conversationTarget)}/conversation`, window.location.origin);
      if (username?.trim()) {
        conversationUrl.searchParams.set("username", username.trim());
      }

      const response = await fetch(conversationUrl, {
        cache: "no-store",
        credentials: "include",
        method: "POST",
      });
      const conversation = normalizeConversationResponse(await response.json().catch(() => null));
      if (!response.ok || !conversation?.id) {
        throw new Error("conversation_open_failed");
      }

      setActiveConversationId(conversation.id);
      router.replace(`/messages?conversationId=${encodeURIComponent(conversation.id)}`);
      handleNewMessageDialogOpenChange(false);
    } catch {
      setActionError(t("messaging.errors.openConversation"));
    } finally {
      setNewMessageSending(null);
    }
  }

  return (
    <main className={cn(
      "overflow-hidden bg-background",
      surface === "page" ? "h-[calc(100dvh-3.5rem)] min-h-0 md:h-[calc(100dvh-4rem)]" : "h-full min-h-0",
    )}>
      <div
        className={cn(
          "grid h-full grid-cols-1 border-x border-border/70",
          surface === "page" ? "md:grid-cols-[19rem_minmax(0,1fr)]" : "grid-cols-[16rem_minmax(0,1fr)]",
          surface === "page" && (detailOpen ? "xl:grid-cols-[21rem_minmax(0,1fr)_19rem]" : "xl:grid-cols-[21rem_minmax(0,1fr)]"),
        )}
      >
        <aside className={cn(
          "h-full border-r border-border/70 bg-background",
          activeConversation ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}>
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
            <div>
              <h1 className="text-base font-semibold leading-none">{t("messaging.title")}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading ? t("messaging.status.connecting") : t("messaging.status.conversationCount", { count: filteredConversations.length })}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              border="none"
              aria-label={t("messaging.actions.newConversation")}
              onClick={() => setNewMessageOpen(true)}
            >
              <UserPlus className="size-5" />
            </Button>
          </div>

          <div className="space-y-2 border-b border-border/70 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("messaging.search.conversations")}
                className="h-10 rounded-full border-0 bg-muted pl-9"
              />
            </div>
            <Button
              type="button"
              variant={showArchived ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setShowArchived((value) => !value)}
            >
              <Archive className="size-4" />
              {t("messaging.archive.title")}
              {archivedCount > 0 ? <Badge className="ml-auto h-5 rounded-full px-1.5">{archivedCount}</Badge> : null}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <EmptyPanel title={showArchived ? t("messaging.archive.empty") : t("messaging.empty.title")} description={t("messaging.empty.description")} />
            ) : null}
            {filteredConversations.map((conversation) => (
              <ConversationButton
                conversation={conversation}
                currentUserId={currentUserId}
                groupConversationLabel={groupConversationLabel}
                key={conversation.id}
                onClick={() => {
                  setActiveConversationId(conversation.id);
                  setDetailOpen(false);
                  setChatSearchOpen(false);
                  router.replace(`/messages?conversationId=${encodeURIComponent(conversation.id)}`);
                }}
                profiles={profiles}
                selected={activeConversation?.id === conversation.id}
                t={t as unknown as (key: string) => string}
              />
            ))}
          </div>
        </aside>

        <section className={cn("min-h-0 min-w-0 flex-col", activeConversation && !detailOpen ? "flex" : "hidden md:flex")}>
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-3 md:px-5">
            <div className="flex min-w-0 items-center gap-2">
              {activeConversation ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  border="none"
                  className="md:hidden"
                  aria-label={tNavigation("back")}
                  onClick={() => {
                    setActiveConversationId(null);
                    setDetailOpen(false);
                    setChatSearchOpen(false);
                    router.replace("/messages");
                  }}
                >
                  <ChevronLeft className="size-5" />
                </Button>
              ) : null}
              <ParticipantAvatar participant={otherParticipant} profiles={profiles} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                      {activeConversation && otherProfileHref ? (
                      <Link href={otherProfileHref} className="truncate text-sm font-semibold hover:underline">
                      {conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}
                    </Link>
                  ) : (
                    <h2 className="truncate text-sm font-semibold">{activeConversation ? conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel) : t("messaging.empty.title")}</h2>
                  )}
                  {activeConversation && otherIsOnline ? <Circle className="size-2.5 fill-emerald-500 text-emerald-500" /> : null}
                </div>
                {activeConversation ? (
                  otherProfileHref ? (
                    <Link href={otherProfileHref} className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                      {otherProfile?.username ? `@${otherProfile.username}` : conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}
                    </Link>
                  ) : (
                  <p className="truncate text-xs text-muted-foreground">{conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}</p>
                  )
                ) : (
                  <p className="truncate text-xs text-muted-foreground">{t("messaging.empty.description")}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant={chatSearchOpen ? "secondary" : "ghost"}
                border="none"
                aria-label={t("messaging.actions.searchInConversation")}
                disabled={!activeConversation}
                onClick={() => {
                  setChatSearchOpen((value) => !value);
                  setChatSearchMatches([]);
                  setChatSearchIndex(0);
                }}
              >
                <Search className="size-5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                border="none"
                aria-label={viewerParticipant?.notificationSoundEnabled === false ? t("messaging.actions.soundOn") : t("messaging.actions.soundOff")}
                disabled={!activeConversation}
                onClick={() => void toggleParticipant({ notificationSoundEnabled: !(viewerParticipant?.notificationSoundEnabled ?? true) })}
              >
                {viewerParticipant?.notificationSoundEnabled === false ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant={detailOpen ? "secondary" : "ghost"}
                border="none"
                aria-label={t("messaging.actions.details")}
                disabled={!activeConversation}
                onClick={() => setDetailOpen((value) => !value)}
              >
                <Info className="size-5" />
              </Button>
            </div>
          </div>

          {chatSearchOpen ? (
            <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2 md:px-5">
              <Input
                value={chatSearchQuery}
                onChange={(event) => setChatSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    moveChatSearchMatch(event.shiftKey ? -1 : 1);
                  }
                }}
                placeholder={t("messaging.search.messages")}
                className="h-9"
              />
              <span className="min-w-12 text-center text-xs text-muted-foreground">
                {chatSearching ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : chatSearchQuery.trim() ? (
                  chatSearchMatches.length > 0 ? `${chatSearchIndex + 1}/${chatSearchMatches.length}` : "0/0"
                ) : null}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                border="none"
                aria-label={t("messaging.search.previous")}
                disabled={chatSearchMatches.length === 0}
                onClick={() => moveChatSearchMatch(-1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                border="none"
                aria-label={t("messaging.search.next")}
                disabled={chatSearchMatches.length === 0}
                onClick={() => moveChatSearchMatch(1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                border="none"
                aria-label={t("messaging.search.clear")}
                onClick={() => {
                  setChatSearchQuery("");
                  setChatSearchMatches([]);
                  setChatSearchIndex(0);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-5 md:px-8">
            {actionError ? <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</div> : null}
            {!activeConversation ? (
              <EmptyPanel title={t("messaging.empty.title")} description={t("messaging.empty.description")} />
            ) : messagesLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("messaging.status.loadingMessages")}
              </div>
            ) : activeMessages.length === 0 ? (
              <EmptyPanel title={t("messaging.emptyConversation.title")} description={t("messaging.emptyConversation.description")} />
            ) : (
              <MessageList
                activeMatchId={activeSearchMatch?.id ?? null}
                currentUserId={currentUserId}
                locale={locale}
                messageRefs={messageRefs}
                messages={activeMessages}
                onReact={setReactionTarget}
                onRecall={recallMessage}
                onReply={setReplyTo}
                plaintext={plaintext}
                t={t as unknown as (key: string, values?: Record<string, string | number>) => string}
              />
            )}
          </div>

          <div className="border-t border-border/70 bg-background p-3 md:p-4">
            {replyTo ? (
              <div className="mb-2 flex items-center justify-between rounded-md border border-border/70 bg-muted px-3 py-2 text-xs">
                <span className="truncate">{t("messaging.replyingTo", { text: messageTextPreview(replyTo, plaintext, t as unknown as (key: string) => string) })}</span>
                  <Button type="button" size="icon-xs" variant="ghost" border="none" aria-label={t("messaging.actions.removeReply")} onClick={() => setReplyTo(null)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ) : null}
            {selectedFile ? (
              <div className="mb-2 flex items-center justify-between rounded-md border border-border/70 bg-muted px-3 py-2 text-xs">
                <span className="truncate">{selectedFile.name}</span>
                  <Button type="button" size="icon-xs" variant="ghost" border="none" aria-label={t("messaging.actions.removeAttachment")} onClick={() => setSelectedFile(null)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : null}

            <div className="flex items-end gap-2 rounded-[1.75rem] border border-border/70 bg-muted/40 p-2">
              <input
                ref={imageInputRef}
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <Button type="button" size="icon-sm" variant="ghost" border="none" aria-label={t("messaging.actions.addImage")} disabled={!activeConversation} onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="size-5" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" border="none" aria-label={t("messaging.actions.addFile")} disabled={!activeConversation} onClick={() => imageInputRef.current?.click()}>
                <Paperclip className="size-5" />
              </Button>
              <Textarea
                ref={composerRef}
                value={messageText}
                onChange={(event) => {
                  setMessageText(event.target.value);
                  publishTyping(event.target.value.trim().length > 0, activeConversation?.id ?? null, realtimeConnectionRef.current, typingIdleTimerRef);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                disabled={!activeConversation}
                placeholder={t("messaging.composer.placeholder")}
                className="max-h-32 min-h-10 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
              />
              <Button type="button" size="icon-sm" variant="ghost" border="none" aria-label={t("messaging.actions.voice")}>
                <Mic className="size-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                rounded="full"
                border="none"
                aria-label={t("messaging.actions.send")}
                onClick={() => void sendMessage()}
                disabled={!activeConversation || (!messageText.trim() && !selectedFile)}
              >
                <Send className="size-5" />
              </Button>
            </div>
            {typingParticipants.length > 0 ? (
              <p className="mt-2 px-3 text-xs text-muted-foreground">
                {t("messaging.status.typing", { name: typingLabel(typingParticipants, profiles, currentUserId, someoneLabel) })}
              </p>
            ) : null}
          </div>
        </section>

        {activeConversation && detailOpen ? (
          <div className="flex h-full min-w-0 flex-col bg-background md:hidden">
            <div className="flex h-16 items-center gap-2 border-b border-border/70 px-3">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                border="none"
                aria-label={tNavigation("back")}
                onClick={() => setDetailOpen(false)}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{t("messaging.actions.details")}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-border/70 p-5 text-center">
                <ParticipantAvatar className="mx-auto size-20" participant={otherParticipant} profiles={profiles} />
                <h3 className="mt-3 text-sm font-semibold">{conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{otherIsOnline ? t("messaging.details.online") : t("messaging.details.offline")}</p>
              </div>

              <div className="grid grid-cols-4 border-b border-border/70 p-3">
                <DetailButton
                  icon={activeConversation.isMuted ? Bell : BellOff}
                  label={activeConversation.isMuted ? t("messaging.details.unmute") : t("messaging.details.mute")}
                  onClick={() => void toggleParticipant({ mutedUntilUtc: activeConversation.isMuted ? null : futureIso(MUTED_UNTIL_DAYS) })}
                />
                <DetailButton
                  icon={Archive}
                  label={activeConversation.isArchived ? t("messaging.details.unarchive") : t("messaging.details.archive")}
                  onClick={() => void toggleParticipant({ archivedAtUtc: activeConversation.isArchived ? null : new Date().toISOString() }, { openArchives: true })}
                />
                <DetailButton
                  icon={Pin}
                  label={activeConversation.isPinned ? t("messaging.details.unpin") : t("messaging.details.pin")}
                  onClick={() => void toggleParticipant({ pinnedAtUtc: activeConversation.isPinned ? null : new Date().toISOString() })}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex flex-col items-center gap-1 rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="size-5" />
                      <span>{t("messaging.details.more")}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void toggleParticipant({ markUnread: !activeConversation.isMarkedUnread })}>
                      {activeConversation.isMarkedUnread ? t("messaging.details.markRead") : t("messaging.details.markUnread")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setMessages([]);
                      void toggleParticipant({ clearedAtUtc: new Date().toISOString() });
                    }}>
                      {t("messaging.details.clearHistory")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setBlockOpen(true)}>
                      {t("messaging.details.block")}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setReportOpen(true)}>
                      {t("messaging.details.report")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-5 p-4">
                <DetailSection title={t("messaging.details.shared")}>
                  <div className="grid grid-cols-3 gap-2">
                    <MediaTile icon={ImageIcon} label={t("messaging.media.images")} />
                    <MediaTile icon={FileText} label={t("messaging.media.files")} />
                    <MediaTile icon={Mic} label={t("messaging.media.audio")} />
                  </div>
                </DetailSection>

                <DetailSection title={t("messaging.details.links")}>
                  <div className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">{t("messaging.details.noLinks")}</div>
                </DetailSection>

                <DetailSection title={t("messaging.details.privacy")}>
                  <div className="space-y-2 text-sm">
                    <button type="button" className="flex h-10 w-full items-center justify-between rounded-md px-2 text-left hover:bg-muted" onClick={() => setBlockOpen(true)}>
                      <span>{t("messaging.details.block")}</span>
                    </button>
                    <button type="button" className="flex h-10 w-full items-center justify-between rounded-md px-2 text-left text-destructive hover:bg-destructive/10" onClick={() => setReportOpen(true)}>
                      <span>{t("messaging.details.report")}</span>
                    </button>
                  </div>
                </DetailSection>
              </div>
            </div>
          </div>
        ) : null}

        {activeConversation && detailOpen ? (
          <aside className="hidden h-full border-l border-border/70 bg-background xl:flex xl:flex-col">
            <div className="border-b border-border/70 p-5 text-center">
              <ParticipantAvatar className="mx-auto size-20" participant={otherParticipant} profiles={profiles} />
              <h3 className="mt-3 text-sm font-semibold">{conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel)}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{otherIsOnline ? t("messaging.details.online") : t("messaging.details.offline")}</p>
            </div>

            <div className="grid grid-cols-4 border-b border-border/70 p-3">
              <DetailButton
                icon={activeConversation.isMuted ? Bell : BellOff}
                label={activeConversation.isMuted ? t("messaging.details.unmute") : t("messaging.details.mute")}
                onClick={() => void toggleParticipant({ mutedUntilUtc: activeConversation.isMuted ? null : futureIso(MUTED_UNTIL_DAYS) })}
              />
              <DetailButton
                icon={Archive}
                label={activeConversation.isArchived ? t("messaging.details.unarchive") : t("messaging.details.archive")}
                onClick={() => void toggleParticipant({ archivedAtUtc: activeConversation.isArchived ? null : new Date().toISOString() }, { openArchives: true })}
              />
              <DetailButton
                icon={Pin}
                label={activeConversation.isPinned ? t("messaging.details.unpin") : t("messaging.details.pin")}
                onClick={() => void toggleParticipant({ pinnedAtUtc: activeConversation.isPinned ? null : new Date().toISOString() })}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex flex-col items-center gap-1 rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="size-5" />
                    <span>{t("messaging.details.more")}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void toggleParticipant({ markUnread: !activeConversation.isMarkedUnread })}>
                    {activeConversation.isMarkedUnread ? t("messaging.details.markRead") : t("messaging.details.markUnread")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setMessages([]);
                    void toggleParticipant({ clearedAtUtc: new Date().toISOString() });
                  }}>
                    {t("messaging.details.clearHistory")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setBlockOpen(true)}>
                    {t("messaging.details.block")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setReportOpen(true)}>
                    {t("messaging.details.report")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-5">
                <DetailSection title={t("messaging.details.shared")}>
                  <div className="grid grid-cols-3 gap-2">
                    <MediaTile icon={ImageIcon} label={t("messaging.media.images")} />
                    <MediaTile icon={FileText} label={t("messaging.media.files")} />
                    <MediaTile icon={Mic} label={t("messaging.media.audio")} />
                  </div>
                </DetailSection>

                <DetailSection title={t("messaging.details.links")}>
                  <div className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">{t("messaging.details.noLinks")}</div>
                </DetailSection>

                <DetailSection title={t("messaging.details.privacy")}>
                  <div className="space-y-2 text-sm">
                    <button type="button" className="flex h-10 w-full items-center justify-between rounded-md px-2 text-left hover:bg-muted" onClick={() => setBlockOpen(true)}>
                      <span>{t("messaging.details.block")}</span>
                    </button>
                    <button type="button" className="flex h-10 w-full items-center justify-between rounded-md px-2 text-left text-destructive hover:bg-destructive/10" onClick={() => setReportOpen(true)}>
                      <span>{t("messaging.details.report")}</span>
                    </button>
                  </div>
                </DetailSection>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messaging.block.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("messaging.block.description", { name: otherProfile?.username ? `@${otherProfile.username}` : conversationTitle(activeConversation, currentUserId, profiles, groupConversationLabel) })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("messaging.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void blockConversationUser()}>{t("messaging.block.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("messaging.report.title")}</DialogTitle>
            <DialogDescription>{t("messaging.report.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={(value) => setReportReason(value as ReportReason)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>{t(`messaging.report.reasons.${reason}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportReason === "Other" ? (
              <Textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder={t("messaging.report.otherPlaceholder")} />
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>{t("messaging.actions.cancel")}</Button>
            <Button type="button" onClick={() => void reportConversation()}>{t("messaging.report.submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReactionPickerDialog
        currentUserId={currentUserId}
        message={reactionTarget}
        onOpenChange={(open) => {
          if (!open) setReactionTarget(null);
        }}
        onPick={(message, emoji) => {
          setReactionTarget(null);
          void reactToMessage(message, emoji);
        }}
        t={t as unknown as (key: string) => string}
      />

      <Dialog open={newMessageOpen} onOpenChange={handleNewMessageDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("messaging.actions.newConversation")}</DialogTitle>
            <DialogDescription>{t("messaging.share.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={newMessageQuery}
                onChange={(event) => setNewMessageQuery(event.target.value)}
                placeholder={t("messaging.share.search")}
                className="pl-9"
              />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {newMessageSearching ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("messaging.status.connecting")}
                </div>
              ) : null}

              {newMessageQuery.trim().length > 0 ? (
                <>
                  {newMessageResults.map((result) => (
                    <NewMessageTargetRow
                      avatarUrl={result.avatarUrl ?? null}
                      disabled={newMessageSending !== null}
                      key={result.id}
                      loading={newMessageSending === result.id}
                      onClick={() => void openConversationFromProfile(result.id, result.username ?? null)}
                      subtitle={result.username ? `@${result.username}` : result.summary}
                      title={result.displayName || result.title}
                    />
                  ))}
                  {!newMessageSearching && newMessageResults.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("messaging.share.empty")}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="px-1 text-xs font-medium uppercase text-muted-foreground">{t("messaging.share.recent")}</p>
                  {newMessageRecent.map((conversation) => {
                    const other = findOtherParticipant(conversation, currentUserId);
                    const profile = other ? profiles[other.userId] : null;
                    return (
                      <NewMessageTargetRow
                        avatarUrl={profile?.avatarUrl ?? null}
                        disabled={newMessageSending !== null}
                        key={conversation.id}
                        loading={newMessageSending === conversation.id}
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          router.replace(`/messages?conversationId=${encodeURIComponent(conversation.id)}`);
                          setNewMessageOpen(false);
                        }}
                        subtitle={profile?.username ? `@${profile.username}` : conversation.id.slice(0, 8)}
                        title={profile?.displayName || profile?.username || conversation.id.slice(0, 8)}
                      />
                    );
                  })}
                  {newMessageRecent.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("messaging.empty.title")}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleNewMessageDialogOpenChange(false)}>
              {t("messaging.actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ConversationButton({
  conversation,
  currentUserId,
  onClick,
  profiles,
  selected,
  groupConversationLabel,
  t,
}: {
  conversation: ConversationSummaryResponse;
  currentUserId: string | null;
  onClick: () => void;
  profiles: Record<string, AccountSummary>;
  selected: boolean;
  groupConversationLabel: string;
  t: (key: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70",
        selected && "bg-muted",
      )}
    >
      <ParticipantAvatar participant={findOtherParticipant(conversation, currentUserId)} profiles={profiles} />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{conversationTitle(conversation, currentUserId, profiles, groupConversationLabel)}</span>
          {conversation.isPinned ? <Pin className="size-3.5 text-muted-foreground" /> : null}
          {conversation.isMuted ? <BellOff className="size-3.5 text-muted-foreground" /> : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{conversationSubtitle(conversation, t)}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="text-[11px] text-muted-foreground">{formatTime(conversation.lastMessageAtUtc ?? conversation.updatedAtUtc)}</span>
        {conversation.unreadCount > 0 ? <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">{conversation.unreadCount}</Badge> : null}
      </span>
    </button>
  );
}

function MessageList({
  activeMatchId,
  currentUserId,
  locale,
  messageRefs,
  messages,
  onReact,
  onRecall,
  onReply,
  plaintext,
  t,
}: {
  activeMatchId: string | null;
  currentUserId: string | null;
  locale: string;
  messageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  messages: MessageResponse[];
  onReact: (message: MessageResponse) => void;
  onRecall: (message: MessageResponse) => Promise<void>;
  onReply: (message: MessageResponse) => void;
  plaintext: Record<string, string>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const dateKey = new Date(message.createdAtUtc).toDateString();
        const previousDateKey = index > 0 ? new Date(messages[index - 1]!.createdAtUtc).toDateString() : "";
        const showDate = dateKey !== previousDateKey;
        const outgoing = message.senderUserId === currentUserId;
        const text = messageTextPreview(message, plaintext, t);
        const activeMatch = message.id === activeMatchId;
        return (
          <div
            key={message.id}
            ref={(node) => {
              messageRefs.current[message.id] = node;
            }}
          >
            {showDate ? (
              <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                <span>{formatDate(message.createdAtUtc, locale)}</span>
              </div>
            ) : null}
            <div className={cn("flex items-end gap-2", outgoing ? "justify-end" : "justify-start")}>
              {!outgoing ? (
                <Avatar className="size-7">
                  <DefaultAvatar />
                </Avatar>
              ) : null}
              <div className={cn("flex max-w-[min(32rem,82%)] flex-col", outgoing && "items-end")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "cursor-pointer rounded-2xl px-4 py-2.5 text-left text-sm leading-5 shadow-sm transition",
                        outgoing
                          ? "rounded-br-md bg-foreground text-background"
                          : "rounded-bl-md border border-border/70 bg-background text-foreground",
                        activeMatch && "ring-2 ring-amber-400 ring-offset-2 ring-offset-muted/20",
                      )}
                    >
                      {message.replyPreview ? (
                        <button
                          type="button"
                          className={cn(
                            "mb-2 block w-full rounded-md border-l-2 px-3 py-2 text-left text-xs opacity-90",
                            outgoing ? "border-background/70 bg-background/15" : "border-foreground/30 bg-muted/70",
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            messageRefs.current[message.replyPreview!.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        >
                          <span className="block text-[11px] font-semibold uppercase">{t("messaging.actions.reply")}</span>
                          <span className="line-clamp-2">{messageTextPreview(message.replyPreview, plaintext, t)}</span>
                        </button>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words select-text">{text}</p>
                      {message.isEdited ? <span className="mt-1 block text-[11px] opacity-70">{t("messaging.message.edited")}</span> : null}
                      {message.reactions.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.reactions.map((reaction) => (
                            <span key={`${reaction.userId}-${reaction.emoji}`} className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
                              {reaction.emoji}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={outgoing ? "end" : "start"} className="w-44">
                    <DropdownMenuItem onClick={() => onReply(message)}>
                      <Reply className="size-4" />
                      {t("messaging.actions.reply")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReact(message)}>
                      <Smile className="size-4" />
                      {t("messaging.actions.react")}
                    </DropdownMenuItem>
                    {outgoing && canRecall(message) ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => void onRecall(message)}>
                          <Trash2 className="size-4" />
                          {t("messaging.actions.recall")}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className={cn("mt-1 flex items-center gap-1 text-[11px] text-muted-foreground", outgoing && "justify-end")}>
                  <span>{formatTime(message.createdAtUtc)}</span>
                  {outgoing ? deliveryIcon(message) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReactionPickerDialog({
  currentUserId,
  message,
  onOpenChange,
  onPick,
  t,
}: {
  currentUserId: string | null;
  message: MessageResponse | null;
  onOpenChange: (open: boolean) => void;
  onPick: (message: MessageResponse, emoji: string) => void;
  t: (key: string) => string;
}) {
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT;

  return (
    <Dialog open={Boolean(message)} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[92vh] overflow-hidden sm:max-w-[30rem]">
        <DialogHeader>
          <DialogTitle>{t("messaging.reactions.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {MESSAGE_REACTIONS.map((emoji) => {
            const selected = message?.reactions.some((reaction) => reaction.userId === currentUserId && reaction.emoji === emoji);
            return (
              <Button
                type="button"
                key={emoji}
                variant={selected ? "secondary" : "outline"}
                rounded="full"
                className="size-11 px-0 text-xl"
                onClick={() => {
                  if (message) onPick(message, emoji);
                }}
              >
                {emoji}
              </Button>
            );
          })}
        </div>
        <EmojiPicker
          className="!rounded-lg !border-border"
          open={Boolean(message)}
          theme={pickerTheme}
          width="100%"
          height={360}
          lazyLoadEmojis
          previewConfig={{ showPreview: false }}
          searchDisabled={false}
          onEmojiClick={(emojiData) => {
            if (message) onPick(message, emojiData.emoji);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DetailButton({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon className="size-5" />
      <span>{label}</span>
    </button>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function MediaTile({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button type="button" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-border/70 bg-muted/40 text-xs text-muted-foreground hover:bg-muted">
      <Icon className="size-5" />
      <span>{label}</span>
    </button>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function NewMessageTargetRow({
  avatarUrl,
  disabled,
  loading,
  onClick,
  subtitle,
  title,
}: {
  avatarUrl: string | null;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-muted disabled:opacity-60"
    >
      <Avatar className="size-10">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
        {title ? <AvatarFallback>{title.slice(0, 1).toUpperCase()}</AvatarFallback> : <DefaultAvatar />}
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Send className="size-4 text-muted-foreground" />}
    </button>
  );
}

function ParticipantAvatar({
  className,
  participant,
  profiles,
}: {
  className?: string;
  participant: ConversationParticipantResponse | null;
  profiles: Record<string, AccountSummary>;
}) {
  const profile = participant ? profiles[participant.userId] : null;
  const label = profile?.displayName ?? profile?.username ?? "";
  return (
    <Avatar className={cn("size-11", className)}>
      {profile?.avatarUrl ? <AvatarImage alt={label} src={profile.avatarUrl} /> : null}
      {label ? <AvatarFallback>{label.slice(0, 1).toUpperCase()}</AvatarFallback> : <DefaultAvatar />}
    </Avatar>
  );
}

type ParticipantUpdate = {
  mutedUntilUtc?: string | null;
  archivedAtUtc?: string | null;
  pinnedAtUtc?: string | null;
  markUnread?: boolean;
  clearedAtUtc?: string | null;
  notificationSoundEnabled?: boolean;
};

function buildParticipantPayload(conversation: ConversationSummaryResponse, currentUserId: string | null, update: ParticipantUpdate) {
  const viewer = findViewerParticipant(conversation, currentUserId);
  return {
    mutedUntilUtc: Object.hasOwn(update, "mutedUntilUtc") ? update.mutedUntilUtc : conversation.isMuted ? futureIso(MUTED_UNTIL_DAYS) : null,
    archivedAtUtc: Object.hasOwn(update, "archivedAtUtc") ? update.archivedAtUtc : conversation.isArchived ? new Date().toISOString() : null,
    pinnedAtUtc: Object.hasOwn(update, "pinnedAtUtc") ? update.pinnedAtUtc : conversation.isPinned ? new Date().toISOString() : null,
    markUnread: update.markUnread ?? conversation.isMarkedUnread,
    clearedAtUtc: Object.hasOwn(update, "clearedAtUtc") ? update.clearedAtUtc : viewer?.lastReadAtUtc ?? null,
    notificationSoundEnabled: update.notificationSoundEnabled ?? viewer?.notificationSoundEnabled ?? true,
    nickname: viewer?.nickname ?? null,
    themeKey: viewer?.themeKey ?? null,
    backgroundKey: viewer?.backgroundKey ?? null,
  };
}

function conversationTitle(
  conversation: ConversationSummaryResponse | null,
  currentUserId: string | null,
  profiles: Record<string, AccountSummary>,
  groupConversationLabel: string,
) {
  if (!conversation) return "";
  if (conversation.kind === "Group" || conversation.kind === 2) return groupConversationLabel;
  const other = findOtherParticipant(conversation, currentUserId);
  if (!other) return conversation.id.slice(0, 8);
  const profile = profiles[other.userId];
  return profile?.displayName || (profile?.username ? `@${profile.username}` : `@${other.userId.slice(0, 8)}`);
}

function conversationSubtitle(conversation: ConversationSummaryResponse, t: (key: string) => string) {
  if (conversation.requestStatus === "Pending" || conversation.requestStatus === 1) return t("messaging.search.request");
  if (conversation.lastMessageAtUtc) return t("messaging.search.message");
  return t("messaging.search.empty");
}

function findViewerParticipant(conversation: ConversationSummaryResponse, currentUserId: string | null) {
  return conversation.participants.find((participant) => participant.userId === currentUserId) ?? conversation.participants[0] ?? null;
}

function findOtherParticipant(conversation: ConversationSummaryResponse, currentUserId: string | null) {
  return conversation.participants.find((participant) => participant.userId !== currentUserId) ?? null;
}

function messageTextPreview(message: MessageResponse, plaintext: Record<string, string>, t: (key: string) => string) {
  if (message.recalledAtUtc) return t("messaging.message.recalled");
  if (plaintext[message.id]) return plaintext[message.id];
  const plainText = readPlainMessageText(message);
  if (plainText) return plainText;
  const data = readAssociatedData(message.associatedDataJson);
  if (data?.share?.kind === "post") return t("messaging.message.postShare");
  if (message.attachments.length > 0) return t("messaging.message.attachment");
  return t("messaging.message.unavailable");
}

function deliveryIcon(message: MessageResponse) {
  const recipientReceipts = message.receipts.filter((receipt) => receipt.userId !== message.senderUserId);
  const hasRead = recipientReceipts.some((receipt) => receipt.readAtUtc);
  const hasDelivered = recipientReceipts.some((receipt) => receipt.deliveredAtUtc);
  if (hasRead) return <CheckCheck className="size-3.5 text-sky-500" />;
  if (hasDelivered) return <CheckCheck className="size-3.5" />;
  if (String(message.state).toLowerCase() === "failed") return <X className="size-3.5 text-destructive" />;
  return <Check className="size-3.5" />;
}

function canRecall(message: MessageResponse) {
  return !message.recalledAtUtc && new Date(message.recallUntilUtc).getTime() > Date.now();
}

function createOptimisticMessage(input: {
  associatedDataJson: string;
  body: MessageResponse["body"];
  clientMessageId: string;
  conversationId: string;
  kind: MessageResponse["kind"];
  replyToMessageId: string | null;
  replyPreview: MessageResponse | null;
  senderDeviceId: string;
  senderUserId: string;
}): MessageResponse {
  const now = new Date();
  return {
    id: input.clientMessageId,
    conversationId: input.conversationId,
    senderUserId: input.senderUserId,
    senderDeviceId: input.senderDeviceId,
    clientMessageId: input.clientMessageId,
    kind: input.kind,
    state: "Sent",
    body: input.body,
    attachments: [],
    reactions: [],
    receipts: [],
    replyToMessageId: input.replyToMessageId,
    replyPreview: input.replyPreview,
    isForwarded: false,
    isEdited: false,
    isPinned: false,
    viewOnce: false,
    expiresAtUtc: null,
    createdAtUtc: now.toISOString(),
    sentAtUtc: now.toISOString(),
    editedAtUtc: null,
    recalledAtUtc: null,
    editUntilUtc: new Date(now.getTime() + 600_000).toISOString(),
    recallUntilUtc: new Date(now.getTime() + 600_000).toISOString(),
    associatedDataJson: input.associatedDataJson,
  };
}

function createAttachmentRequest(file: File, localId: string) {
  return {
    kind: file.type.startsWith("image/") ? 1 : 4,
    storageKey: `messaging/${localId}`,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    width: null,
    height: null,
    durationMs: null,
    waveformJson: null,
    encryptedFileKey: randomBase64(32),
    keyNonce: randomBase64(12),
    keyId: localId,
    viewOnce: false,
  };
}

function randomBase64(size: number) {
  const value = crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function sortConversations(left: ConversationSummaryResponse, right: ConversationSummaryResponse) {
  if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
  return new Date(right.lastMessageAtUtc ?? right.updatedAtUtc).getTime() - new Date(left.lastMessageAtUtc ?? left.updatedAtUtc).getTime();
}

function upsertConversation(items: ConversationSummaryResponse[], updated: ConversationSummaryResponse) {
  const exists = items.some((item) => item.id === updated.id);
  return exists ? items.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...items];
}

function upsertMessage(items: MessageResponse[], updated: MessageResponse) {
  const existingIndex = items.findIndex((item) => item.id === updated.id || item.clientMessageId === updated.clientMessageId);
  if (existingIndex < 0) {
    return [...items, updated].sort(sortMessages);
  }

  const next = [...items];
  next[existingIndex] = updated;
  return next.sort(sortMessages);
}

function sortMessages(left: MessageResponse, right: MessageResponse) {
  return new Date(left.createdAtUtc).getTime() - new Date(right.createdAtUtc).getTime();
}

function migratePlaintextForSavedMessage(current: Record<string, string>, message: MessageResponse) {
  if (current[message.id] || !current[message.clientMessageId]) {
    return current;
  }

  const next = { ...current, [message.id]: current[message.clientMessageId]! };
  delete next[message.clientMessageId];
  return next;
}

function updateReadReceipt(items: MessageResponse[], receipt: MessagingReadReceiptEvent, currentUserId: string | null) {
  if (!receipt.messageId) return items;
  return items.map((message) => {
    if (message.id !== receipt.messageId) return message;
    if (receipt.userId === currentUserId || receipt.userId === message.senderUserId) return message;
    const receiptIndex = message.receipts.findIndex((item) => item.userId === receipt.userId);
    if (receiptIndex < 0) {
      return {
        ...message,
        receipts: [...message.receipts, { userId: receipt.userId, deliveredAtUtc: null, readAtUtc: receipt.readAtUtc }],
      };
    }

    const receipts = [...message.receipts];
    receipts[receiptIndex] = { ...receipts[receiptIndex]!, readAtUtc: receipt.readAtUtc };
    return { ...message, receipts };
  });
}

function setPresenceUser(
  userId: string,
  isOnline: boolean,
  setOnlineUserIds: (updater: (current: string[]) => string[]) => void,
) {
  setOnlineUserIds((current) => {
    if (!isOnline) {
      return current.filter((item) => item !== userId);
    }

    return current.includes(userId) ? current : [...current, userId];
  });
}

function isUserOnline(userId: string | null, onlineUserIds: string[]) {
  return Boolean(userId && onlineUserIds.includes(userId));
}

function setTypingUser(
  userId: string,
  isTyping: boolean,
  setTypingUserIds: (updater: (current: string[]) => string[]) => void,
  timers: Map<string, number>,
) {
  const existingTimer = timers.get(userId);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    timers.delete(userId);
  }

  if (!isTyping) {
    setTypingUserIds((current) => current.filter((item) => item !== userId));
    return;
  }

  setTypingUserIds((current) => current.includes(userId) ? current : [...current, userId]);
  timers.set(userId, window.setTimeout(() => {
    timers.delete(userId);
    setTypingUserIds((current) => current.filter((item) => item !== userId));
  }, TYPING_TIMEOUT_MS));
}

function publishTyping(
  isTyping: boolean,
  conversationId: string | null,
  connection: RealtimeConnection | null,
  idleTimerRef: MutableRefObject<number | null>,
) {
  if (!conversationId || !connection) return;
  void connection.invoke("Typing", conversationId, isTyping).catch(() => undefined);

  if (idleTimerRef.current) {
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }

  if (isTyping) {
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null;
      void connection.invoke("Typing", conversationId, false).catch(() => undefined);
    }, TYPING_IDLE_MS);
  }
}

function typingLabel(
  participants: ConversationParticipantResponse[],
  profiles: Record<string, AccountSummary>,
  currentUserId: string | null,
  someoneLabel: string,
) {
  const names = participants
    .map((participant) => {
      const profile = profiles[participant.userId];
      return profile?.displayName || profile?.username || (participant.userId === currentUserId ? "" : participant.userId.slice(0, 8));
    })
    .filter(Boolean);

  return names.slice(0, 2).join(", ") || someoneLabel;
}

function getMessagingHubUrl() {
  const configuredHubUrl = process.env.NEXT_PUBLIC_MESSAGING_HUB_URL?.trim();
  if (configuredHubUrl) return configuredHubUrl;

  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_API_BASE_URL?.trim();
  if (gatewayUrl) return new URL("/hubs/messaging", gatewayUrl).toString();

  if (window.location.hostname === "localhost" && window.location.port === "3000") {
    return "http://localhost:5030/hubs/messaging";
  }

  return "/hubs/messaging";
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

async function markRead(conversationId: string, lastReadMessageId: string) {
  await fetch(`/api/messaging/conversations/${conversationId}/read`, {
    body: JSON.stringify({ lastReadMessageId }),
    cache: "no-store",
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}

function futureIso(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function normalizeConversationResponse(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const id = readStringValue(source, "id", "Id");
  return id ? { id } : null;
}

function readStringValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function dedupeUserSearchResults(items: SearchResultItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.username?.trim().toLowerCase() || item.id.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
