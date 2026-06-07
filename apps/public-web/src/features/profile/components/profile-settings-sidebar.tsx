"use client";

import Link from "next/link";
import { Ban, Bell, Heart, Lock, MessageCircle, Search, Shield, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui/components/primitives/button";
import { cn } from "@workspace/ui/lib/utils";
import { Heading } from "@workspace/ui/components/typography/heading";
import { Input } from "@workspace/ui/components/forms/input";
import { SURFACE_SOFT_CLASS } from "@/lib/surface";

type ProfileSettingsSidebarProps = {
  title: string;
  description: string;
  items: ReadonlyArray<{
    href: string;
    iconKey: "user" | "shield" | "lock" | "messageCircle" | "heart" | "ban" | "bell";
    label: string;
    searchTerms?: readonly string[];
  }>;
};

const sidebarButtonClassName =
  "flex h-10 text-[15px] w-full items-center justify-start gap-2 border-none px-4 hover:bg-muted";

const ICONS = {
  ban: Ban,
  bell: Bell,
  heart: Heart,
  lock: Lock,
  messageCircle: MessageCircle,
  shield: Shield,
  user: User,
} as const;

const sidebarIconToneClasses = [
  "text-sky-500",
  "text-cyan-500",
  "text-teal-500",
  "text-emerald-500",
  "text-lime-500",
  "text-amber-500",
  "text-indigo-500",
  "text-slate-500",
  "text-cyan-400",
] as const;

export function ProfileSettingsSidebar({ description, items, title }: ProfileSettingsSidebarProps) {
  const tNavigation = useTranslations("navigation");
  const [query, setQuery] = useState("");

  const normalizedQuery = normalizeSearchQuery(query);
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }

    const queryTerms = normalizedQuery.split(" ").filter(Boolean);
    return items.filter((item) => matchesSearch(item, queryTerms, normalizedQuery));
  }, [items, normalizedQuery]);

  const hasFilter = normalizedQuery.length > 0;

  return (
    <div className="hidden lg:block sticky top-18 h-fit w-full self-start col-span-1">
      <div className="space-y-4">
        <div>
          <Heading level={4} className="truncate">{title}</Heading>
          <p className="sr-only">{description}</p>
        </div>

        <div className="flex flex-col space-y-2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-full border border-border/70 px-4 text-sm transition-shadow",
              SURFACE_SOFT_CLASS,
            )}
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              aria-label={tNavigation("search")}
              placeholder={tNavigation("search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(
                "min-h-0 flex-1 rounded-none border-0 p-0 text-sm leading-none shadow-none outline-none ring-0 placeholder:text-muted-foreground/80 focus-visible:ring-0",
                SURFACE_SOFT_CLASS,
              )}
            />
            {hasFilter ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                rounded="full"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery("")}
                aria-label={tNavigation("clearSearch")}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const Icon = ICONS[item.iconKey];
              return (
                <Button
                  key={item.href}
                  asChild
                  variant="outline"
                  rounded="2xl"
                  className={sidebarButtonClassName}
                >
                  <Link href={item.href}>
                    <Icon className={cn("size-5 shrink-0", sidebarIconToneClasses[index % sidebarIconToneClasses.length])} />
                    {item.label}
                  </Link>
                </Button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {tNavigation("searchNoResults")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function matchesSearch(
  item: {
    label: string;
    searchTerms?: readonly string[];
  },
  queryTerms: string[],
  normalizedQuery: string,
) {
  const searchable = normalizeSearchQuery([item.label, ...(item.searchTerms ?? [])].join(" "));
  if (!searchable) {
    return false;
  }

  if (searchable.includes(normalizedQuery)) {
    return true;
  }

  return queryTerms.every((term) => searchable.includes(term));
}

function normalizeSearchQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
