"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";

import { NotificationListItem } from "@/features/notifications/components/notification-list-item";
import { listNotifications } from "@/features/notifications/lib/client";
import type { InAppNotification, NotificationsPage } from "@/features/notifications/lib/types";

const PAGE_SIZE = 20;

type NotificationsPageClientProps = {
  initialPage: NotificationsPage | null;
};

export function NotificationsPageClient({ initialPage }: NotificationsPageClientProps) {
  const t = useTranslations("public-web");
  const [items, setItems] = useState<InAppNotification[]>(initialPage?.items ?? []);
  const [page, setPage] = useState(initialPage?.page ?? 1);
  const [total, setTotal] = useState(initialPage?.total ?? 0);
  const [loading, setLoading] = useState(!initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(false);
    }

    try {
      const result = await listNotifications({
        markAsSeen: !append,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      setItems((current) => append ? dedupeNotifications([...current, ...result.items]) : result.items);
      setPage(result.page);
      setTotal(result.total);
      if (!append) {
        window.dispatchEvent(new Event("norge360:notifications-seen"));
      }
    } catch {
      if (!append) {
        setItems([]);
        setError(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (initialPage) {
      setItems(initialPage.items);
      setPage(initialPage.page);
      setTotal(initialPage.total);
      setLoading(false);
      setError(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => void loadPage(1, false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [initialPage, loadPage]);

  const hasMore = items.length < total;

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex min-h-60 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading && error ? (
        <p className="rounded-lg border border-destructive/30 px-4 py-6 text-center text-sm text-destructive">
          {t("notifications.loadError")}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-lg border border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          {t("notifications.empty")}
        </p>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <NotificationListItem key={item.id} notification={item} />
          ))}
        </div>
      ) : null}

      {hasMore && !loading ? (
        <div className="flex justify-center pt-2">
          <Button
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, true)}
            type="button"
            variant="outline"
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("notifications.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function dedupeNotifications(items: InAppNotification[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
