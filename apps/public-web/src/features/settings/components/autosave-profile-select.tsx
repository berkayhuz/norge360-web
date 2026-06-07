"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Field, FieldContent, FieldLabel } from "@workspace/ui/components/primitives/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";

import { updateMyProfileClient } from "@/lib/api/accounts-client";

type SelectOption = {
  label: string;
  value: string;
};

type AutosaveProfileSelectProps = {
  description?: string;
  fieldId: string;
  fieldLabel: string;
  initialValue: string;
  kind: "commentAudience" | "hideLikeCounts" | "profileVisibility";
  options: readonly SelectOption[];
};

export function AutosaveProfileSelect({
  description,
  fieldId,
  fieldLabel,
  initialValue,
  kind,
  options,
}: AutosaveProfileSelectProps) {
  const t = useTranslations("public-web");
  const messages = {
    forbidden: t("settings.alert.forbiddenMessage"),
    notFound: t("settings.alert.notFoundMessage"),
    saveErrorTitle: t("settings.alert.saveErrorTitle"),
    unauthorized: t("settings.alert.unauthorizedMessage"),
    unexpected: t("settings.alert.unexpectedMessage"),
    upstream: t("settings.alert.upstreamMessage"),
    validation: t("settings.alert.validationMessage"),
  } as const;
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  async function handleValueChange(nextValue: string) {
    if (nextValue === value) {
      return;
    }

    const previousValue = value;
    const requestId = ++requestIdRef.current;
    setValue(nextValue);
    setSaving(true);
    setError(null);

    const result = await updateMyProfileClient(buildPayload(kind, nextValue));
    if (requestIdRef.current !== requestId) {
      return;
    }

    setSaving(false);

    if (result.kind === "success") {
      return;
    }

    setValue(previousValue);
    setError(resolveErrorMessage(result, messages));
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor={fieldId}>{fieldLabel}</FieldLabel>
        <FieldContent>
          <Select value={value} onValueChange={(nextValue) => void handleValueChange(nextValue)} disabled={saving}>
            <SelectTrigger id={fieldId}>
              <SelectValue placeholder={fieldLabel} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      <div className="min-h-5">
        {saving ? <p className="text-xs text-muted-foreground">{t("settings.actions.saving")}</p> : null}
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {error ? (
          <Alert className="mt-3" variant="destructive">
            <AlertTitle>{messages.saveErrorTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}

function buildPayload(kind: AutosaveProfileSelectProps["kind"], value: string) {
  if (kind === "hideLikeCounts") {
    return { hideLikeCounts: value === "true" };
  }

  if (kind === "commentAudience") {
    return { commentAudience: value };
  }

  return { profileVisibility: value };
}

function resolveErrorMessage(
  result: Exclude<Awaited<ReturnType<typeof updateMyProfileClient>>, { kind: "success" }>,
  messages: {
    forbidden: string;
    notFound: string;
    unauthorized: string;
    unexpected: string;
    upstream: string;
    validation: string;
  },
) {
  if (result.kind === "validationError") {
    return messages.validation;
  }

  if (result.kind === "unauthorized") {
    return messages.unauthorized;
  }

  if (result.kind === "forbidden") {
    return messages.forbidden;
  }

  if (result.kind === "notFound") {
    return messages.notFound;
  }

  if (result.kind === "upstreamError") {
    return messages.upstream;
  }

  return messages.unexpected;
}
