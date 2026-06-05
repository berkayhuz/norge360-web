"use client";

import { Badge } from "@workspace/ui/components/data-display/badge";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Progress } from "@workspace/ui/components/feedback/progress";
import { Separator } from "@workspace/ui/components/layout/separator";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildProfileOnboardingStorageKey,
  readProfileOnboardingState,
  writeProfileOnboardingDismissed,
} from "@/features/profile/lib/profile-onboarding-storage";
import type { ProfileCompletionResult } from "@/lib/api/profile-completion";

type ProfileOnboardingShellProps = {
  authUserId?: string | null;
  completion?: ProfileCompletionResult | null;
  username?: string | null;
};

export function ProfileOnboardingShell({
  authUserId,
  completion,
  username,
}: ProfileOnboardingShellProps) {
  const t = useTranslations("public-web");
  const locale = useLocale();
  const storageKey = useMemo(
    () => buildProfileOnboardingStorageKey({ authUserId, username }),
    [authUserId, username],
  );

  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey || typeof window === "undefined") {
      return false;
    }

    return readProfileOnboardingState(storageKey)?.dismissed === true;
  });

  const checklistMeta = useMemo(
    () => ({
      avatar: {
        doneHint: t("onboarding.avatar.doneHint"),
        missingHint: t("onboarding.avatar.missingHint"),
        title: t("onboarding.avatar.title"),
      },
      bio: {
        doneHint: t("onboarding.bio.doneHint"),
        missingHint: t("onboarding.bio.missingHint"),
        title: t("onboarding.bio.title"),
      },
      company: {
        doneHint: t("onboarding.company.doneHint"),
        missingHint: t("onboarding.company.missingHint"),
        title: t("onboarding.company.title"),
      },
      location: {
        doneHint: t("onboarding.location.doneHint"),
        missingHint: t("onboarding.location.missingHint"),
        title: t("onboarding.location.title"),
      },
      occupation: {
        doneHint: t("onboarding.occupation.doneHint"),
        missingHint: t("onboarding.occupation.missingHint"),
        title: t("onboarding.occupation.title"),
      },
      website: {
        doneHint: t("onboarding.website.doneHint"),
        missingHint: t("onboarding.website.missingHint"),
        title: t("onboarding.website.title"),
      },
    }),
    [t],
  );

  if (!storageKey || dismissed || !completion) {
    return null;
  }

  const handleDismiss = () => {
    writeProfileOnboardingDismissed(storageKey);
    setDismissed(true);
  };

  const coreItems = completion.items.filter(
    (item): item is typeof item & { key: Exclude<typeof item.key, "coverPhotoBonus"> } =>
      item.key !== "coverPhotoBonus",
  );
  const bonusItem = completion.items.find((item) => item.key === "coverPhotoBonus");
  const translate = t as unknown as (key: string, values?: Record<string, string | number>) => string;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("onboarding.title")}</CardTitle>
            <CardDescription>{t("onboarding.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link href="/settings/profile">{t("onboarding.editProfile")}</Link>
            </Button>
            <Button onClick={handleDismiss} size="sm" variant="outline">
              {t("onboarding.dismiss")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {translate("onboarding.progress", {
                completed: completion.completed,
                total: completion.total,
              })}
            </span>
            <span className="font-medium">{new Intl.NumberFormat(locale).format(completion.percentage)}%</span>
          </div>
          <Progress aria-label={t("onboarding.progressAria")} value={completion.percentage} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {coreItems.map((item) => {
          const meta = checklistMeta[item.key];
          return (
            <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3" key={item.key}>
              <div className="space-y-1">
                <p className="text-sm font-medium">{meta.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.completed ? meta.doneHint : meta.missingHint}
                </p>
              </div>
              <Badge variant={item.completed ? "default" : "secondary"}>
                {item.completed ? t("onboarding.completed") : t("onboarding.suggestion")}
              </Badge>
            </div>
          );
        })}

        <Separator />

        <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed bg-background p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("onboarding.bonusTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("onboarding.bonusDescription")}</p>
          </div>
          <Badge variant={bonusItem?.completed ? "default" : "outline"}>
            {bonusItem?.completed ? t("onboarding.bonusAvailable") : t("onboarding.bonusSoon")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
