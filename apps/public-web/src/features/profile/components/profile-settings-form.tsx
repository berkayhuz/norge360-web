"use client";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { Badge } from "@workspace/ui/components/data-display/badge";
import { Button } from "@workspace/ui/components/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/layout/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/primitives/field";
import { Input } from "@workspace/ui/components/forms/input";
import { NativeSelect } from "@workspace/ui/components/forms/native-select";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  normalizeAvatarUploadIntent,
  normalizeMyProfile,
  type MyProfile,
  type UpdateMyProfileInput,
} from "@/lib/api/accounts-types";

export const PROFILE_VISIBILITY_OPTIONS = ["Public", "Private", "FollowersOnly"] as const;

export type ProfileSettingsValues = {
  bio: string;
  city: string;
  company: string;
  country: string;
  displayName: string;
  district: string;
  occupation: string;
  profileVisibility: string;
  website: string;
};

export type ProfileSettingsFormState = {
  fieldErrors: Partial<Record<keyof ProfileSettingsValues, string[]>>;
  formError?: string;
  successMessage?: string;
  values: ProfileSettingsValues;
};

export type ProfileSettingsAction = (
  prevState: ProfileSettingsFormState,
  formData: FormData,
) => Promise<ProfileSettingsFormState>;

type ProfileSettingsFormProps = {
  action: ProfileSettingsAction;
  avatarUrl: string | null;
  initialValues: ProfileSettingsValues;
  username: string;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function toProfileSettingsValues(profile: MyProfile): ProfileSettingsValues {
  return {
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    company: profile.company ?? "",
    country: profile.country ?? "",
    displayName: profile.displayName ?? "",
    district: profile.district ?? "",
    occupation: profile.occupation ?? "",
    profileVisibility: profile.profileVisibility || "Public",
    website: profile.website ?? "",
  };
}

export function ProfileSettingsForm({
  action,
  avatarUrl,
  initialValues,
  username,
}: ProfileSettingsFormProps) {
  const t = useTranslations("public-web");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    fieldErrors: {},
    values: initialValues,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );
  const translate = t as unknown as (key: string, values?: Record<string, string | number>) => string;

  useEffect(() => {
    if (state.successMessage) {
      router.refresh();
    }
  }, [router, state.successMessage]);

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const text = {
    avatar: {
      attachFailed: t("settings.avatar.attachFailed"),
      fileDefault: t("settings.avatar.fileDefault"),
      fileSelected: t("settings.avatar.fileSelected"),
      fileTooLarge: t("settings.avatar.fileTooLarge"),
      optional: t("settings.avatar.optional"),
      profileUnreadable: t("settings.avatar.profileUnreadable"),
      unexpectedError: t("settings.avatar.unexpectedError"),
      updateButton: t("settings.avatar.updateButton"),
      uploadFailed: t("settings.avatar.uploadFailed"),
      uploadFormatError: t("settings.avatar.uploadFormatError"),
      uploadStartError: t("settings.avatar.uploadStartError"),
      validImage: t("settings.avatar.validImage"),
      updating: t("settings.avatar.updating"),
    },
    alert: {
      avatarErrorTitle: t("settings.alert.avatarErrorTitle"),
      saveErrorTitle: t("settings.alert.saveErrorTitle"),
      successTitle: t("settings.alert.successTitle"),
    },
    fields: {
      bio: t("settings.fields.bio"),
      bioHint: t("settings.fields.bioHint"),
      bioPlaceholder: t("settings.fields.bioPlaceholder"),
      city: t("settings.fields.city"),
      company: t("settings.fields.company"),
      country: t("settings.fields.country"),
      displayName: t("settings.fields.displayName"),
      displayNamePlaceholder: t("settings.fields.displayNamePlaceholder"),
      district: t("settings.fields.district"),
      occupation: t("settings.fields.occupation"),
      profileVisibility: t("settings.fields.profileVisibility"),
      sectionLinksVisibility: t("settings.fields.sectionLinksVisibility"),
      sectionLocation: t("settings.fields.sectionLocation"),
      sectionProfessional: t("settings.fields.sectionProfessional"),
      website: t("settings.fields.website"),
      websiteHint: t("settings.fields.websiteHint"),
      websitePlaceholder: t("settings.fields.websitePlaceholder"),
    },
    titles: {
      avatar: t("settings.avatar.title"),
      avatarDescription: t("settings.avatar.description"),
      avatarHint: t("settings.avatar.hint"),
      description: t("settings.description"),
      title: t("settings.title"),
    },
    visibility: {
      followersOnly: t("settings.visibility.followersOnly"),
      private: t("settings.visibility.private"),
      public: t("settings.visibility.public"),
    },
  } as const;

  async function handleAvatarUpload() {
    if (!selectedFile) {
      setAvatarError(text.avatar.validImage);
      return;
    }

    const clientValidationError = validateAvatarFile(selectedFile, text.avatar);
    if (clientValidationError) {
      setAvatarError(clientValidationError);
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const intentResponse = await fetch("/api/accounts/profiles/me/avatar/upload-intent", {
        body: JSON.stringify({
          contentLength: selectedFile.size,
          contentType: selectedFile.type,
          fileName: selectedFile.name,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const intentData = await safeReadJson(intentResponse);
      if (!intentResponse.ok) {
        setAvatarError(mapAvatarApiError(intentResponse.status, intentData, text.avatar.uploadStartError));
        return;
      }

      const intent = normalizeAvatarUploadIntent(intentData);
      if (!intent) {
        setAvatarError(text.avatar.uploadFormatError);
        return;
      }

      const uploadHeaders = new Headers();
      if (intent.headers) {
        for (const [key, value] of Object.entries(intent.headers)) {
          uploadHeaders.set(key, value);
        }
      }

      if (!uploadHeaders.has("Content-Type")) {
        uploadHeaders.set("Content-Type", selectedFile.type);
      }

      const uploadResponse = await fetch(intent.uploadUrl, {
        body: selectedFile,
        credentials: "omit",
        headers: uploadHeaders,
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        setAvatarError(text.avatar.uploadFailed);
        return;
      }

      const completeResponse = await fetch("/api/accounts/profiles/me/avatar/complete", {
        body: JSON.stringify({ storageKey: intent.storageKey }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const completeData = await safeReadJson(completeResponse);
      if (!completeResponse.ok) {
        setAvatarError(mapAvatarApiError(completeResponse.status, completeData, text.avatar.attachFailed));
        return;
      }

      const normalizedProfile = normalizeMyProfile(completeData);
      if (!normalizedProfile) {
        setAvatarError(text.avatar.profileUnreadable);
        return;
      }

      setCurrentAvatarUrl(normalizedProfile.avatarUrl);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setAvatarSuccess(t("settings.alert.successMessage"));
      router.refresh();
    } catch {
      setAvatarError(text.avatar.unexpectedError);
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{text.titles.title}</CardTitle>
        <CardDescription>{text.titles.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{text.titles.avatar}</CardTitle>
              <CardDescription>{text.titles.avatarDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Avatar className="size-20">
                  <AvatarImage alt={username} src={previewUrl ?? currentAvatarUrl ?? undefined} />
                  <AvatarFallback>{toInitials(username)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 text-sm">
                  <Badge variant="secondary">{text.avatar.optional}</Badge>
                  <p className="text-muted-foreground">{text.titles.avatarHint}</p>
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="avatarFile">{t("settings.avatar.fileLabel")}</FieldLabel>
                  <FieldContent>
                    <Input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingAvatar}
                      id="avatarFile"
                      ref={fileInputRef}
                      onClick={(event) => {
                        event.currentTarget.value = "";
                      }}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setAvatarError(null);
                        setAvatarSuccess(null);
                        setSelectedFile(file);
                      }}
                      type="file"
                    />
                    {selectedFile ? (
                      <FieldDescription>
                        {translate("settings.avatar.fileSelected", {
                          fileName: selectedFile.name,
                          fileSize: formatFileSize(selectedFile.size),
                        })}
                      </FieldDescription>
                    ) : (
                      <FieldDescription>{text.avatar.fileDefault}</FieldDescription>
                    )}
                  </FieldContent>
                </Field>
              </FieldGroup>

              {avatarError ? (
                <Alert variant="destructive">
                  <AlertTitle>{text.alert.avatarErrorTitle}</AlertTitle>
                  <AlertDescription>{avatarError}</AlertDescription>
                </Alert>
              ) : null}

              {avatarSuccess ? (
                <Alert>
                  <AlertTitle>{text.alert.successTitle}</AlertTitle>
                  <AlertDescription>{avatarSuccess}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center justify-end">
                <Button
                  disabled={!selectedFile || uploadingAvatar}
                  onClick={handleAvatarUpload}
                  type="button"
                >
                  {uploadingAvatar ? text.avatar.updating : text.avatar.updateButton}
                </Button>
              </div>
            </CardContent>
          </Card>

          <form action={formAction} className="space-y-6">
            {state.formError ? (
              <Alert variant="destructive">
                <AlertTitle>{text.alert.saveErrorTitle}</AlertTitle>
                <AlertDescription>{state.formError}</AlertDescription>
              </Alert>
            ) : null}

            {state.successMessage ? (
              <Alert>
                <AlertTitle>{text.alert.successTitle}</AlertTitle>
                <AlertDescription>{state.successMessage}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="displayName">{text.fields.displayName}</FieldLabel>
                <FieldContent>
                  <Input
                    defaultValue={state.values.displayName}
                    id="displayName"
                    maxLength={100}
                    name="displayName"
                    placeholder={text.fields.displayNamePlaceholder}
                  />
                  <FieldError errors={toFieldMessages(state.fieldErrors.displayName)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="bio">{text.fields.bio}</FieldLabel>
                <FieldContent>
                  <Textarea
                    defaultValue={state.values.bio}
                    id="bio"
                    maxLength={500}
                    name="bio"
                    placeholder={text.fields.bioPlaceholder}
                    rows={5}
                  />
                  <FieldDescription>{text.fields.bioHint}</FieldDescription>
                  <FieldError errors={toFieldMessages(state.fieldErrors.bio)} />
                </FieldContent>
              </Field>

              <FieldSeparator>{text.fields.sectionLocation}</FieldSeparator>

              <Field>
                <FieldLabel htmlFor="country">{text.fields.country}</FieldLabel>
                <FieldContent>
                  <Input defaultValue={state.values.country} id="country" maxLength={64} name="country" />
                  <FieldError errors={toFieldMessages(state.fieldErrors.country)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="city">{text.fields.city}</FieldLabel>
                <FieldContent>
                  <Input defaultValue={state.values.city} id="city" maxLength={64} name="city" />
                  <FieldError errors={toFieldMessages(state.fieldErrors.city)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="district">{text.fields.district}</FieldLabel>
                <FieldContent>
                  <Input defaultValue={state.values.district} id="district" maxLength={64} name="district" />
                  <FieldError errors={toFieldMessages(state.fieldErrors.district)} />
                </FieldContent>
              </Field>

              <FieldSeparator>{text.fields.sectionProfessional}</FieldSeparator>

              <Field>
                <FieldLabel htmlFor="occupation">{text.fields.occupation}</FieldLabel>
                <FieldContent>
                  <Input
                    defaultValue={state.values.occupation}
                    id="occupation"
                    maxLength={128}
                    name="occupation"
                  />
                  <FieldError errors={toFieldMessages(state.fieldErrors.occupation)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="company">{text.fields.company}</FieldLabel>
                <FieldContent>
                  <Input defaultValue={state.values.company} id="company" maxLength={128} name="company" />
                  <FieldError errors={toFieldMessages(state.fieldErrors.company)} />
                </FieldContent>
              </Field>

              <FieldSeparator>{text.fields.sectionLinksVisibility}</FieldSeparator>

              <Field>
                <FieldLabel htmlFor="website">{text.fields.website}</FieldLabel>
                <FieldContent>
                  <Input
                    defaultValue={state.values.website}
                    id="website"
                    maxLength={256}
                    name="website"
                    placeholder={text.fields.websitePlaceholder}
                  />
                  <FieldDescription>{text.fields.websiteHint}</FieldDescription>
                  <FieldError errors={toFieldMessages(state.fieldErrors.website)} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="profileVisibility">{text.fields.profileVisibility}</FieldLabel>
                <FieldContent>
                  <NativeSelect
                    defaultValue={state.values.profileVisibility}
                    id="profileVisibility"
                    name="profileVisibility"
                  >
                    {getVisibilityOptions(state.values.profileVisibility).map((option) => (
                      <option key={option} value={option}>
                        {getVisibilityLabel(option, text.visibility)}
                      </option>
                    ))}
                  </NativeSelect>
                  <FieldError errors={toFieldMessages(state.fieldErrors.profileVisibility)} />
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex justify-end">
              <Button disabled={pending} type="submit">
                {pending ? t("settings.actions.saving") : t("settings.actions.save")}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function getVisibilityOptions(current: string) {
  const options = new Set<string>(PROFILE_VISIBILITY_OPTIONS);
  if (current.trim().length > 0) {
    options.add(current);
  }

  return Array.from(options);
}

function getVisibilityLabel(option: string, labels: { followersOnly: string; private: string; public: string }) {
  switch (option) {
    case "FollowersOnly":
      return labels.followersOnly;
    case "Private":
      return labels.private;
    case "Public":
    default:
      return labels.public;
  }
}

function toFieldMessages(messages?: string[]) {
  if (!messages || messages.length === 0) {
    return undefined;
  }

  return messages.map((message) => ({ message }));
}

export function toUpdateInput(values: ProfileSettingsValues): UpdateMyProfileInput {
  return {
    bio: normalizeOptionalText(values.bio),
    city: normalizeOptionalText(values.city),
    company: normalizeOptionalText(values.company),
    country: normalizeOptionalText(values.country),
    displayName: normalizeOptionalText(values.displayName),
    district: normalizeOptionalText(values.district),
    occupation: normalizeOptionalText(values.occupation),
    profileVisibility: normalizeOptionalText(values.profileVisibility),
    website: normalizeOptionalText(values.website),
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function validateAvatarFile(
  file: File,
  messages: {
    fileTooLarge: string;
    validImage: string;
  },
) {
  if (!file || file.size <= 0) {
    return messages.validImage;
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return messages.validImage;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return messages.fileTooLarge;
  }

  return null;
}

function mapAvatarApiError(status: number, input: unknown, fallbackMessage: string) {
  return fallbackMessage;
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "N";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

