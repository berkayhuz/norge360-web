export type ProfileOnboardingState = {
  dismissed: boolean;
  dismissedAt: string;
  version: 1;
};

export type ProfileOnboardingIdentity = {
  authUserId?: string | null;
  username?: string | null;
};

const STORAGE_PREFIX = "norge360.profileOnboarding.v1.dismissed";

export function buildProfileOnboardingStorageKey(identity: ProfileOnboardingIdentity) {
  const authUserId = normalizeIdentityPart(identity.authUserId);
  if (authUserId) {
    return `${STORAGE_PREFIX}.user.${authUserId}`;
  }

  const username = normalizeUsername(identity.username);
  if (username) {
    return `${STORAGE_PREFIX}.username.${username}`;
  }

  return null;
}

export function readProfileOnboardingState(key: string): ProfileOnboardingState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ProfileOnboardingState>;
    if (
      parsed &&
      parsed.dismissed === true &&
      typeof parsed.dismissedAt === "string" &&
      parsed.dismissedAt.length > 0 &&
      parsed.version === 1
    ) {
      return {
        dismissed: true,
        dismissedAt: parsed.dismissedAt,
        version: 1,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function writeProfileOnboardingDismissed(key: string) {
  const state: ProfileOnboardingState = {
    dismissed: true,
    dismissedAt: new Date().toISOString(),
    version: 1,
  };

  window.localStorage.setItem(key, JSON.stringify(state));
}

function normalizeIdentityPart(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUsername(value: string | null | undefined) {
  const normalized = normalizeIdentityPart(value);
  return normalized ? normalized.toLowerCase() : null;
}
