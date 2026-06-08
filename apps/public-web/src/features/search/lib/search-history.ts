"use client";

import type { SearchResultItem } from "@workspace/search";

export type SearchHistoryEntry = {
  id: string;
  profileId: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  href: string;
  visitedAtUtc: string;
};

const STORAGE_KEY = "norge360.searchHistory";
const MAX_HISTORY_ITEMS = 10;
const HISTORY_CHANGED_EVENT = "norge360-search-history-changed";

type HistoryListener = () => void;

const listeners = new Set<HistoryListener>();

export function readSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is SearchHistoryEntry => entry !== null)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function addSearchHistoryEntry(item: SearchResultItem) {
  if (typeof window === "undefined" || item.type !== "user") {
    return;
  }

  const profileId = item.id.trim();
  const href = item.url.trim();
  if (!profileId || !href) {
    return;
  }

  const next = [
    {
      id: crypto.randomUUID(),
      profileId,
      title: (item.displayName ?? item.title).trim(),
      subtitle: item.username ? `@${item.username.trim()}` : item.summary?.trim() || null,
      avatarUrl: item.avatarUrl?.trim() || null,
      href,
      visitedAtUtc: new Date().toISOString(),
    },
    ...readSearchHistory().filter((entry) => entry.profileId !== profileId),
  ].slice(0, MAX_HISTORY_ITEMS);

  writeSearchHistory(next);
}

export function removeSearchHistoryEntry(entryId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const next = readSearchHistory().filter((item) => item.id !== entryId);
  writeSearchHistory(next);
}

export function clearSearchHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  notifyHistoryListeners();
}

export function subscribeSearchHistory(listener: HistoryListener) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };
  const onCustomChange = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(HISTORY_CHANGED_EVENT, onCustomChange as EventListener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HISTORY_CHANGED_EVENT, onCustomChange as EventListener);
  };
}

function writeSearchHistory(entries: SearchHistoryEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  notifyHistoryListeners();
}

function notifyHistoryListeners() {
  for (const listener of listeners) {
    listener();
  }

  window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
}

function normalizeEntry(raw: unknown): SearchHistoryEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const profileId = typeof source.profileId === "string" ? source.profileId.trim() : "";
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const href = typeof source.href === "string" ? source.href.trim() : "";
  if (!profileId || !title || !href) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id : crypto.randomUUID(),
    profileId,
    title,
    subtitle: typeof source.subtitle === "string" && source.subtitle.trim().length > 0 ? source.subtitle.trim() : null,
    avatarUrl: typeof source.avatarUrl === "string" && source.avatarUrl.trim().length > 0 ? source.avatarUrl.trim() : null,
    href,
    visitedAtUtc:
      typeof source.visitedAtUtc === "string" && !Number.isNaN(Date.parse(source.visitedAtUtc))
        ? source.visitedAtUtc
        : new Date().toISOString(),
  };
}
