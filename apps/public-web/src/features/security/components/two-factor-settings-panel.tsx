"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Button } from "@workspace/ui/components/primitives/button";
import { Input } from "@workspace/ui/components/forms/input";
import { Badge } from "@workspace/ui/components/data-display/badge";

export type MfaStatus = {
  hasAuthenticator: boolean;
  isEnabled: boolean;
  recoveryCodesRemaining: number;
};

type MfaSetupResponse = {
  authenticatorUri: string;
  sharedKey: string;
};

type TwoFactorSettingsPanelProps = {
  initialStatus: MfaStatus;
};

export function TwoFactorSettingsPanel({ initialStatus }: TwoFactorSettingsPanelProps) {
  const t = useTranslations("public-web");
  const messages = {
    forbidden: t("settings.security.alert.forbidden"),
    unauthorized: t("settings.security.alert.unauthorized"),
    unavailable: t("settings.security.alert.unavailable"),
    unexpected: t("settings.security.alert.unexpected"),
    validation: t("settings.security.alert.validationError"),
    disabled: t("settings.security.twoFactor.disabled"),
  } as const;
  const [status, setStatus] = useState<MfaStatus>(initialStatus);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function beginSetup() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/security/mfa/setup", {
          credentials: "include",
          method: "POST",
        });
        const data = await readProblemOrJson(response);
        if (!response.ok) {
          setError(resolveSecurityErrorMessage(response.status, data, messages));
          return;
        }
        setSetup(normalizeSetup(data));
      } catch {
        setError(t("settings.security.alert.unavailable"));
      }
    });
  }

  function confirmSetup() {
    if (!setup) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/security/mfa/confirm", {
          body: JSON.stringify({
            sharedKey: setup.sharedKey,
            verificationCode,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = await readProblemOrJson(response);
        if (!response.ok) {
          setError(resolveSecurityErrorMessage(response.status, data, messages));
          return;
        }

        const codes = extractRecoveryCodes(data);
        setRecoveryCodes(codes);
        setStatus({ hasAuthenticator: true, isEnabled: true, recoveryCodesRemaining: codes.length });
        setSetup(null);
        setVerificationCode("");
        setSuccess(t("settings.security.twoFactor.enabled"));
      } catch {
        setError(t("settings.security.alert.unexpected"));
      }
    });
  }

  function disableMfa() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/security/mfa/disable", {
          body: JSON.stringify({ verificationCode }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          const data = await readProblemOrJson(response);
          setError(resolveSecurityErrorMessage(response.status, data, messages));
          return;
        }
        setStatus((current) => (current ? { ...current, hasAuthenticator: false, isEnabled: false } : current));
        setSetup(null);
        setVerificationCode("");
        setRecoveryCodes([]);
        setSuccess(t("settings.security.twoFactor.disabled"));
      } catch {
        setError(t("settings.security.alert.unexpected"));
      }
    });
  }

  function regenerateRecoveryCodes() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/security/mfa/recovery-codes", {
          body: JSON.stringify({ verificationCode }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = await readProblemOrJson(response);
        if (!response.ok) {
          setError(resolveSecurityErrorMessage(response.status, data, messages));
          return;
        }

        const codes = extractRecoveryCodes(data);
        setRecoveryCodes(codes);
        setStatus((current) => (current ? { ...current, recoveryCodesRemaining: codes.length } : current));
        setSuccess(t("settings.security.twoFactor.recoveryCodesSaved"));
      } catch {
        setError(t("settings.security.alert.unexpected"));
      }
    });
  }

  return (
    <div>
      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader className="sr-only">
          <CardTitle>{t("settings.security.twoFactor.title")}</CardTitle>
          <CardDescription>{t("settings.security.twoFactor.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("settings.security.alert.errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertTitle>{t("settings.security.alert.successTitle")}</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <div>
            <StatusTile label={t("settings.security.twoFactor.statusLabel")} value={status.isEnabled ? t("settings.security.twoFactor.enabled") : t("settings.security.twoFactor.disabled")} />
            <StatusTile
              label={t("settings.security.twoFactor.authenticatorLabel")}
              value={status.hasAuthenticator ? t("settings.security.twoFactor.configured") : t("settings.security.twoFactor.notConfigured")}
            />
            <StatusTile label={t("settings.security.twoFactor.recoveryCodesLabel")} value={String(status.recoveryCodesRemaining)} />
          </div>

          {!setup ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button disabled={pending} onClick={beginSetup} type="button" variant="outline">
                {pending ? t("settings.security.actions.saving") : t("settings.security.twoFactor.startSetup")}
              </Button>
              {status.isEnabled ? (
                <Button disabled={pending} onClick={disableMfa} type="button" variant="outline">
                  {pending ? t("settings.security.actions.saving") : t("settings.security.twoFactor.disable")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {setup ? (
            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">{t("settings.security.twoFactor.setupTitle")}</div>
                <p className="text-sm text-muted-foreground">{t("settings.security.twoFactor.setupDescription")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CodeBlock label={t("settings.security.twoFactor.sharedKey")} value={setup.sharedKey} />
                <CodeBlock label={t("settings.security.twoFactor.authenticatorUri")} value={setup.authenticatorUri} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  placeholder={t("settings.security.twoFactor.codePlaceholder")}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.currentTarget.value)}
                />
                <Button disabled={pending || verificationCode.trim().length === 0} onClick={confirmSetup} type="button">
                  {pending ? t("settings.security.actions.saving") : t("settings.security.twoFactor.confirm")}
                </Button>
              </div>
            </div>
          ) : null}

          {status.isEnabled ? (
            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
              <div>
                <div className="text-sm font-medium text-foreground">{t("settings.security.twoFactor.recoveryCodesTitle")}</div>
                <p className="text-sm text-muted-foreground">{t("settings.security.twoFactor.recoveryCodesDescription")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  placeholder={t("settings.security.twoFactor.codePlaceholder")}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.currentTarget.value)}
                />
                <Button disabled={pending || verificationCode.trim().length === 0} onClick={regenerateRecoveryCodes} type="button" variant="outline">
                  {pending ? t("settings.security.actions.saving") : t("settings.security.twoFactor.regenerateCodes")}
                </Button>
              </div>
              {recoveryCodes.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((code) => (
                    <Badge className="justify-center rounded-full px-3 py-2 text-sm" key={code} variant="secondary">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function extractRecoveryCodes(input: unknown): string[] {
  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as { recoveryCodes?: unknown };
  if (!Array.isArray(record.recoveryCodes)) {
    return [];
  }

  return record.recoveryCodes.filter((item): item is string => typeof item === "string");
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="mt-2 overflow-x-auto text-xs text-foreground">{value}</pre>
    </div>
  );
}

function normalizeSetup(input: unknown): MfaSetupResponse | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const authenticatorUri = typeof record.authenticatorUri === "string" ? record.authenticatorUri : typeof record.AuthenticatorUri === "string" ? record.AuthenticatorUri : null;
  const sharedKey = typeof record.sharedKey === "string" ? record.sharedKey : typeof record.SharedKey === "string" ? record.SharedKey : null;
  if (!authenticatorUri || !sharedKey) return null;
  return { authenticatorUri, sharedKey };
}

async function readProblemOrJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
}

function resolveSecurityErrorMessage(
  status: number,
  payload: unknown,
  messages: {
    disabled: string;
    forbidden: string;
    unauthorized: string;
    unavailable: string;
    unexpected: string;
    validation: string;
  },
) {
  const problem = asRecord(payload);
  const detail = typeof problem?.detail === "string" ? problem.detail : null;
  const errorCode = typeof problem?.errorCode === "string" ? problem.errorCode : null;

  if (status === 400) {
    return detail ?? messages.validation;
  }

  if (status === 401) {
    return messages.unauthorized;
  }

  if (status === 403) {
    return messages.forbidden;
  }

  if (status === 404 && errorCode === "mfa_not_enabled") {
    return messages.disabled;
  }

  if (status >= 500) {
    return messages.unavailable;
  }

  return detail ?? messages.unexpected;
}

function asRecord(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  return input as Record<string, unknown>;
}
