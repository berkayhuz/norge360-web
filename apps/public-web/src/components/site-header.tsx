"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  EllipsisVertical,
  Eye,
  Languages,
  LifeBuoy,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings2,
  SunMedium,
  UserRound,
} from "lucide-react";

import { getLocaleMetadata, getSupportedLocales, resolveLocale } from "@workspace/i18n";
import { Avatar, AvatarImage, DefaultAvatar } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { NotificationsDropdown } from "@/features/notifications/components/notifications-dropdown";
import { HeaderSearch } from "@/features/search/components/header-search";
import {
  getClientAuthSessionStatus,
  resetClientAuthSessionStatusCache,
} from "@/lib/auth/session-status-client";
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
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const mobileLinkClass =
  "inline-flex h-10 w-full items-center rounded-2xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const mobileAuthLinkClass =
  "inline-flex h-10 w-full items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const LOCALE_COOKIE_NAME = "n360_locale";
const supportedLocales = getSupportedLocales();

const displayModeOptions: ReadonlyArray<{
  value: ThemePreference;
  icon: ComponentType<{ className?: string }>;
  labelKey: "displayModeAutomatic" | "displayModeLight" | "displayModeDark";
}> = [
  { value: "system", icon: Monitor, labelKey: "displayModeAutomatic" },
  { value: "light", icon: SunMedium, labelKey: "displayModeLight" },
  { value: "dark", icon: Moon, labelKey: "displayModeDark" },
] as const;

const localeOptions = supportedLocales.map((locale) => {
  const metadata = getLocaleMetadata(locale);
  return {
    value: locale,
    label: metadata.nativeLabel,
  };
});

function PreferenceRowButton({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      border="none"
      rounded="3xl"
      className={cn(
        "h-12 w-full justify-between px-2.5 text-sm font-normal text-foreground hover:bg-muted/50",
        selected && "bg-muted/60",
      )}
      onClick={onClick}
    >
      <span className={cn("flex min-w-0 items-center", Icon ? "gap-3" : "gap-0")}>
        {Icon ? <Icon className="size-5 shrink-0 text-foreground/80" /> : null}
        <span className="truncate">{label}</span>
      </span>
      {selected ? <Check className="size-5 shrink-0 text-foreground" /> : <span aria-hidden="true" className="size-5 shrink-0" />}
    </Button>
  );
}

