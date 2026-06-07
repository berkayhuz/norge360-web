"use client";

import { type CSSProperties, type Dispatch, type PointerEvent, type RefObject, type SetStateAction, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
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
import { Slider } from "@workspace/ui/components/primitives/slider";
import { Textarea } from "@workspace/ui/components/forms/textarea";
import { ChevronRight, Crop, Move, Search, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  normalizeAvatarUploadIntent,
  normalizeMyProfile,
  type MyProfile,
  type UpdateMyProfileInput,
} from "@/lib/api/accounts-types";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/data-display/avatar";
import { buildCountryOptions } from "@/features/profile/lib/profile-country-options";
import {
  COMMUNITY_LOCATION_OPTIONS,
  getCommunityDistrictOptions,
  normalizeCommunityCityValue,
  normalizeCommunityDistrictValue,
} from "@/features/community/lib/location-options";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { optimizeImageFile } from "@/lib/image-optimize";
import { cn } from "@workspace/ui/lib/utils";

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

const MAX_AVATAR_BYTES = 1 * 1024 * 1024;
const MAX_COVER_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 1024;
const MAX_COVER_PHOTO_DIMENSION = 2400;
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
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [coverPhotoDialogOpen, setCoverPhotoDialogOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const [coverPhotoImageSize, setCoverPhotoImageSize] = useState<{ width: number; height: number } | null>(null);
  const [coverPhotoFrameSize, setCoverPhotoFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [coverPhotoZoom, setCoverPhotoZoom] = useState(1);
  const [coverPhotoOffset, setCoverPhotoOffset] = useState({ x: 0, y: 0 });
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
  const avatarPreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );
  const coverPhotoPreviewUrl = useMemo(
    () => (selectedCoverFile ? URL.createObjectURL(selectedCoverFile) : null),
    [selectedCoverFile],
  );
  const coverPhotoCropFrameRef = useRef<HTMLDivElement | null>(null);
  const coverPhotoDragStateRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const countryOptions = useMemo(() => buildCountryOptions(locale, country), [country, locale]);
  const cityOptions = COMMUNITY_LOCATION_OPTIONS;
  const districtOptions = useMemo(() => getCommunityDistrictOptions(city), [city]);
  const translate = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const coverPhotoEffectiveOffset = clampCoverPhotoOffset(coverPhotoOffset);
  useEffect(() => {
    if (state.successMessage) {
      router.refresh();
    }
  }, [router, state.successMessage]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (coverPhotoPreviewUrl) {
        URL.revokeObjectURL(coverPhotoPreviewUrl);
      }
    };
  }, [coverPhotoPreviewUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      setCountry(initialValues.country);
      setCity(normalizeCommunityCityValue(initialValues.city));
      setDistrict(normalizeCommunityDistrictValue(initialValues.city, initialValues.district));
      setProfileVisibility(initialValues.profileVisibility || "Public");
    });
  }, [initialValues.city, initialValues.country, initialValues.district, initialValues.profileVisibility]);

  useEffect(() => {
    const nextDistrictOptions = getCommunityDistrictOptions(city);
    if (nextDistrictOptions.length === 0) {
      queueMicrotask(() => setDistrict(""));
      return;
    }

    if (!nextDistrictOptions.some((option) => option.value === district)) {
      queueMicrotask(() => setDistrict(nextDistrictOptions[0]?.value ?? ""));
    }
  }, [city, district]);

  const text = {
    avatar: {
      attachFailed: t("settings.avatar.attachFailed"),
      cancelButton: t("settings.avatar.cancelButton"),
      chooseImageButton: t("settings.avatar.chooseImageButton"),
      currentPreviewLabel: t("settings.avatar.currentPreviewLabel"),
      dialogDescription: t("settings.avatar.dialogDescription"),
      dialogTitle: t("settings.avatar.dialogTitle"),
      newPreviewLabel: t("settings.avatar.newPreviewLabel"),
      optional: t("settings.avatar.optional"),
      profileUnreadable: t("settings.avatar.profileUnreadable"),
      saveButton: t("settings.avatar.saveButton"),
      unexpectedError: t("settings.avatar.unexpectedError"),
      uploadFailed: t("settings.avatar.uploadFailed"),
      uploadFormatError: t("settings.avatar.uploadFormatError"),
      uploadStartError: t("settings.avatar.uploadStartError"),
      validImage: t("settings.avatar.validImage"),
      updating: t("settings.avatar.updating"),
    },
    coverPhoto: {
      attachFailed: t("settings.coverPhoto.attachFailed"),
      cancelButton: t("settings.coverPhoto.cancelButton"),
      chooseImageButton: t("settings.coverPhoto.chooseImageButton"),
      description: t("settings.coverPhoto.description"),
      dialogDescription: t("settings.coverPhoto.dialogDescription"),
      dialogTitle: t("settings.coverPhoto.dialogTitle"),
      currentPreviewLabel: t("settings.coverPhoto.currentPreviewLabel"),
      fileDefault: t("settings.coverPhoto.fileDefault"),
      fileLabel: t("settings.coverPhoto.fileLabel"),
      optional: t("settings.coverPhoto.optional"),
      newPreviewLabel: t("settings.coverPhoto.newPreviewLabel"),
      profileUnreadable: t("settings.coverPhoto.profileUnreadable"),
      saveButton: t("settings.coverPhoto.saveButton"),
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
      sectionLinks: t("settings.fields.sectionLinks"),
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
    const uploaded = await uploadProfileMedia({
      completePath: "/api/accounts/profiles/me/avatar/complete",
      file: selectedFile,
      fileInputRef,
      intentPath: "/api/accounts/profiles/me/avatar/upload-intent",
      setError: setAvatarError,
      setFile: setSelectedFile,
      setSuccess: setAvatarSuccess,
      setUploading: setUploadingAvatar,
      successMessage: t("settings.alert.successMessage"),
      uploadFailedMessage: text.avatar.uploadFailed,
      uploadFormatErrorMessage: text.avatar.uploadFormatError,
      uploadStartErrorMessage: text.avatar.uploadStartError,
      attachFailedMessage: text.avatar.attachFailed,
      profileUnreadableMessage: text.avatar.profileUnreadable,
      unexpectedErrorMessage: text.avatar.unexpectedError,
      validFileMessage: text.avatar.validImage,
      maxBytes: MAX_AVATAR_BYTES,
      maxDimension: MAX_AVATAR_DIMENSION,
    });

    if (uploaded) {
      setAvatarDialogOpen(false);
    }
  }

  async function handleCoverPhotoUpload() {
    if (!selectedCoverFile) {
      setCoverPhotoError(text.coverPhoto.validImage);
      return;
    }

    if (!coverPhotoFrameSize || !coverPhotoImageSize) {
      setCoverPhotoError(text.coverPhoto.unexpectedError);
      return;
    }

    const clientValidationError = validateAvatarFile(selectedCoverFile, {
      validImage: text.coverPhoto.validImage,
    });
    if (clientValidationError) {
      setCoverPhotoError(clientValidationError);
      return;
    }

    setUploadingCoverPhoto(true);
    setCoverPhotoError(null);
    setCoverPhotoSuccess(null);

    try {
      const croppedFile = await cropCoverPhotoFile(selectedCoverFile, {
        frameSize: coverPhotoFrameSize,
        imageSize: coverPhotoImageSize,
        offset: coverPhotoEffectiveOffset,
        previewUrl: coverPhotoPreviewUrl ?? "",
        zoom: coverPhotoZoom,
      });

      const uploaded = await uploadProfileMedia({
        completePath: "/api/accounts/profiles/me/cover-photo/complete",
        file: croppedFile,
        fileInputRef: coverPhotoInputRef,
        intentPath: "/api/accounts/profiles/me/cover-photo/upload-intent",
        setError: setCoverPhotoError,
        setFile: setSelectedCoverFile,
        setSuccess: setCoverPhotoSuccess,
        setUploading: setUploadingCoverPhoto,
        successMessage: t("settings.alert.successMessage"),
        uploadFailedMessage: text.coverPhoto.uploadFailed,
        uploadFormatErrorMessage: text.coverPhoto.uploadFormatError,
        uploadStartErrorMessage: text.coverPhoto.uploadStartError,
        attachFailedMessage: text.coverPhoto.attachFailed,
        profileUnreadableMessage: text.coverPhoto.profileUnreadable,
        unexpectedErrorMessage: text.coverPhoto.unexpectedError,
        validFileMessage: text.coverPhoto.validImage,
        maxBytes: MAX_COVER_PHOTO_BYTES,
        maxDimension: MAX_COVER_PHOTO_DIMENSION,
      });

      if (uploaded) {
        resetCoverPhotoEditorState();
        setCoverPhotoDialogOpen(false);
      }
    } catch {
      setCoverPhotoError(text.coverPhoto.unexpectedError);
      setUploadingCoverPhoto(false);
    }
  }

  function resetCoverPhotoEditorState() {
    setCoverPhotoZoom(1);
    setCoverPhotoOffset({ x: 0, y: 0 });
    setCoverPhotoImageSize(null);
    setCoverPhotoFrameSize(null);
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
    uploadFailedMessage,
    uploadFormatErrorMessage,
    uploadStartErrorMessage,
    validFileMessage,
    maxBytes,
    maxDimension,
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
    uploadFailedMessage: string;
    uploadFormatErrorMessage: string;
    uploadStartErrorMessage: string;
    validFileMessage: string;
    maxBytes: number;
    maxDimension: number;
  }): Promise<boolean> {
    if (!file) {
      setError(validFileMessage);
      return false;
    }

    const clientValidationError = validateAvatarFile(
      file,
      {
        validImage: validFileMessage,
      },
    );
    if (clientValidationError) {
      setError(clientValidationError);
      return false;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let uploadFile: File;
      try {
        uploadFile = await optimizeImageFile(file, {
          maxBytes,
          maxDimension,
        });
      } catch {
        setError(uploadFailedMessage);
        return false;
      }

      const intentResponse = await fetch(intentPath, {
        body: JSON.stringify({
          contentLength: uploadFile.size,
          contentType: uploadFile.type,
          fileName: uploadFile.name,
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
        return false;
      }

      const intent = normalizeAvatarUploadIntent(intentData);
      if (!intent) {
        setError(uploadFormatErrorMessage);
        return false;
      }

      const uploadHeaders = new Headers();
      if (intent.headers) {
        for (const [key, value] of Object.entries(intent.headers)) {
          uploadHeaders.set(key, value);
        }
      }

      if (!uploadHeaders.has("Content-Type")) {
        uploadHeaders.set("Content-Type", uploadFile.type);
      }

      const uploadResponse = await fetch(intent.uploadUrl, {
        body: uploadFile,
        credentials: "omit",
        headers: uploadHeaders,
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        setError(uploadFailedMessage);
        return false;
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
        return false;
      }

      const normalizedProfile = normalizeMyProfile(completeData);
      if (!normalizedProfile) {
        setError(profileUnreadableMessage);
        return false;
      }

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccess(successMessage);
      router.refresh();
      return true;
    } catch {
      setError(unexpectedErrorMessage);
    } finally {
      setUploading(false);
    }

    return false;
  }

  function clampCoverPhotoOffset(nextOffset: { x: number; y: number }) {
    if (!coverPhotoFrameSize || !coverPhotoImageSize) {
      return nextOffset;
    }

    const displayScale = getCoverPhotoDisplayScale(
      coverPhotoFrameSize.width,
      coverPhotoFrameSize.height,
      coverPhotoImageSize.width,
      coverPhotoImageSize.height,
      coverPhotoZoom,
    );
    const displayWidth = coverPhotoImageSize.width * displayScale;
    const displayHeight = coverPhotoImageSize.height * displayScale;
    const limitX = Math.max(0, (displayWidth - coverPhotoFrameSize.width) / 2);
    const limitY = Math.max(0, (displayHeight - coverPhotoFrameSize.height) / 2);

    return {
      x: clamp(nextOffset.x, -limitX, limitX),
      y: clamp(nextOffset.y, -limitY, limitY),
    };
  }

  function handleCoverPhotoPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectedCoverFile || !coverPhotoImageSize || !coverPhotoFrameSize) {
      return;
    }

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    coverPhotoDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: coverPhotoEffectiveOffset.x,
      offsetY: coverPhotoEffectiveOffset.y,
    };
  }

  function handleCoverPhotoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = coverPhotoDragStateRef.current;
    if (!dragState || !selectedCoverFile || !coverPhotoFrameSize || !coverPhotoImageSize) {
      return;
    }

    const displayScale = getCoverPhotoDisplayScale(
      coverPhotoFrameSize.width,
      coverPhotoFrameSize.height,
      coverPhotoImageSize.width,
      coverPhotoImageSize.height,
      coverPhotoZoom,
    );
    const displayWidth = coverPhotoImageSize.width * displayScale;
    const displayHeight = coverPhotoImageSize.height * displayScale;
    const limitX = Math.max(0, (displayWidth - coverPhotoFrameSize.width) / 2);
    const limitY = Math.max(0, (displayHeight - coverPhotoFrameSize.height) / 2);

    setCoverPhotoOffset({
      x: clamp(dragState.offsetX + (event.clientX - dragState.startX), -limitX, limitX),
      y: clamp(dragState.offsetY + (event.clientY - dragState.startY), -limitY, limitY),
    });
  }

  function handleCoverPhotoPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!coverPhotoDragStateRef.current) {
      return;
    }

    coverPhotoDragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  useEffect(() => {
    const frame = coverPhotoCropFrameRef.current;
    if (!frame) {
      return;
    }

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect();
      setCoverPhotoFrameSize({ width: rect.width, height: rect.height });
    };

    const observer = new ResizeObserver(updateFrameSize);
    updateFrameSize();
    observer.observe(frame);
    return () => observer.disconnect();
  }, [coverPhotoDialogOpen, selectedCoverFile]);

  return (
    <Card className="border-none bg-transparent rounded-none shadow-none ring-0">
      <CardHeader className="sr-only">
        <CardTitle>{text.titles.title}</CardTitle>
        <CardDescription>{text.titles.description}</CardDescription>
      </CardHeader>
      <div className="space-y-6">
        <section id="basic-info" className="scroll-mt-24">
          <FieldGroup>
            <Field>
              <div id="avatar" className="scroll-mt-24">
                <button
                  type="button"
                  className="cursor-pointer group flex w-full items-center justify-between gap-4 bg-transparent text-left"
                  aria-haspopup="dialog"
                  disabled={uploadingAvatar}
                  onClick={() => {
                    setAvatarDialogOpen(true);
                  }}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">{text.titles.avatar}</p>
                    <p className="text-sm text-muted-foreground">{text.avatar.dialogDescription}</p>
                  </div>
                  <ChevronRight className="w-8 h-8 p-1 rounded-full shrink-0 text-muted-foreground transition-transform group-hover:bg-muted" />
                </button>
              </div>
            </Field>
            <Field>
              <div id="cover-photo" className="scroll-mt-24">
                <button
                  type="button"
                  className="cursor-pointer group flex w-full items-center justify-between gap-4 bg-transparent text-left"
                  aria-haspopup="dialog"
                  disabled={uploadingCoverPhoto}
                  onClick={() => {
                    setCoverPhotoDialogOpen(true);
                  }}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">{text.coverPhoto.title}</p>
                    <p className="text-sm text-muted-foreground">{text.coverPhoto.hint}</p>
                  </div>
                  <ChevronRight className="w-8 h-8 p-1 rounded-full shrink-0 text-muted-foreground transition-transform group-hover:bg-muted" />
                </button>
              </div>
            </Field>
          </FieldGroup>
        </section>

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

          <section id="basic-info" className="scroll-mt-24">
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

          <section id="location" className="scroll-mt-24">
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

          <section id="professional" className="scroll-mt-24">
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

          <section id="links-visibility" className="scroll-mt-24">
            <FieldGroup>
              <FieldSeparator>{text.fields.sectionLinks}</FieldSeparator>

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
            </FieldGroup>
          </section>

          <div className="flex justify-end">
            <Button disabled={pending} type="submit">
              {pending ? t("settings.actions.saving") : t("settings.actions.save")}
            </Button>
          </div>
        </form>
      </div>
      <Dialog
        open={avatarDialogOpen}
        onOpenChange={(open) => {
          setAvatarDialogOpen(open);
          if (!open) {
            setSelectedFile(null);
            setAvatarError(null);
            setAvatarSuccess(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        }}
      >
        <DialogContent className="max-w-full w-full overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="text-xl font-semibold">{text.avatar.dialogTitle}</DialogTitle>
            <DialogDescription className="sr-only">{text.avatar.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="flex items-center justify-center">
              <div className="space-y-3">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-background p-4">
                  {avatarPreviewUrl ? (
                    <div className="flex aspect-square items-center justify-center">
                      <Avatar className="size-28 sm:size-32">
                        <AvatarImage alt={selectedFile?.name ?? username} src={avatarPreviewUrl} />
                        <AvatarFallback>{toInitials(username)}</AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center">
                      <Avatar className="size-28 sm:size-32">
                        <AvatarImage alt={username} src={avatarUrl ?? undefined} />
                        <AvatarFallback>{toInitials(username)}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    rounded="full"
                    className="px-5"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    {text.avatar.chooseImageButton}
                  </Button>
                </div>
              </div>
            </div>

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

            <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvatarDialogOpen(false)}
              >
                {text.avatar.cancelButton}
              </Button>
              <Button
                type="button"
                disabled={!selectedFile || uploadingAvatar}
                onClick={() => void handleAvatarUpload()}
              >
                {uploadingAvatar ? text.avatar.updating : text.avatar.saveButton}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
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

      <Input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
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
          resetCoverPhotoEditorState();
        }}
        type="file"
      />

      <Dialog
        open={coverPhotoDialogOpen}
        onOpenChange={(open) => {
          setCoverPhotoDialogOpen(open);
          if (!open) {
            setSelectedCoverFile(null);
            setCoverPhotoError(null);
            setCoverPhotoSuccess(null);
            resetCoverPhotoEditorState();
            if (coverPhotoInputRef.current) {
              coverPhotoInputRef.current.value = "";
            }
          }
        }}
      >
        <DialogContent className="max-w-[56rem] overflow-hidden p-0 sm:max-w-[56rem]">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="text-xl font-semibold">{text.coverPhoto.dialogTitle}</DialogTitle>
            <DialogDescription className="sr-only">{text.coverPhoto.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {selectedCoverFile ? text.coverPhoto.newPreviewLabel : text.coverPhoto.currentPreviewLabel}
                </p>
                <p className="text-xs text-muted-foreground">{text.coverPhoto.hint}</p>
              </div>

              <div
                ref={coverPhotoCropFrameRef}
                className={cn(
                  "relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-black/95",
                  selectedCoverFile ? "aspect-[3/1] cursor-grab" : "aspect-[3/1]",
                )}
                onPointerDown={selectedCoverFile ? handleCoverPhotoPointerDown : undefined}
                onPointerMove={selectedCoverFile ? handleCoverPhotoPointerMove : undefined}
                onPointerUp={selectedCoverFile ? handleCoverPhotoPointerUp : undefined}
                onPointerLeave={selectedCoverFile ? handleCoverPhotoPointerUp : undefined}
              >
                {selectedCoverFile && coverPhotoPreviewUrl ? (
                  <>
                    <CoverPhotoCropImage
                      fileName={selectedCoverFile.name}
                      previewUrl={coverPhotoPreviewUrl}
                      alt={selectedCoverFile.name}
                      frameSize={coverPhotoFrameSize}
                      imageSize={coverPhotoImageSize}
                      offset={coverPhotoEffectiveOffset}
                      zoom={coverPhotoZoom}
                      onImageSize={setCoverPhotoImageSize}
                    />
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 border border-white/20" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />
                    </div>
                  </>
                ) : coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- The existing remote cover photo is shown as a direct preview in a fixed crop frame.
                  <img alt={username} className="h-full w-full object-cover" src={coverPhotoUrl} />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-muted/30">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <p className="max-w-72 text-sm text-muted-foreground">{text.coverPhoto.dialogDescription}</p>
                  </div>
                )}
              </div>

              {selectedCoverFile ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Move className="size-3.5" />
                  {translate("imageEditor.dragHint")}
                </div>
              ) : null}
            </div>

            <div className="space-y-5 border-t border-border/60 pt-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              {selectedCoverFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{translate("imageEditor.zoom")}</p>
                    <span className="text-xs text-muted-foreground">{Math.round(coverPhotoZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <Slider
                      min={1}
                      max={3}
                      step={0.01}
                      value={[coverPhotoZoom]}
                      onValueChange={(value) => setCoverPhotoZoom(value[0] ?? 1)}
                    />
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {text.coverPhoto.hint}
                </p>
              )}

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  rounded="full"
                  className="px-5"
                  disabled={uploadingCoverPhoto}
                  onClick={() => coverPhotoInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {text.coverPhoto.chooseImageButton}
                </Button>
              </div>

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

              <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="outline" onClick={() => setCoverPhotoDialogOpen(false)}>
                  {text.coverPhoto.cancelButton}
                </Button>
                <Button
                  type="button"
                  disabled={!selectedCoverFile || !coverPhotoFrameSize || !coverPhotoImageSize || uploadingCoverPhoto}
                  onClick={() => void handleCoverPhotoUpload()}
                >
                  <Crop className="size-4" />
                  {uploadingCoverPhoto ? text.coverPhoto.updating : text.coverPhoto.updateButton}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card >
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

function CoverPhotoCropImage({
  alt,
  fileName,
  frameSize,
  imageSize,
  offset,
  onImageSize,
  previewUrl,
  zoom,
}: {
  alt: string;
  fileName: string;
  frameSize: { width: number; height: number } | null;
  imageSize: { width: number; height: number } | null;
  offset: { x: number; y: number };
  onImageSize: Dispatch<SetStateAction<{ width: number; height: number } | null>>;
  previewUrl: string;
  zoom: number;
}) {
  const style = useMemo<CSSProperties | undefined>(
    () => getCoverPhotoImageStyle(imageSize, frameSize, zoom, offset),
    [frameSize, imageSize, offset, zoom],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element -- The cropper needs the source image and native dimensions.
    <img
      src={previewUrl}
      alt={alt || fileName}
      className="absolute left-1/2 top-1/2 max-w-none select-none"
      draggable={false}
      style={style}
      onLoad={(event) => {
        const target = event.currentTarget;
        onImageSize({
          width: target.naturalWidth,
          height: target.naturalHeight,
        });
      }}
    />
  );
}

function getCoverPhotoImageStyle(
  imageSize: { width: number; height: number } | null,
  frameSize: { width: number; height: number } | null,
  zoom: number,
  offset: { x: number; y: number },
): CSSProperties | undefined {
  if (!imageSize || !frameSize) {
    return {
      transform: "translate(-50%, -50%)",
    };
  }

  const displayScale = getCoverPhotoDisplayScale(frameSize.width, frameSize.height, imageSize.width, imageSize.height, zoom);

  return {
    width: `${Math.round(imageSize.width * displayScale)}px`,
    height: `${Math.round(imageSize.height * displayScale)}px`,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    transformOrigin: "center center",
  };
}

function getCoverPhotoDisplayScale(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
  zoom: number,
) {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
}

async function cropCoverPhotoFile(
  file: File,
  options: {
    frameSize: { width: number; height: number } | null;
    imageSize: { width: number; height: number } | null;
    offset: { x: number; y: number };
    previewUrl: string;
    zoom: number;
  },
) {
  if (!options.frameSize || !options.imageSize) {
    return file;
  }

  const displayScale = getCoverPhotoDisplayScale(
    options.frameSize.width,
    options.frameSize.height,
    options.imageSize.width,
    options.imageSize.height,
    options.zoom,
  );
  const displayedWidth = options.imageSize.width * displayScale;
  const displayedHeight = options.imageSize.height * displayScale;
  const imageLeft = (options.frameSize.width - displayedWidth) / 2 + options.offset.x;
  const imageTop = (options.frameSize.height - displayedHeight) / 2 + options.offset.y;
  const cropWidth = options.frameSize.width / displayScale;
  const cropHeight = options.frameSize.height / displayScale;
  const sourceX = clamp((-imageLeft) / displayScale, 0, options.imageSize.width - cropWidth);
  const sourceY = clamp((-imageTop) / displayScale, 0, options.imageSize.height - cropHeight);
  const sourceImage = await loadImage(options.previewUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth));
  canvas.height = Math.max(1, Math.round(cropHeight));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create cover photo crop canvas");
  }

  context.drawImage(sourceImage, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Unable to export cover photo crop"));
          return;
        }

        resolve(value);
      },
      file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg",
      0.95,
    );
  });

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const nextFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.${extension}`, {
    type: blob.type || file.type,
    lastModified: file.lastModified,
  });

  let optimizedFile = nextFile;
  try {
    optimizedFile = await optimizeImageFile(nextFile, {
      maxBytes: MAX_COVER_PHOTO_BYTES,
      maxDimension: MAX_COVER_PHOTO_DIMENSION,
    });
  } catch {
    optimizedFile = nextFile;
  }

  return optimizedFile;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateAvatarFile(
  file: File,
  messages: {
    validImage: string;
  },
) {
  if (!file || file.size <= 0) {
    return messages.validImage;
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return messages.validImage;
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
