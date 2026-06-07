"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import { Button } from "@workspace/ui/components/primitives/button";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@workspace/ui/components/primitives/field";
import { Input } from "@workspace/ui/components/forms/input";

export type PasswordSecurityPanelsProps = {
  passwordInitialState: PasswordChangeFormState;
};

export type EmailSecurityPanelProps = {
  currentEmail: string;
  emailInitialState: EmailChangeFormState;
};

export type PasswordChangeFormState = {
  fieldErrors: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>>;
  formError?: string;
  successMessage?: string;
  values: {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
  };
};

export type EmailChangeFormState = {
  fieldErrors: Partial<Record<"currentPassword" | "newEmail", string[]>>;
  formError?: string;
  successMessage?: string;
  values: {
    currentPassword: string;
    newEmail: string;
  };
};

export function PasswordSecurityPanels({
  passwordInitialState,
}: PasswordSecurityPanelsProps) {
  const t = useTranslations("public-web");
  const [newPasswordStrength, setNewPasswordStrength] = useState("");
  async function passwordAction(
    _prevState: PasswordChangeFormState,
    formData: FormData,
  ): Promise<PasswordChangeFormState> {
    const currentPassword = readFormText(formData, "currentPassword");
    const newPassword = readFormText(formData, "newPassword");
    const confirmPassword = readFormText(formData, "confirmPassword");

    if (newPassword !== confirmPassword) {
      return {
        fieldErrors: {
          confirmPassword: [t("settings.security.password.mismatch")],
        },
        formError: t("settings.security.alert.validationError"),
        values: {
          confirmPassword,
          currentPassword,
          newPassword,
        },
      };
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
        cache: "no-store",
        credentials: "include",
        headers: buildJsonHeaders(),
        method: "POST",
      });

      if (response.ok) {
        return {
          fieldErrors: {},
          successMessage: t("settings.security.password.success"),
          values: {
            confirmPassword: "",
            currentPassword: "",
            newPassword: "",
          },
        };
      }

      const problem = await readProblemDetails(response);

      if (response.status === 400) {
        return {
          fieldErrors: normalizeFieldErrors(
            problem.errors ?? {},
            ["currentPassword", "newPassword", "confirmPassword"] as const,
          ),
          formError: t("settings.security.alert.validationError"),
          values: {
            confirmPassword,
            currentPassword,
            newPassword,
          },
        };
      }

      if (response.status === 401) {
        return failureState(t("settings.security.alert.unauthorized"), {
          confirmPassword,
          currentPassword,
          newPassword,
        });
      }

      if (response.status === 403) {
        return failureState(t("settings.security.alert.forbidden"), {
          confirmPassword,
          currentPassword,
          newPassword,
        });
      }

      if (response.status >= 500) {
        return failureState(t("settings.security.alert.unavailable"), {
          confirmPassword,
          currentPassword,
          newPassword,
        });
      }

      return failureState(t("settings.security.alert.unexpected"), {
        confirmPassword,
        currentPassword,
        newPassword,
      });
    } catch {
      return failureState(t("settings.security.alert.unavailable"), {
        confirmPassword,
        currentPassword,
        newPassword,
      });
    }
  }

  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    passwordAction,
    passwordInitialState,
  );
  useEffect(() => {
    setNewPasswordStrength(passwordState.values.newPassword);
  }, [passwordState.values.newPassword]);

  return (
    <div className="space-y-5 max-w-lg">
      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader>
          <CardTitle className="sr-only">{t("settings.security.password.title")}</CardTitle>
          <CardDescription className="sr-only">{t("settings.security.password.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {renderSuccessOrError(
            passwordState.successMessage,
            passwordState.formError,
            t("settings.security.alert.successTitle"),
            t("settings.security.alert.errorTitle"),
          )}

          <form action={passwordFormAction} className="space-y-6" key={serializePasswordValues(passwordState.values)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">{t("settings.security.password.currentPassword")}</FieldLabel>
                <FieldContent>
                  <Input
                    autoComplete="current-password"
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    defaultValue={passwordState.values.currentPassword}
                  />
                </FieldContent>
                {renderFieldErrors(passwordState.fieldErrors.currentPassword)}
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">{t("settings.security.password.newPassword")}</FieldLabel>
                <FieldContent>
                  <Input
                    autoComplete="new-password"
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    onChange={(event) => setNewPasswordStrength(event.currentTarget.value)}
                    defaultValue={passwordState.values.newPassword}
                  />
                </FieldContent>
                <PasswordStrengthMeter value={newPasswordStrength || passwordState.values.newPassword} />
                {renderFieldErrors(passwordState.fieldErrors.newPassword)}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">{t("settings.security.password.confirmPassword")}</FieldLabel>
                <FieldContent>
                  <Input
                    autoComplete="new-password"
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    defaultValue={passwordState.values.confirmPassword}
                  />
                </FieldContent>
                {renderFieldErrors(passwordState.fieldErrors.confirmPassword)}
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-xs text-muted-foreground">{t("settings.security.password.note")}</p>
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? t("settings.security.actions.saving") : t("settings.security.password.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function EmailSecurityPanel({
  currentEmail,
  emailInitialState,
}: EmailSecurityPanelProps) {
  const t = useTranslations("public-web");
  async function emailAction(
    _prevState: EmailChangeFormState,
    formData: FormData,
  ): Promise<EmailChangeFormState> {
    const currentPassword = readFormText(formData, "currentPassword");
    const newEmail = readFormText(formData, "newEmail");

    try {
      const response = await fetch("/api/auth/change-email", {
        body: JSON.stringify({
          currentPassword,
          newEmail,
        }),
        cache: "no-store",
        credentials: "include",
        headers: buildJsonHeaders(),
        method: "POST",
      });

      if (response.ok) {
        return {
          fieldErrors: {},
          successMessage: t("settings.security.email.success"),
          values: {
            currentPassword: "",
            newEmail: "",
          },
        };
      }

      const problem = await readProblemDetails(response);

      if (response.status === 400) {
        return {
          fieldErrors: normalizeFieldErrors(problem.errors ?? {}, ["currentPassword", "newEmail"] as const),
          formError: t("settings.security.alert.validationError"),
          values: {
            currentPassword,
            newEmail,
          },
        };
      }

      if (response.status === 401) {
        return failureEmailState(t("settings.security.alert.unauthorized"), {
          currentPassword,
          newEmail,
        });
      }

      if (response.status === 403) {
        return failureEmailState(t("settings.security.alert.forbidden"), {
          currentPassword,
          newEmail,
        });
      }

      if (response.status >= 500) {
        return failureEmailState(t("settings.security.alert.unavailable"), {
          currentPassword,
          newEmail,
        });
      }

      return failureEmailState(t("settings.security.alert.unexpected"), {
        currentPassword,
        newEmail,
      });
    } catch {
      return failureEmailState(t("settings.security.alert.unavailable"), {
        currentPassword,
        newEmail,
      });
    }
  }

  const [emailState, emailFormAction, emailPending] = useActionState(emailAction, emailInitialState);

  return (
    <div className="space-y-5 max-w-lg">
      <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
        <CardHeader className="sr-only">
          <CardTitle>{t("settings.security.email.title")}</CardTitle>
          <CardDescription>{t("settings.security.email.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <div className="text-xs uppercase tracking-wide">{t("settings.security.currentEmailLabel")}</div>
            <div className="mt-1 text-foreground">{currentEmail}</div>
          </div>

          {renderSuccessOrError(
            emailState.successMessage,
            emailState.formError,
            t("settings.security.alert.successTitle"),
            t("settings.security.alert.errorTitle"),
          )}

          <form action={emailFormAction} className="space-y-6" key={serializeEmailValues(emailState.values)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="emailCurrentPassword">
                  {t("settings.security.email.currentPassword")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    autoComplete="current-password"
                    id="emailCurrentPassword"
                    name="currentPassword"
                    type="password"
                    defaultValue={emailState.values.currentPassword}
                  />
                </FieldContent>
                {renderFieldErrors(emailState.fieldErrors.currentPassword)}
              </Field>

              <Field>
                <FieldLabel htmlFor="newEmail">{t("settings.security.email.newEmail")}</FieldLabel>
                <FieldContent>
                  <Input
                    autoComplete="email"
                    id="newEmail"
                    name="newEmail"
                    type="email"
                    defaultValue={emailState.values.newEmail}
                  />
                </FieldContent>
                {renderFieldErrors(emailState.fieldErrors.newEmail)}
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-xs text-muted-foreground">{t("settings.security.email.note")}</p>
              <Button type="submit" disabled={emailPending}>
                {emailPending ? t("settings.security.actions.saving") : t("settings.security.email.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function renderFieldErrors(errors?: string[]) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {errors.map((error) => (
        <p className="text-xs text-destructive" key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}

function renderSuccessOrError(
  successMessage: string | undefined,
  formError: string | undefined,
  successTitle: string,
  errorTitle: string,
) {
  if (successMessage) {
    return (
      <Alert>
        <AlertTitle>{successTitle}</AlertTitle>
        <AlertDescription>{successMessage}</AlertDescription>
      </Alert>
    );
  }

  if (formError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{formError}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

function serializePasswordValues(values: PasswordChangeFormState["values"]) {
  return [values.currentPassword, values.newPassword, values.confirmPassword].join("\u0000");
}

function serializeEmailValues(values: EmailChangeFormState["values"]) {
  return [values.currentPassword, values.newEmail].join("\u0000");
}

function readFormText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function buildJsonHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Correlation-Id": crypto.randomUUID(),
  };
}

async function readProblemDetails(response: Response): Promise<{ errors?: Record<string, string[]> }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const errors = (payload.errors ?? payload.Errors) as unknown;
  if (!errors || typeof errors !== "object") {
    return {};
  }

  const normalizedErrors: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(errors)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const messages = value.filter((message): message is string => typeof message === "string");
    if (messages.length > 0) {
      normalizedErrors[field] = messages;
    }
  }

  return Object.keys(normalizedErrors).length > 0 ? { errors: normalizedErrors } : {};
}

function failureState(
  formError: string,
  values: PasswordChangeFormState["values"],
): PasswordChangeFormState {
  return {
    fieldErrors: {},
    formError,
    values,
  };
}

function failureEmailState(
  formError: string,
  values: EmailChangeFormState["values"],
): EmailChangeFormState {
  return {
    fieldErrors: {},
    formError,
    values,
  };
}

function normalizeFieldErrors<TField extends string>(
  input: Record<string, string[]>,
  allowedFields: readonly TField[],
): Partial<Record<TField, string[]>> {
  const output: Partial<Record<TField, string[]>> = {};
  const fieldSet = new Set(allowedFields);

  for (const [rawKey, messages] of Object.entries(input)) {
    if (!fieldSet.has(rawKey as TField)) {
      continue;
    }

    output[rawKey as TField] = messages;
  }

  return output;
}

function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) {
    return null;
  }

  const strength = evaluatePasswordStrength(value);
  const width = `${(strength.score / 4) * 100}%`;

  return (
    <div className="mt-2 space-y-1">
      <div className="h-2 rounded-full bg-muted">
        <div
          className={[
            "h-2 rounded-full transition-all",
            strength.tone === "weak" ? "bg-rose-500" : "",
            strength.tone === "fair" ? "bg-amber-500" : "",
            strength.tone === "good" ? "bg-sky-500" : "",
            strength.tone === "strong" ? "bg-emerald-500" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {strength.label}</p>
    </div>
  );
}

function evaluatePasswordStrength(value: string) {
  let score = 0;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) {
    return { label: "Weak", score: 1, tone: "weak" as const };
  }
  if (score === 2) {
    return { label: "Fair", score: 2, tone: "fair" as const };
  }
  if (score === 3) {
    return { label: "Good", score: 3, tone: "good" as const };
  }

  return { label: "Strong", score: 4, tone: "strong" as const };
}
