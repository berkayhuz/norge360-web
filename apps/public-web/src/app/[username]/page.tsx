import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Avatar, DefaultAvatar, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Button } from "@workspace/ui/components/primitives/button";
import { Image } from "@workspace/ui/components/primitives/image";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Separator } from "@workspace/ui/components/layout/separator";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Globe,
  MapPin,
  Sparkles,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ProfileOnboardingShell } from "@/features/profile/components/profile-onboarding-shell";
import { ProfileActionsMenu } from "@/features/profile/components/profile-actions-menu";
import { ProfileViewTracker } from "@/features/profile/components/profile-view-tracker";
import { Username } from "@/features/profile/components/username";
import { CommunityProfileFeed } from "@/features/community/components/community-profile-feed";
import { getAuthSessionStatus, getMyProfile, getPublicProfileByUsername, resolveAuthUserIdByProfileId } from "@/lib/api/accounts-server";
import type { PublicProfile } from "@/lib/api/accounts-types";
import { calculateProfileCompletion } from "@/lib/api/profile-completion";
import { getAuthWebLoginUrl } from "@/lib/auth-web-url";
import { resolveRequestLocale } from "../../../lib/i18n/request";

type TranslationFn = any;

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const t = await getTranslations("public-web");
  const locale = await resolveRequestLocale();
  const result = await getPublicProfileByUsername(username);

  if (result.kind === "notFound" || result.kind === "invalidUsername") notFound();

  if (result.kind === "forbidden") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert>
          <AlertTitle>{t("profile.status.forbiddenTitle")}</AlertTitle>
          <AlertDescription>{t("profile.status.forbiddenDescription")}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (result.kind === "upstreamError" || result.kind === "unknownError") {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Alert>
          <AlertTitle>{t("profile.status.loadingTitle")}</AlertTitle>
          <AlertDescription>{t("profile.status.loadingDescription")}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const profile = result.profile;
  const profileAuthUserId = await resolveAuthUserIdByProfileId(profile.id);
  const authSessionResult = await getAuthSessionStatus();
  const isAuthenticatedSession = authSessionResult.kind === "authenticated";
  const myProfileResult = await getMyProfile();
  const isOwnProfile =
    myProfileResult.kind === "success"
      ? isSameProfile(profile.id, profile.username, myProfileResult.profile.id, myProfileResult.profile.normalizedUsername)
      : false;

  const onboardingIdentity =
    isOwnProfile && myProfileResult.kind === "success"
      ? {
        authUserId: myProfileResult.profile.authUserId,
        username: myProfileResult.profile.normalizedUsername,
        completion: calculateProfileCompletion(myProfileResult.profile),
      }
      : null;

  const safeAvatarUrl = normalizeProfileImageUrl(profile.avatarUrl);
  const safeCoverUrl = normalizeProfileImageUrl(profile.coverPhotoUrl);
  const displayName =
    typeof profile.displayName === "string" && profile.displayName.trim().length > 0
      ? profile.displayName.trim()
      : profile.username;
  const location = compactJoin([profile.country, profile.city, profile.district], ", ");
  const createdAt = formatDate(profile.createdAt, locale);
  const lastSeenAt = formatDate(profile.lastSeenAt, locale);
  const postsCount = formatCount(profile.postsCount, locale);
  const followersCount = formatCount(profile.followersCount, locale);
  const followingCount = formatCount(profile.followingCount, locale);

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <ProfileViewTracker enabled={isAuthenticatedSession && !isOwnProfile} username={profile.username} />
      <section className="w-full space-y-5">
        <ProfileHero
            displayName={displayName}
            followersCount={followersCount}
            followingCount={followingCount}
            isAuthenticated={isAuthenticatedSession}
            isOwnProfile={isOwnProfile}
            loginHref={getAuthWebLoginUrl()}
            location={location}
            postsCount={postsCount}
          profile={profile}
          safeAvatarUrl={safeAvatarUrl}
          safeCoverUrl={safeCoverUrl}
          t={t}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CommunityProfileFeed userId={profileAuthUserId} />
          </div>

          <aside className="space-y-4">
            <ProfileSummaryCard
              bio={profile.bio}
              company={profile.company}
              createdAt={createdAt}
              lastSeenAt={lastSeenAt}
              location={location}
              occupation={profile.occupation}
              onboardingIdentity={onboardingIdentity}
              visible={isAuthenticatedSession || isOwnProfile}
              t={t}
              website={profile.website}
            />

            <CommunitySuggestionsCard t={t} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function ProfileHero({
  displayName,
  followersCount,
  followingCount,
  isAuthenticated,
  isOwnProfile,
  loginHref,
  location,
  postsCount,
  profile,
  safeAvatarUrl,
  safeCoverUrl,
  t,
}: {
  displayName: string;
  followersCount: string;
  followingCount: string;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  loginHref: string;
  location: string | null;
  postsCount: string;
  profile: PublicProfile;
  safeAvatarUrl: string | null;
  safeCoverUrl: string | null;
  t: TranslationFn;
}) {
  const occupation = hasValue(profile.occupation) ? profile.occupation : t("profile.hero.occupationFallback");

  return (
    <Card className="overflow-hidden border-border/70 pt-0">
      <div className="relative h-36 sm:h-44 lg:h-64">
        {safeCoverUrl ? (
          <Image
            alt={t("profile.hero.coverAlt", { name: profile.username })}
            border="none"
            fit="cover"
            radius="none"
            shadow="none"
            src={safeCoverUrl}
            wrapperClassName="h-full w-full"
          />
        ) : (
          <DefaultCoverArt />
        )}
        <div className="absolute inset-0 bg-background/15" />
      </div>

      <CardContent className="pb-5 pt-4">
        <div className="space-y-3 pt-2 sm:-mt-10 sm:pt-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="-mt-12 size-20 border-4 border-background sm:size-40">
                {safeAvatarUrl ? (
                  <AvatarImage
                    alt={t("profile.hero.avatarAlt", {
                      name: profile.username,
                    })}
                    src={safeAvatarUrl}
                  />
                ) : null}

                <DefaultAvatar />
              </Avatar>

              <div className="flex min-h-24 min-w-0 flex-col items-start space-y-1">
                <Username
                  headingLevel={3}
                  name={displayName}
                  occupation={occupation}
                  verified={profile.isVerified}
                  variant="name-occupation"
                />

                {hasValue(location) ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {location}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-1 flex flex-col items-start gap-3 sm:items-end">
              <HeroStatsInline
                followersCount={followersCount}
                followingCount={followingCount}
                postsCount={postsCount}
                t={t}
              />

              <div className="flex w-full items-center gap-2 sm:w-auto">
                {isOwnProfile ? (
                  <Button asChild className="flex-1 sm:flex-none" size="sm" variant="outline">
                    <Link href="/settings/profile">{t("profile.hero.editProfile")}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild className="flex-1 sm:flex-none" size="sm" variant="outline">
                      <Link href={isAuthenticated ? "#" : loginHref}>{t("profile.hero.message")}</Link>
                    </Button>
                    <Button asChild className="flex-1 sm:flex-none" size="sm">
                      <Link href={isAuthenticated ? "#" : loginHref}>{t("profile.hero.follow")}</Link>
                    </Button>
                    {isAuthenticated ? (
                      <ProfileActionsMenu profileId={profile.id} username={profile.username} />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroStatsInline({
  followersCount,
  followingCount,
  postsCount,
  t,
}: {
  followersCount: string;
  followingCount: string;
  postsCount: string;
  t: TranslationFn;
}) {
  return (
    <div className="grid w-full grid-cols-3 sm:w-auto">
      <CompactStatItem label={t("profile.stats.posts")} value={postsCount} />
      <CompactStatItem label={t("profile.stats.followers")} value={followersCount} />
      <CompactStatItem label={t("profile.stats.following")} value={followingCount} />
    </div>
  );
}

function CompactStatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 text-center sm:min-w-20">
      <p className="text-base font-semibold leading-none text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PostsPlaceholder({ t }: { t: TranslationFn }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("profile.feed.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("profile.feed.description")}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-muted/20 p-5">
          <div className="h-3 rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-4/6 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSummaryCard({
  bio,
  company,
  createdAt,
  lastSeenAt,
  location,
  occupation,
  onboardingIdentity,
  t,
  visible,
  website,
}: {
  bio: string | null;
  company: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  location: string | null;
  occupation: string | null;
  onboardingIdentity: {
    authUserId: string;
    completion: ReturnType<typeof calculateProfileCompletion>;
    username: string;
  } | null;
  visible: boolean;
  t: TranslationFn;
  website: string | null;
}) {
  if (!visible) {
    return null;
  }

  const hasBio = hasValue(bio);
  const hasPrimaryDetails = hasValue(occupation) || hasValue(company) || hasValue(location) || hasValue(website);
  const hasMeta = hasValue(createdAt) || hasValue(lastSeenAt);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("profile.summary.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasBio ? <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">{bio}</p> : null}

        {hasPrimaryDetails ? (
          <div className="space-y-3">
            <SummaryLine icon={<BriefcaseBusiness className="size-4" />} label={t("profile.summary.role")} value={occupation} />
            <SummaryLine icon={<Building2 className="size-4" />} label={t("profile.summary.company")} value={company} />
            <SummaryLine icon={<MapPin className="size-4" />} label={t("profile.summary.location")} value={location} />
            <SummaryWebsiteLine t={t} value={website} />
          </div>
        ) : null}

        {hasPrimaryDetails && hasMeta ? <Separator /> : null}

        {hasMeta ? (
          <div className="space-y-3">
            <SummaryLine icon={<CalendarDays className="size-4" />} label={t("profile.summary.joined")} value={createdAt} />
            <SummaryLine icon={<Clock3 className="size-4" />} label={t("profile.summary.lastActive")} value={lastSeenAt} />
          </div>
        ) : null}

        {onboardingIdentity ? (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="size-4 text-muted-foreground" />
                {t("profile.summary.profileStrengthTitle")}
              </p>
              <ProfileOnboardingShell
                authUserId={onboardingIdentity.authUserId}
                completion={onboardingIdentity.completion}
                username={onboardingIdentity.username}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommunitySuggestionsCard({ t }: { t: TranslationFn }) {
  const suggestions = [
    {
      action: t("profile.community.viewProfiles"),
      description: t("profile.community.nearbyDescription"),
      icon: Users2,
      meta: t("profile.community.nearbyMeta"),
      title: t("profile.community.nearbyPeople"),
    },
    {
      action: t("profile.community.connect"),
      description: t("profile.community.sameCityDescription"),
      icon: Users2,
      meta: t("profile.community.sameCityMeta"),
      title: t("profile.community.sameCity"),
    },
    {
      action: t("profile.community.reviewContributions"),
      description: t("profile.community.localGuidesDescription"),
      icon: Users2,
      meta: t("profile.community.localGuidesMeta"),
      title: t("profile.community.localGuides"),
    },
    {
      action: t("profile.community.seeActivity"),
      description: t("profile.community.activePeopleDescription"),
      icon: Users2,
      meta: t("profile.community.activePeopleMeta"),
      title: t("profile.community.activePeople"),
    },
  ] as const;

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{t("profile.community.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("profile.community.description")}</p>
      </CardHeader>
      <CardContent className="p-0">
        {suggestions.map((item, index) => {
          const Icon = item.icon;

          return (
            <div className={`px-6 py-4 ${index > 0 ? "border-t border-border/70" : ""}`} key={item.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Icon className="mt-0.5 size-4 text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{item.meta}</p>
                <Button size="sm" type="button" variant="ghost">
                  {item.action}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SummaryLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryWebsiteLine({ t, value }: { t: TranslationFn; value: string | null }) {
  if (!hasValue(value) || typeof value !== "string") return null;

  const safeValue = value.trim();
  const href = normalizeWebsiteHref(safeValue);
  if (!href) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">
        <Globe className="size-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.summary.website")}</p>
        <a
          className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {safeValue}
        </a>
      </div>
    </div>
  );
}

function DefaultCoverArt() {
  return (
    <Image
      alt=""
      aria-hidden="true"
      border="none"
      fit="cover"
      radius="none"
      shadow="none"
      src="https://t3.ftcdn.net/jpg/02/92/61/16/360_F_292611643_LWdjR1sNPqdvdeWanVohMSaqCN9ej1Ou.jpg"
      wrapperClassName="h-full w-full"
    />
  );
}

function compactJoin(values: Array<string | null>, separator: string) {
  const normalized = values
    .map((value) => (hasValue(value) ? value.trim() : null))
    .filter((value): value is string => Boolean(value));

  return normalized.length === 0 ? null : normalized.join(separator);
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatDate(value: string | null, locale: string) {
  if (!hasValue(value) || typeof value !== "string") return null;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCount(value: number | null, locale: string) {
  return new Intl.NumberFormat(locale).format(typeof value === "number" ? value : 0);
}

function normalizeWebsiteHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeProfileImageUrl(value: string | null) {
  if (!hasValue(value) || typeof value !== "string") return null;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "cdn.norge360.com" && hostname !== "localhost" && hostname !== "127.0.0.1") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isSameProfile(
  publicProfileId: string,
  publicUsername: string,
  myProfileId: string,
  myNormalizedUsername: string,
) {
  const normalizedPublicId = publicProfileId.trim();
  const normalizedMyId = myProfileId.trim();
  if (normalizedPublicId && normalizedMyId && normalizedPublicId === normalizedMyId) return true;
  const normalizedPublicUsername = publicUsername.trim().toLowerCase();
  const normalizedMine = myNormalizedUsername.trim().toLowerCase();
  if (!normalizedPublicUsername || !normalizedMine) return false;
  return normalizedPublicUsername === normalizedMine;
}
