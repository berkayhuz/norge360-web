"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { History, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";

import {
  clearSearchHistory,
  readSearchHistory,
  subscribeSearchHistory,
  type SearchHistoryEntry,
} from "@/features/search/lib/search-history";

export function SearchHistorySettingsPanel() {
  const t = useTranslations("public-web");
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => readSearchHistory());

  useEffect(() => {
    return subscribeSearchHistory(() => setHistory(readSearchHistory()));
  }, []);

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="size-5 text-muted-foreground" />
          {t("searchHistory.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("searchHistory.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <Link href={entry.href} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                  <Avatar className="size-10 shrink-0">
                    {entry.avatarUrl ? <AvatarImage alt={entry.title} src={entry.avatarUrl} /> : null}
                    <AvatarFallback>{entry.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.subtitle ?? entry.href}</p>
                    <p className="text-xs text-muted-foreground">
                    {t("searchHistory.savedAt", {
                      date: new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.visitedAtUtc)),
                    })}
                  </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("searchHistory.empty")}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => clearSearchHistory()}
            disabled={history.length === 0}
          >
            <Trash2 className="size-4" />
            {t("searchHistory.clearAll")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
