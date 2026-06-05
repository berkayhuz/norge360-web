"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, Loader2, Search, X } from "lucide-react";

import type { SearchResultItem } from "@workspace/search";
import { normalizeSearchSuggestResponse } from "@workspace/search";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/forms/input";
import { cn } from "@workspace/ui/lib/utils";

const MAX_RESULTS = 8;

export function HeaderSearch() {
  const t = useTranslations("navigation");
  const router = useRouter();
  const desktopRootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const active = desktopOpen || mobileOpen;
  const trimmedQuery = query.trim();
  const visibleItems = useMemo(() => items.slice(0, MAX_RESULTS), [items]);

  useEffect(() => {
    if (!active) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    if (trimmedQuery.length === 0) {
      setItems([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}`, {
          cache: "no-store",
          method: "GET",
        });
        const data = await response.json().catch(() => null);
        const normalized = normalizeSearchSuggestResponse(data);
        setItems(normalized?.items ?? []);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [active, trimmedQuery]);

  useEffect(() => {
    if (!desktopOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (desktopRootRef.current?.contains(target)) return;
      setDesktopOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [desktopOpen]);

  function openDesktopSearch() {
    if (trimmedQuery.length > 0) {
      setDesktopOpen(true);
    }
  }

  function openMobileSearch() {
    setMobileOpen(true);
  }

  function closeSearch() {
    setDesktopOpen(false);
    setMobileOpen(false);
  }

  function onSelectItem(item: SearchResultItem) {
    closeSearch();
    setQuery("");
    router.push(item.url || "/");
  }

  const emptyState = useMemo(() => {
    if (isLoading) return "Searching...";
    if (trimmedQuery.length === 0) return "Start typing to search";
    return "No results";
  }, [isLoading, trimmedQuery.length]);

  const desktopSearchField = (
    <div className="relative w-full" ref={desktopRootRef}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-border/70 bg-muted px-4 text-sm transition-shadow"
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setDesktopOpen(nextValue.trim().length > 0);
          }}
          onFocus={openDesktopSearch}
          placeholder={t("search")}
          className="min-h-0 bg-muted dark:bg-muted flex-1 border-0 bg-muted p-0 text-sm leading-none shadow-none rounded-none outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-0"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            rounded="full"
            border="none"
            className="text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setItems([]);
              setDesktopOpen(false);
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {desktopOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-[28px] border border-border/70 bg-popover">
          <div className="max-h-[32rem] overflow-y-auto p-2">
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("search")}</p>
              {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            </div>

            {!isLoading && visibleItems.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                {emptyState}
              </div>
            ) : null}

            <div className="space-y-1">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelectItem(item)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {item.avatarUrl ? (
                      <Avatar className="size-10">
                        <AvatarImage src={item.avatarUrl} alt={item.title} />
                        <AvatarFallback>{item.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Search className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      {item.isVerified ? <BadgeCheck className="size-4 shrink-0 text-sky-500" /> : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.summary || item.username ? item.summary || `@${item.username}` : item.type}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="hidden w-full px-4 md:block">{desktopSearchField}</div>

      <div className="md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          rounded="full"
          border="none"
          className="text-muted-foreground hover:bg-transparent hover:text-foreground"
          aria-label={t("search")}
          onClick={openMobileSearch}
        >
          <Search className="size-5" />
        </Button>

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent
            showCloseButton
            className="top-0 start-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-background p-4 shadow-none"
          >
            <DialogHeader className="pb-1">
              <DialogTitle className="sr-only">{t("search")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-8">
              <div className="flex items-center gap-3 rounded-full border border-border/70 bg-muted/35 px-4 py-2.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                  placeholder={t("search")}
                  className="h-9 min-h-0 flex-1 border-0 bg-muted/55 p-0 text-sm leading-none shadow-none outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-0"
                />
                {query ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    rounded="full"
                    border="none"
                    className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-border/70 bg-popover p-2">
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("search")}</p>
                  {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>

                {!isLoading && visibleItems.length === 0 ? (
                  <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                    {emptyState}
                  </div>
                ) : null}

                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {item.avatarUrl ? (
                          <Avatar className="size-10">
                            <AvatarImage src={item.avatarUrl} alt={item.title} />
                            <AvatarFallback>{item.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Search className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          {item.isVerified ? <BadgeCheck className="size-4 shrink-0 text-sky-500" /> : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.summary || item.username ? item.summary || `@${item.username}` : item.type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
