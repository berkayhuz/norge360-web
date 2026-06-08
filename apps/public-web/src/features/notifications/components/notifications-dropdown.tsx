"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import { NotificationListItem } from "@/features/notifications/components/notification-list-item";
import { getNotificationSummary, listNotifications } from "@/features/notifications/lib/client";
import type { InAppNotification } from "@/features/notifications/lib/types";

type NotificationsDropdownProps = {
  className?: string;
};

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const t = useTranslations("public-web");
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const summary = await getNotificationSummary();
      setUnreadCount(summary.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadDropdown = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await listNotifications({ markAsSeen: true, page: 1, pageSize: 5 });
      setItems(page.items);
      setUnreadCount(0);
      window.dispatchEvent(new Event("norge360:notifications-seen"));
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSummary]);

  useEffect(() => {
    function onSeen() {
      setUnreadCount(0);
    }

    window.addEventListener("norge360:notifications-seen", onSeen);
    return () => window.removeEventListener("norge360:notifications-seen", onSeen);
  }, []);

  useEffect(() => {
    if (open) {
      const timeoutId = window.setTimeout(() => void loadDropdown(), 0);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [loadDropdown, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          rounded="full"
          border="none"
          className={cn("relative text-muted-foreground hover:text-foreground", className)}
          aria-label={t("notifications.title")}
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span
              aria-label={t("notifications.unseenBadge")}
              className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={14} className="w-[min(92vw,24rem)] rounded-lg p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span>{t("notifications.title")}</span>
          <Link className="text-xs font-medium text-primary hover:underline" href="/notifications">
            {t("notifications.viewAll")}
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[28rem] overflow-y-auto py-2">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {!loading && error ? (
            <p className="px-4 py-8 text-center text-sm text-destructive">{t("notifications.loadError")}</p>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="space-y-1">
              {items.map((item) => (
                <NotificationListItem compact key={item.id} notification={item} />
              ))}
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
