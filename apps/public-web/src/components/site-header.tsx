"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CircleUserRound, Menu } from "lucide-react";

import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { cn } from "@workspace/ui/lib/utils";

import { LocaleSelect } from "@/components/locale-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderSearch } from "@/features/search/components/header-search";
import { getClientAuthSessionStatus } from "@/lib/auth/session-status-client";
import { getAuthWebLoginUrl, getAuthWebRegisterUrl } from "@/lib/auth-web-url";

const communities = [
  { href: "/communities", labelKey: "communitiesOverview" },
  { href: "/communities/trending", labelKey: "communitiesTrending" },
  { href: "/communities/new", labelKey: "communitiesCreate" },
] as const;

const cities = [
  { href: "/cities", labelKey: "citiesOverview" },
  { href: "/cities/guides", labelKey: "citiesGuides" },
  { href: "/cities/map", labelKey: "citiesMap" },
] as const;

const primaryLinks = [
  { href: "/", labelKey: "home" },
  { href: "/forum", labelKey: "forum" },
] as const;

const iconTriggerClass =
  "inline-flex size-9 items-center justify-center rounded-full border-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const mobileLinkClass =
  "inline-flex h-10 w-full items-center rounded-2xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const mobileAuthLinkClass =
  "inline-flex h-10 w-full items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

export function SiteHeader() {
  const t = useTranslations("navigation");
  const loginHref = getAuthWebLoginUrl();
  const registerHref = getAuthWebRegisterUrl();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sessionResponse = await getClientAuthSessionStatus();
        if (!sessionResponse.authenticated) return;
        if (cancelled) return;
        setIsAuthenticated(true);

        const profileResponse = await fetch("/api/accounts/profiles/me", { cache: "no-store" });
        if (!profileResponse.ok) return;
        const profile = (await profileResponse.json()) as { username?: string; avatarUrl?: string | null };
        if (cancelled) return;
        setMyUsername(typeof profile.username === "string" ? profile.username : null);
        setMyAvatarUrl(typeof profile.avatarUrl === "string" ? profile.avatarUrl : null);
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { body: "{}", method: "POST" });
    window.location.reload();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 text-foreground bg-background">
      <div className="max-w-screen-xl mx-auto w-full h-14 grid grid-cols-4 items-center px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 col-span-1" aria-label="Norge360">
          <Image
            src="/norge360_logo_square_blue_white-6.png"
            alt="Norge360"
            width={112}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <div className="hidden flex-1 justify-center md:flex col-span-2 w-full">
          <HeaderSearch />
        </div>

        <div className="hidden items-center gap-1 md:flex col-span-1 justify-end">
          {isAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              rounded="full"
              border="none"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("notifications")}
            >
              <Bell className="size-4" />
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger className={iconTriggerClass} aria-label={t("accountMenu")}>
              {isAuthenticated ? (
                <Avatar className="size-8">
                  {myAvatarUrl ? <AvatarImage src={myAvatarUrl} alt={myUsername ?? "User"} /> : null}
                  <DefaultAvatar />
                </Avatar>
              ) : (
                <CircleUserRound className="size-5" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={12} className="w-[min(92vw,22rem)] rounded-[28px] p-2">
              <div className="space-y-4 p-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("language")}
                  </p>
                  <LocaleSelect label={t("language")} />
                </div>

                <ThemeToggle darkLabel={t("darkTheme")} lightLabel={t("lightTheme")} />
              </div>

              {isAuthenticated ? (
                <div className="grid gap-1 p-2">
                  <DropdownMenuItem asChild>
                    <Link href={myUsername ? `/${myUsername}` : "/"}>{t("profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile">{t("settings")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout}>{t("logout")}</DropdownMenuItem>
                </div>
              ) : (
                <div className="grid gap-2 p-2">
                  <Button asChild variant="outline" rounded="2xl" className="w-full justify-center">
                    <Link href={loginHref}>{t("login")}</Link>
                  </Button>

                  <Button asChild rounded="2xl" className="w-full justify-center">
                    <Link href={registerHref}>{t("register")}</Link>
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Sheet>
          <SheetTrigger className={cn(iconTriggerClass, "ms-auto md:hidden")} aria-label={t("openMenu")}>
            <Menu className="size-5" />
          </SheetTrigger>

          <SheetContent side="right" className="w-[min(88vw,22rem)] px-4 py-5">
            <SheetHeader className="px-1 pb-3">
              <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
              <Link href="/" className="inline-flex w-fit items-center">
                <Image src="/norge360_logo_svg.svg" alt="Norge360" width={112} height={32} className="h-8 w-auto" />
              </Link>
            </SheetHeader>

            <nav className="flex flex-col gap-2 px-1">
              {primaryLinks.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link href={item.href} className={mobileLinkClass}>
                    {t(item.labelKey)}
                  </Link>
                </SheetClose>
              ))}

              <div className="pt-2">
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("communities")}
                </p>
                <div className="grid gap-1">
                  {communities.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link href={item.href} className={cn(mobileLinkClass, "pl-6")}>
                        {t(item.labelKey)}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("cities")}
                </p>
                <div className="grid gap-1">
                  {cities.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link href={item.href} className={cn(mobileLinkClass, "pl-6")}>
                        {t(item.labelKey)}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <p className="px-3 pb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("preferences")}
                </p>
                <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/35 p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("language")}</p>
                    <LocaleSelect label={t("language")} className="w-full" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t("theme")}</p>
                      <p className="text-xs text-muted-foreground">{t("themeHint")}</p>
                    </div>
                    <ThemeToggle darkLabel={t("darkTheme")} lightLabel={t("lightTheme")} />
                  </div>
                </div>
              </div>
            </nav>

            <SheetFooter className="gap-2 px-1 pt-4">
              {isAuthenticated ? (
                <>
                  <SheetClose asChild>
                    <Link href={myUsername ? `/${myUsername}` : "/"} className={mobileAuthLinkClass}>
                      {t("profile")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/settings/profile" className={mobileAuthLinkClass}>
                      {t("settings")}
                    </Link>
                  </SheetClose>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Link href={loginHref} className={mobileAuthLinkClass}>
                      {t("login")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href={registerHref}
                      className={cn(
                        mobileAuthLinkClass,
                        "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
                      )}
                    >
                      {t("register")}
                    </Link>
                  </SheetClose>
                </>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