export function SiteHeader() {
  const t = useTranslations("navigation");
  const locale = useLocale();
  const brandLabel = t("brandName");
  const currentLocale = resolveLocale(locale) ?? supportedLocales[0];
  const loginHref = getAuthWebLoginUrl();
  const registerHref = getAuthWebRegisterUrl();
  const { theme, setTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [displayModeOpen, setDisplayModeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(theme);
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sessionResponse = await getClientAuthSessionStatus();
        if (!sessionResponse.authenticated) return;
        if (cancelled) return;
        setIsAuthenticated(true);

        const profileResponse = await fetch("/api/accounts/profiles/me", {
          cache: "no-store",
          credentials: "include",
        });
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
    await fetch("/api/auth/logout", {
      body: "{}",
      credentials: "include",
      method: "POST",
    });
    resetClientAuthSessionStatusCache();
    window.location.reload();
  }

  function commitThemeSelection() {
    setTheme(selectedTheme);
    setDisplayModeOpen(false);
  }

  function commitLocaleSelection() {
    setLanguageOpen(false);
    if (selectedLocale === currentLocale) {
      return;
    }

    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(selectedLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  function openDisplayModeDialog() {
    setSelectedTheme(theme);
    setAccountMenuOpen(false);
    setDisplayModeOpen(true);
  }

  function openLanguageDialog() {
    setSelectedLocale(currentLocale);
    setAccountMenuOpen(false);
    setLanguageOpen(true);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background text-foreground">
      <div className="mx-auto grid h-14 w-full max-w-screen-xl grid-cols-4 items-center px-4 lg:px-3 md:h-16">
        <Link href="/" className="col-span-2 md:col-span-1 flex shrink-0 items-center gap-2" aria-label={brandLabel}>
          <Image
            src="/norge360_logo_square_blue_white-6.png"
            alt={brandLabel}
            width={112}
            height={32}
            priority
            style={{ width: "auto" }}
            className="h-8 w-auto"
          />
        </Link>

        <div className="w-full justify-end md:justify-center col-span-2 md:col-span-3 flex gap-2">
          <div className="order-2 md:order-1 w-fit md:w-full flex items-center justify-start">
            <HeaderSearch />
          </div>
          <div className="order-1 md:order-2 w-full max-w-xs flex justify-end items-center gap-2">
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" rounded="2xl" className="w-fit justify-center px-4">
                  <Link href={loginHref}>{t("login")}</Link>
                </Button>

                <Button asChild rounded="2xl" className="w-fit justify-center px-4">
                  <Link href={registerHref}>{t("register")}</Link>
                </Button>
              </div>
            )}

            {isAuthenticated ? <NotificationsDropdown /> : null}

            <DropdownMenu open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
              <DropdownMenuTrigger className={iconTriggerClass} aria-label={t("accountMenu")}>
                {isAuthenticated ? (
                  <Avatar className="size-8">
                    {myAvatarUrl ? <AvatarImage src={myAvatarUrl} alt={myUsername ?? "User"} /> : null}
                    <DefaultAvatar />
                  </Avatar>
                ) : (
                  <EllipsisVertical className="size-5" />
                )}
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={20}
                className="w-[min(92vw,18rem)] overflow-hidden rounded-lg p-0 py-2"
              >
                <div className="space-y-2">
                  {isAuthenticated ? (
                    <>
                      <DropdownMenuItem asChild className="rounded-none">
                        <Link href={myUsername ? `/${myUsername}` : "/"} className="flex w-full items-center gap-2">
                          <UserRound className="size-4" />
                          <span>{t("profile")}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-none">
                        <Link href="/settings/profile" className="flex w-full items-center gap-2">
                          <Settings2 className="size-4" />
                          <span>{t("settings")}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={loginHref} className="flex w-full items-center gap-2 rounded-none">
                          <LogIn className="size-4" />
                          <span>{t("loginOrRegister")}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onSelect={openDisplayModeDialog} className="rounded-none">
                    <Eye className="size-4" />
                    <span>{t("displayMode")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={openLanguageDialog} className="rounded-none">
                    <Languages className="size-4" />
                    <span>{t("languagePreference")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-none">
                    <LifeBuoy className="size-4" />
                    <span>{t("support")}</span>
                  </DropdownMenuItem>
                  {isAuthenticated ? (
                    <>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem className="gap-2 rounded-none" onClick={onLogout}>
                        <LogOut className="size-4" />
                        <span>{t("logout")}</span>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Dialog open={displayModeOpen} onOpenChange={setDisplayModeOpen}>
          <DialogContent
            showCloseButton
            className="gap-0 rounded-[28px] border-0 p-5 shadow-none sm:max-w-[392px]"
          >
            <DialogHeader className="pb-5 pe-10">
              <DialogTitle className="text-[18px] font-semibold leading-tight">
                {t("displayModeTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {displayModeOptions.map((option) => (
                <PreferenceRowButton
                  key={option.value}
                  icon={option.icon}
                  label={t(option.labelKey)}
                  selected={selectedTheme === option.value}
                  onClick={() => setSelectedTheme(option.value)}
                />
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" rounded="full" height="10" className="px-5" onClick={commitThemeSelection}>
                {t("done")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={languageOpen} onOpenChange={setLanguageOpen}>
          <DialogContent
            showCloseButton
            className="gap-0 rounded-[28px] border-0 p-5 shadow-none sm:max-w-[392px]"
          >
            <DialogHeader className="pb-5 pe-10">
              <DialogTitle className="text-[18px] font-semibold leading-tight">
                {t("languagePreferenceTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {localeOptions.map((option) => (
                <PreferenceRowButton
                  key={option.value}
                  label={option.label}
                  selected={selectedLocale === option.value}
                  onClick={() => setSelectedLocale(option.value)}
                />
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" rounded="full" height="10" className="px-5" onClick={commitLocaleSelection}>
                {t("done")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
