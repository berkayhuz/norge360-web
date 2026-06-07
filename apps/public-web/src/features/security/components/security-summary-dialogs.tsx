"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui/components/data-display/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/primitives/button";

import type { AuthSessionSummary } from "@/lib/api/accounts-types";

type SecurityScoreDialogButtonProps = {
  missingItems: string[];
  score: number;
};

type LastLoginDetailsDialogButtonProps = {
  browser: string;
  deviceLabel: string;
  ipAddress: string;
  lastLoginAt: string;
  os: string;
  session: AuthSessionSummary;
};

export function SecurityScoreDialogButton({
  missingItems,
  score,
}: SecurityScoreDialogButtonProps) {
  const t = useTranslations("public-web");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{t("settings.security.actions.manage")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.security.securityScore.title")}</DialogTitle>
          <DialogDescription>{t("settings.security.securityScore.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl border border-border/70 bg-muted/20 px-4 py-3 text-2xl font-semibold text-foreground">
              {score}/100
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{t("settings.security.securityScore.progressTitle")}</div>
              <div className="text-sm text-muted-foreground">{t("settings.security.securityScore.progressDescription")}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("settings.security.securityScore.missingTitle")}</div>
            {missingItems.length > 0 ? (
              <ul className="space-y-2">
                {missingItems.map((item) => (
                  <li className="flex items-start gap-2 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground" key={item}>
                    <Badge variant="secondary" className="mt-0.5">{t("settings.security.securityScore.missingBadge")}</Badge>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                {t("settings.security.securityScore.complete")}
              </div>
            )}
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button asChild variant="outline">
            <Link href="/settings/password-security/password">{t("settings.security.password.title")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/password-security/two-factor">{t("settings.security.twoFactor.manage")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LastLoginDetailsDialogButton({
  browser,
  deviceLabel,
  ipAddress,
  lastLoginAt,
  os,
  session,
}: LastLoginDetailsDialogButtonProps) {
  const t = useTranslations("public-web");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{t("settings.security.sessions.viewDetails")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.security.sessions.lastLoginTitle")}</DialogTitle>
          <DialogDescription>{t("settings.security.sessions.lastLoginDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <Detail label={t("settings.security.sessions.lastLogin")} value={lastLoginAt} />
          <Detail label={t("settings.security.sessions.ipAddressLabel")} value={ipAddress} />
          <Detail label={t("settings.security.currentDevice")} value={deviceLabel} />
          <Detail label={t("settings.security.sessions.osLabel")} value={os} />
          <Detail label={t("settings.security.sessions.browserLabel")} value={browser} />
          <Detail label={t("settings.security.sessions.connected")} value={session.isCurrent ? t("settings.security.sessions.currentBadge") : t("settings.security.sessions.unknown")} />
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-foreground">{value}</div>
    </div>
  );
}
