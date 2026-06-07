"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Bookmark,
  Compass,
  FileText,
  Home,
  PlusCircle,
  Settings,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/primitives/button";
import { cn } from "@workspace/ui/lib/utils";

import { CommunityFooter } from "@/features/community/components/community-footer";
import { CommunityPopularUsersWidget } from "@/features/discovery/components/community-popular-users-widget";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";

const sidebarButtonClassName = "flex h-10 text-[15px] w-full items-center justify-start gap-2 border-none px-4 hover:bg-muted";
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

type CommunityPageScaffoldProps = {
  children: ReactNode;
  publishHref?: string;
  onPublishClick?: () => void;
};

export function CommunityPageScaffold({ children, onPublishClick, publishHref = "/feed" }: CommunityPageScaffoldProps) {
  const t = useTranslations("public-web");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const authHref = isAuthenticated ? null : getAuthWebLoginUrl();
  const profileHref = isAuthenticated && myUsername ? `/${encodeURIComponent(myUsername)}` : authHref ?? "/";
  const navigationItems = [
    { href: "/", icon: Home, label: t("community.scaffold.home") },
    { href: "/explore-feed", icon: Compass, label: t("community.scaffold.discover") },
    { href: authHref ?? "/notifications", icon: Bell, label: t("community.scaffold.notifications") },
    {
      href: isAuthenticated ? publishHref : authHref ?? "",
      icon: PlusCircle,
      label: t("community.post.publish"),
      onClick: isAuthenticated ? onPublishClick : undefined,
    },
    { href: profileHref, icon: User, label: t("community.scaffold.profile") },
    { href: authHref ?? "/bookmarks", icon: Bookmark, label: t("community.scaffold.bookmarks") },
    { href: authHref ?? "/settings", icon: Settings, label: t("community.scaffold.settings") },
    { href: "/privacy-policy", icon: ShieldCheck, label: t("community.scaffold.privacyPolicy") },
    { href: "/terms-of-service", icon: FileText, label: t("community.scaffold.termsOfService") },
  ] as const;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await getClientAuthSessionStatus();
        if (!cancelled) {
          setIsAuthenticated(response.authenticated);
        }

        if (response.authenticated) {
          const profileResponse = await fetch("/api/accounts/profiles/me", {
            cache: "no-store",
            credentials: "include",
          });
          if (profileResponse.ok) {
            const profile = (await profileResponse.json()) as { username?: string | null };
            if (!cancelled) {
              setMyUsername(typeof profile.username === "string" ? profile.username : null);
            }
          }
        } else if (!cancelled) {
          setMyUsername(null);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setMyUsername(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function renderSidebarItem({
    href,
    icon: Icon,
    label,
    onClick,
    toneClassName,
  }: {
    href: string;
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    toneClassName: string;
  }) {
    const shared = (
      <>
        <Icon className={cn("size-5 shrink-0", toneClassName)} />
        {label}
      </>
    );

    if (onClick) {
      return (
        <Button
          key={label}
          type="button"
          onClick={onClick}
          variant="outline"
          rounded="2xl"
          className={`${sidebarButtonClassName} cursor-pointer`}
        >
          {shared}
        </Button>
      );
    }

    return (
      <Button key={label} asChild variant="outline" rounded="2xl" className={sidebarButtonClassName}>
        <Link href={href}>{shared}</Link>
      </Button>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 lg:px-2">
      <div className="hidden lg:block sticky top-18 h-fit w-full self-start col-span-1">
        <div className="flex flex-col space-y-2 pt-4">
          {navigationItems.map((item, index) =>
            renderSidebarItem({
              ...item,
              toneClassName: sidebarIconToneClasses[index % sidebarIconToneClasses.length],
            }),
          )}
        </div>
      </div>

      <div className="relative col-span-4 block w-full lg:col-span-2">{children}</div>

      <div className="hidden lg:block sticky top-18 h-fit w-full self-start col-span-1">
        <div className="pt-4 space-y-4">
          <CommunityPopularUsersWidget />
          <CommunityFooter />
        </div>
      </div>
    </div>
  );
}
