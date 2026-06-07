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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/forms/select";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  normalizeAvatarUploadIntent,
  normalizeMyProfile,
  type MyProfile,
  type UpdateMyProfileInput,
} from "@/lib/api/accounts-types";
import { buildCountryOptions } from "@/features/profile/lib/profile-country-options";
import {
  COMMUNITY_LOCATION_OPTIONS,
  getCommunityDistrictOptions,
  normalizeCommunityCityValue,
  normalizeCommunityDistrictValue,
} from "@/features/community/lib/location-options";

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
  coverPhotoUrl: string | null;
  initialValues: ProfileSettingsValues;
  username: string;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_COVER_PHOTO_BYTES = 10 * 1024 * 1024;
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
  coverPhotoUrl,
  initialValues,
  username,
}: ProfileSettingsFormProps) {
  const t = useTranslations("public-web");
  const locale = useLocale();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    fieldErrors: {},
    values: initialValues,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [coverPhotoError, setCoverPhotoError] = useState<string | null>(null);
  const [coverPhotoSuccess, setCoverPhotoSuccess] = useState<string | null>(null);
  const [country, setCountry] = useState(initialValues.country);
  const [city, setCity] = useState(normalizeCommunityCityValue(initialValues.city));
  const [district, setDistrict] = useState(normalizeCommunityDistrictValue(initialValues.city, initialValues.district));
  const [profileVisibility, setProfileVisibility] = useState(initialValues.profileVisibility || "Public");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );
  const coverPhotoPreviewUrl = useMemo(
    () => (selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : null),
    [selectedCoverFile],
  );
  const countryOptions = useMemo(() => buildCountryOptions(locale, country), [country, locale]);
  const cityOptions = COMMUNITY_LOCATION_OPTIONS;
  const districtOptions = useMemo(() => getCommunityDistrictOptions(city), [city]);
  const translate = t as unknown as (key: string, values?: Record<string, string | number>) => string;

  useEffect(() => {
    if (state.successMessage) {
      router.refresh();
    }
  }, [router, state.successMessage]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (coverPhotoPreviewUrl) {
        URL.revokeObjectURL(coverPhotoPreviewUrl);
      }
    };
  }, [coverPhotoPreviewUrl]);

  useEffect(() => {
    setCountry(initialValues.country);
    setCity(normalizeCommunityCityValue(initialValues.city));
    setDistrict(normalizeCommunityDistrictValue(initialValues.city, initialValues.district));
    setProfileVisibility(initialValues.profileVisibility || "Public");
  }, [initialValues.city, initialValues.country, initialValues.district, initialValues.profileVisibility]);

  useEffect(() => {
    const nextDistrictOptions = getCommunityDistrictOptions(city);
    if (nextDistrictOptions.length === 0) {
      setDistrict("");
      return;
    }

    if (!nextDistrictOptions.some((option) => option.value === district)) {
      setDistrict(nextDistrictOptions[0]?.value ?? "");
    }
  }, [city, district]);

  const text = {
    avatar: {
      attachFailed: t("settings.avatar.attachFailed"),
      fileDefault: t("settings.avatar.fileDefault"),
      fileLabel: t("settings.avatar.fileLabel"),
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
    coverPhoto: {
      attachFailed: t("settings.coverPhoto.attachFailed"),
      description: t("settings.coverPhoto.description"),
      fileDefault: t("settings.coverPhoto.fileDefault"),
      fileLabel: t("settings.coverPhoto.fileLabel"),
      fileTooLarge: t("settings.coverPhoto.fileTooLarge"),
      optional: t("settings.coverPhoto.optional"),
      profileUnreadable: t("settings.coverPhoto.profileUnreadable"),
      title: t("settings.coverPhoto.title"),
      unexpectedError: t("settings.coverPhoto.unexpectedError"),
      updateButton: t("settings.coverPhoto.updateButton"),
      uploadFailed: t("settings.coverPhoto.uploadFailed"),
      uploadFormatError: t("settings.coverPhoto.uploadFormatError"),
      uploadStartError: t("settings.coverPhoto.uploadStartError"),
      validImage: t("settings.coverPhoto.validImage"),
      updating: t("settings.coverPhoto.updating"),
      hint: t("settings.coverPhoto.hint"),
    },
    alert: {
      avatarErrorTitle: t("settings.alert.avatarErrorTitle"),
      coverPhotoErrorTitle: t("settings.alert.coverPhotoErrorTitle"),
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
    await uploadProfileMedia({
      completePath: "/api/accounts/profiles/me/avatar/complete",
      file: selectedFile,
      fileInputRef,
      intentPath: "/api/accounts/profiles/me/avatar/upload-intent",
      setError: setAvatarError,
      setFile: setSelectedFile,
      setSuccess: setAvatarSuccess,
      setUploading: setUploadingAvatar,
      successMessage: t("settings.alert.successMessage"),
      fileTooLargeMessage: text.avatar.fileTooLarge,
      uploadFailedMessage: text.avatar.uploadFailed,
      uploadFormatErrorMessage: text.avatar.uploadFormatError,
      uploadStartErrorMessage: text.avatar.uploadStartError,
      attachFailedMessage: text.avatar.attachFailed,
      profileUnreadableMessage: text.avatar.profileUnreadable,
      unexpectedErrorMessage: text.avatar.unexpectedError,
      validFileMessage: text.avatar.validImage,
      maxBytes: MAX_AVATAR_BYTES,
    });
  }

  async function handleCoverPhotoUpload() {
    await uploadProfileMedia({
      completePath: "/api/accounts/profiles/me/cover-photo/complete",
      file: selectedCoverFile,
      fileInputRef: coverPhotoInputRef,
      intentPath: "/api/accounts/profiles/me/cover-photo/upload-intent",
      setError: setCoverPhotoError,
      setFile: setSelectedCoverFile,
      setSuccess: setCoverPhotoSuccess,
      setUploading: setUploadingCoverPhoto,
      successMessage: t("settings.alert.successMessage"),
      fileTooLargeMessage: text.coverPhoto.fileTooLarge,
      uploadFailedMessage: text.coverPhoto.uploadFailed,
      uploadFormatErrorMessage: text.coverPhoto.uploadFormatError,
      uploadStartErrorMessage: text.coverPhoto.uploadStartError,
      attachFailedMessage: text.coverPhoto.attachFailed,
      profileUnreadableMessage: text.coverPhoto.profileUnreadable,
      unexpectedErrorMessage: text.coverPhoto.unexpectedError,
      validFileMessage: text.coverPhoto.validImage,
      maxBytes: MAX_COVER_PHOTO_BYTES,
    });
  }

  async function uploadProfileMedia({
    attachFailedMessage,
    completePath,
    file,
    fileInputRef,
    intentPath,
    profileUnreadableMessage,
    setError,
    setFile,
    setSuccess,
    setUploading,
    successMessage,
    unexpectedErrorMessage,
    fileTooLargeMessage,
    uploadFailedMessage,
    uploadFormatErrorMessage,
    uploadStartErrorMessage,
    validFileMessage,
    maxBytes,
  }: {
    attachFailedMessage: string;
    completePath: string;
    file: File | null;
    fileInputRef: RefObject<HTMLInputElement | null>;
    intentPath: string;
    profileUnreadableMessage: string;
    setError: Dispatch<SetStateAction<string | null>>;
    setFile: Dispatch<SetStateAction<File | null>>;
    setSuccess: Dispatch<SetStateAction<string | null>>;
    setUploading: Dispatch<SetStateAction<boolean>>;
    successMessage: string;
    unexpectedErrorMessage: string;
    fileTooLargeMessage: string;
    uploadFailedMessage: string;
    uploadFormatErrorMessage: string;
    uploadStartErrorMessage: string;
    validFileMessage: string;
    maxBytes: number;
  }) {
    if (!file) {
      setError(validFileMessage);
      return;
    }

    const clientValidationError = validateAvatarFile(
      file,
      {
        fileTooLarge: fileTooLargeMessage,
        validImage: validFileMessage,
      },
      maxBytes,
    );
    if (clientValidationError) {
      setError(clientValidationError);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const intentResponse = await fetch(intentPath, {
        body: JSON.stringify({
          contentLength: file.size,
          contentType: file.type,
          fileName: file.name,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const intentData = await safeReadJson(intentResponse);
      if (!intentResponse.ok) {
        setError(mapAvatarApiError(intentResponse.status, intentData, uploadStartErrorMessage));
        return;
      }

      const intent = normalizeAvatarUploadIntent(intentData);
      if (!intent) {
        setError(uploadFormatErrorMessage);
        return;
      }

      const uploadHeaders = new Headers();
      if (intent.headers) {
        for (const [key, value] of Object.entries(intent.headers)) {
          uploadHeaders.set(key, value);
        }
      }

      if (!uploadHeaders.has("Content-Type")) {
        uploadHeaders.set("Content-Type", file.type);
      }

      const uploadResponse = await fetch(intent.uploadUrl, {
        body: file,
        credentials: "omit",
        headers: uploadHeaders,
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        setError(uploadFailedMessage);
        return;
      }

      const completeResponse = await fetch(completePath, {
        body: JSON.stringify({ storageKey: intent.storageKey }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const completeData = await safeReadJson(completeResponse);
      if (!completeResponse.ok) {
        setError(mapAvatarApiError(completeResponse.status, completeData, attachFailedMessage));
        return;
      }

      const normalizedProfile = normalizeMyProfile(completeData);
      if (!normalizedProfile) {
        setError(profileUnreadableMessage);
        return;
      }

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccess(successMessage);
      router.refresh();
    } catch {
      setError(unexpectedErrorMessage);
    } finally {
      setUploading(false);
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
          <Card id="avatar" className="scroll-mt-24 border-dashed">
            <CardHeader>
              <CardTitle>{text.titles.avatar}</CardTitle>
              <CardDescription>{text.titles.avatarDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Avatar className="size-20">
                  <AvatarImage alt={username} src={previewUrl ?? avatarUrl ?? undefined} />
                  <AvatarFallback>{toInitials(username)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 text-sm">
                  <Badge variant="secondary">{text.avatar.optional}</Badge>
                  <p className="text-muted-foreground">{text.titles.avatarHint}</p>
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="avatarFile">{text.avatar.fileLabel}</FieldLabel>
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
                          fileSize: formatFileSize(selectedFile.size, locale),
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

          <Card id="cover-photo" className="scroll-mt-24 border-dashed">
            <CardHeader>
              <CardTitle>{text.coverPhoto.title}</CardTitle>
              <CardDescription>{text.coverPhoto.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-3xl border bg-muted/40">
                  <div className="relative aspect-[3/1] w-full">
                    {coverPhotoPreviewUrl || coverPhotoUrl ? (
                      <img
                        alt={username}
                        className="h-full w-full object-cover"
                        src={coverPhotoPreviewUrl ?? coverPhotoUrl ?? ""}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                          {text.coverPhoto.optional}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{text.coverPhoto.hint}</p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="coverPhotoFile">{text.coverPhoto.fileLabel}</FieldLabel>
                  <FieldContent>
                    <Input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingCoverPhoto}
                      id="coverPhotoFile"
                      ref={coverPhotoInputRef}
                      onClick={(event) => {
                        event.currentTarget.value = "";
                      }}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setCoverPhotoError(null);
                        setCoverPhotoSuccess(null);
                        setSelectedCoverFile(file);
                      }}
                      type="file"
                    />
                    {selectedCoverFile ? (
                      <FieldDescription>
                        {translate("settings.coverPhoto.fileSelected", {
                          fileName: selectedCoverFile.name,
                          fileSize: formatFileSize(selectedCoverFile.size, locale),
                        })}
                      </FieldDescription>
                    ) : (
                      <FieldDescription>{text.coverPhoto.fileDefault}</FieldDescription>
                    )}
                  </FieldContent>
                </Field>
              </FieldGroup>

              {coverPhotoError ? (
                <Alert variant="destructive">
                  <AlertTitle>{text.alert.coverPhotoErrorTitle}</AlertTitle>
                  <AlertDescription>{coverPhotoError}</AlertDescription>
                </Alert>
              ) : null}

              {coverPhotoSuccess ? (
                <Alert>
                  <AlertTitle>{text.alert.successTitle}</AlertTitle>
                  <AlertDescription>{coverPhotoSuccess}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center justify-end">
                <Button
                  disabled={!selectedCoverFile || uploadingCoverPhoto}
                  onClick={handleCoverPhotoUpload}
                  type="button"
                >
                  {uploadingCoverPhoto ? text.coverPhoto.updating : text.coverPhoto.updateButton}
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

            <section id="basic-info" className="scroll-mt-24 space-y-6">
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
              </FieldGroup>
            </section>

            <section id="location" className="scroll-mt-24 space-y-6">
              <FieldGroup>
                <FieldSeparator>{text.fields.sectionLocation}</FieldSeparator>

                <Field>
                  <FieldLabel htmlFor="country">{text.fields.country}</FieldLabel>
                  <FieldContent>
                    <Select name="country" value={country} onValueChange={setCountry}>
                      <SelectTrigger className="w-full" id="country">
                        <SelectValue placeholder={text.fields.country} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={toFieldMessages(state.fieldErrors.country)} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="city">{text.fields.city}</FieldLabel>
                  <FieldContent>
                    <Select
                      name="city"
                      value={city}
                      onValueChange={(value) => {
                        setCity(value);
                        const nextDistrictOptions = getCommunityDistrictOptions(value);
                        setDistrict(nextDistrictOptions[0]?.value ?? "");
                      }}
                    >
                      <SelectTrigger className="w-full" id="city">
                        <SelectValue placeholder={text.fields.city} />
                      </SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={toFieldMessages(state.fieldErrors.city)} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="district">{text.fields.district}</FieldLabel>
                  <FieldContent>
                    <Select name="district" value={district} onValueChange={setDistrict} disabled={!city}>
                      <SelectTrigger className="w-full" id="district">
                        <SelectValue placeholder={text.fields.district} />
                      </SelectTrigger>
                      <SelectContent>
                        {districtOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={toFieldMessages(state.fieldErrors.district)} />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </section>

            <section id="professional" className="scroll-mt-24 space-y-6">
              <FieldGroup>
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
              </FieldGroup>
            </section>

            <section id="links-visibility" className="scroll-mt-24 space-y-6">
              <FieldGroup>
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

                <Field id="privacy" className="scroll-mt-24">
                  <FieldLabel htmlFor="profileVisibility">{text.fields.profileVisibility}</FieldLabel>
                  <FieldContent>
                    <Select name="profileVisibility" value={profileVisibility} onValueChange={setProfileVisibility}>
                      <SelectTrigger className="w-full" id="profileVisibility">
                        <SelectValue placeholder={text.fields.profileVisibility} />
                      </SelectTrigger>
                      <SelectContent>
                        {getVisibilityOptions(profileVisibility).map((option) => (
                          <SelectItem key={option} value={option}>
                            {getVisibilityLabel(option, text.visibility)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={toFieldMessages(state.fieldErrors.profileVisibility)} />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </section>

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

function formatFileSize(size: number, locale: string) {
  if (size < 1024) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "byte",
      unitDisplay: "narrow",
    }).format(size);
  }

  if (size < 1024 * 1024) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      style: "unit",
      unit: "kilobyte",
      unitDisplay: "narrow",
    }).format(size / 1024);
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    style: "unit",
    unit: "megabyte",
    unitDisplay: "narrow",
  }).format(size / (1024 * 1024));
}

function validateAvatarFile(
  file: File,
  messages: {
    fileTooLarge: string;
    validImage: string;
  },
  maxBytes = MAX_AVATAR_BYTES,
) {
  if (!file || file.size <= 0) {
    return messages.validImage;
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return messages.validImage;
  }

  if (file.size > maxBytes) {
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

