import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/feedback/alert";
import { getTranslations } from "next-intl/server";

import {
  ProfileSettingsForm,
  type ProfileSettingsFormState,
  type ProfileSettingsValues,
} from "@/features/profile/components/profile-settings-form";
import { ProfileSettingsSidebar } from "@/features/profile/components/profile-settings-sidebar";
import { buildProfileSettingsSidebarItems } from "@/features/profile/components/profile-settings-sidebar-data";
import type { MyProfile } from "@/lib/api/accounts-types";
import { getMyProfile, updateMyProfile } from "@/lib/api/accounts-server";

export default async function ProfileSettingsPage() {
  const t = await getTranslations("public-web");
  const myProfileResult = await getMyProfile();
  const settingsMessages = {
    alert: {
      forbiddenMessage: t("settings.alert.forbiddenMessage"),
      notFoundMessage: t("settings.alert.notFoundMessage"),
      successMessage: t("settings.alert.successMessage"),
      unauthorizedMessage: t("settings.alert.unauthorizedMessage"),
      unexpectedMessage: t("settings.alert.unexpectedMessage"),
      upstreamMessage: t("settings.alert.upstreamMessage"),
      validationMessage: t("settings.alert.validationMessage"),
    },
    status: {
      accessRestrictedDescription: t("settings.accessRestrictedDescription"),
      accessRestrictedTitle: t("settings.accessRestrictedTitle"),
      loginRequiredDescription: t("settings.loginRequiredDescription"),
      loginRequiredTitle: t("settings.loginRequiredTitle"),
      notFoundDescription: t("settings.notFoundDescription"),
      notFoundTitle: t("settings.notFoundTitle"),
      preparingDescription: t("settings.preparingDescription"),
      preparingTitle: t("settings.preparingTitle"),
      serviceUnavailableDescription: t("settings.serviceUnavailableDescription"),
      serviceUnavailableTitle: t("settings.serviceUnavailableTitle"),
    },
  } as const;

  if (myProfileResult.kind === "unauthorized") {
    return renderAlert(
      settingsMessages.status.loginRequiredTitle,
      settingsMessages.status.loginRequiredDescription,
    );
  }

  if (myProfileResult.kind === "pending") {
    return renderAlert(
      settingsMessages.status.preparingTitle,
      settingsMessages.status.preparingDescription,
    );
  }

  if (myProfileResult.kind === "forbidden") {
    return renderAlert(
      settingsMessages.status.accessRestrictedTitle,
      settingsMessages.status.accessRestrictedDescription,
      "destructive",
    );
  }

  if (myProfileResult.kind === "notFound") {
    return renderAlert(
      settingsMessages.status.notFoundTitle,
      settingsMessages.status.notFoundDescription,
    );
  }

  if (myProfileResult.kind === "upstreamError") {
    return renderAlert(
      settingsMessages.status.serviceUnavailableTitle,
      settingsMessages.status.serviceUnavailableDescription,
      "destructive",
    );
  }

  const profile = myProfileResult.profile;
  const initialValues = toProfileSettingsValues(profile);
  const sidebarItems = buildProfileSettingsSidebarItems({
    accountPrivacy: "Hesap gizliliği",
    blockedUsers: "Engellenenler",
    commentPermissions: "Yorum izinleri",
    editProfile: t("profile.hero.editProfile"),
    hideLikeCounts: "Beğeni sayıları",
    notifications: t("settings.notifications.sidebarLabel"),
  });

  async function updateProfileAction(
    _prevState: ProfileSettingsFormState,
    formData: FormData,
  ): Promise<ProfileSettingsFormState> {
    "use server";

    const values = {
      bio: readFormText(formData, "bio"),
      city: readFormText(formData, "city"),
      company: readFormText(formData, "company"),
      country: readFormText(formData, "country"),
      displayName: readFormText(formData, "displayName"),
      district: readFormText(formData, "district"),
      occupation: readFormText(formData, "occupation"),
      profileVisibility: readFormText(formData, "profileVisibility"),
      website: readFormText(formData, "website"),
    };

    const updateResult = await updateMyProfile(toUpdateInput(values));

    if (updateResult.kind === "success") {
      return {
        fieldErrors: {},
        successMessage: settingsMessages.alert.successMessage,
        values: toProfileSettingsValues(updateResult.profile),
      };
    }

    if (updateResult.kind === "validationError") {
      return {
        fieldErrors: normalizeFieldErrors(updateResult.errors),
        formError: settingsMessages.alert.validationMessage,
        values,
      };
    }

    if (updateResult.kind === "unauthorized") {
      return {
        fieldErrors: {},
        formError: settingsMessages.alert.unauthorizedMessage,
        values,
      };
    }

    if (updateResult.kind === "forbidden") {
      return {
        fieldErrors: {},
        formError: settingsMessages.alert.forbiddenMessage,
        values,
      };
    }

    if (updateResult.kind === "notFound") {
      return {
        fieldErrors: {},
        formError: settingsMessages.alert.notFoundMessage,
        values,
      };
    }

    if (updateResult.kind === "upstreamError") {
      return {
        fieldErrors: {},
        formError: settingsMessages.alert.upstreamMessage,
        values,
      };
    }

    return {
      fieldErrors: {},
      formError: settingsMessages.alert.unexpectedMessage,
      values,
    };
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-2">
      <ProfileSettingsSidebar
        description={t("settings.description")}
        items={sidebarItems}
        title={t("settings.title")}
      />

      <div className="relative col-span-4 block w-full lg:col-span-3">
        <ProfileSettingsForm
          action={updateProfileAction}
          avatarUrl={profile.avatarUrl}
          coverPhotoUrl={profile.coverPhotoUrl}
          initialValues={initialValues}
          username={profile.username}
        />
      </div>
    </main>
  );
}

const FIELD_NAMES = [
  "displayName",
  "bio",
  "country",
  "city",
  "district",
  "occupation",
  "company",
  "website",
  "profileVisibility",
] as const;

type EditableField = (typeof FIELD_NAMES)[number];

function renderAlert(title: string, description: string, variant?: "destructive") {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Alert variant={variant}>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </main>
  );
}

function readFormText(formData: FormData, field: EditableField) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function normalizeFieldErrors(
  input: Record<string, string[]>,
): Partial<Record<EditableField, string[]>> {
  const output: Partial<Record<EditableField, string[]>> = {};
  const fieldSet = new Set<string>(FIELD_NAMES);

  for (const [rawKey, messages] of Object.entries(input)) {
    const normalizedKey = toClientFieldName(rawKey);
    if (!fieldSet.has(normalizedKey)) {
      continue;
    }

    output[normalizedKey as EditableField] = messages;
  }

  return output;
}

function toClientFieldName(key: string) {
  if (!key) return key;
  if (key[0] && key[0] === key[0].toUpperCase()) {
    return `${key[0].toLowerCase()}${key.slice(1)}`;
  }

  return key;
}

function toProfileSettingsValues(profile: MyProfile): ProfileSettingsValues {
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

function toUpdateInput(values: ProfileSettingsValues) {
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
