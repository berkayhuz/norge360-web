export type MyProfile = {
  accountType: string;
  authUserId: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  company: string | null;
  country: string | null;
  coverPhotoUrl: string | null;
  createdAt: string;
  displayName: string | null;
  district: string | null;
  followersCount: number;
  followingCount: number;
  id: string;
  isVerified: boolean;
  lastSeenAt: string | null;
  normalizedUsername: string;
  occupation: string | null;
  postsCount: number;
  profileVisibility: string;
  updatedAt: string | null;
  username: string;
  website: string | null;
};

export type PublicProfile = {
  accountType: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  company: string | null;
  country: string | null;
  coverPhotoUrl: string | null;
  createdAt: string | null;
  displayName: string | null;
  district: string | null;
  followersCount: number | null;
  followingCount: number | null;
  id: string;
  isVerified: boolean;
  lastSeenAt: string | null;
  occupation: string | null;
  postsCount: number | null;
  profileVisibility: string;
  updatedAt: string | null;
  username: string;
  website: string | null;
};

export type UsernameAvailability = {
  isAvailable: boolean;
  normalizedUsername: string;
  reason: string | null;
  suggestedUsername: string | null;
  username: string;
};

export type AccountsProblemDetails = {
  correlationId?: string;
  detail?: string;
  errors?: FieldErrors;
  errorCode?: string;
  instance?: string;
  status?: number;
  title?: string;
  traceId?: string;
  type?: string;
};

export type FieldErrors = Record<string, string[]>;

export type UpdateMyProfileInput = {
  bio?: string | null;
  city?: string | null;
  company?: string | null;
  country?: string | null;
  displayName?: string | null;
  district?: string | null;
  occupation?: string | null;
  profileVisibility?: string | null;
  website?: string | null;
};

export type CreateAvatarUploadIntentInput = {
  contentLength: number;
  contentType: string;
  fileName?: string | null;
};

export type AvatarUploadIntent = {
  expiresAt: string;
  headers?: Record<string, string>;
  method: "PUT";
  publicUrl: string;
  storageKey: string;
  uploadUrl: string;
};

export type CompleteAvatarUploadInput = {
  storageKey: string;
};

export type GetMyProfileResult =
  | { kind: "success"; profile: MyProfile }
  | { kind: "unauthorized"; problem?: AccountsProblemDetails }
  | { kind: "forbidden"; problem?: AccountsProblemDetails }
  | { kind: "pending"; problem?: AccountsProblemDetails }
  | { kind: "notFound"; problem?: AccountsProblemDetails }
  | { kind: "upstreamError"; problem?: AccountsProblemDetails; status?: number };

export type GetPublicProfileResult =
  | { kind: "success"; profile: PublicProfile }
  | { kind: "notFound"; problem?: AccountsProblemDetails }
  | { kind: "forbidden"; problem?: AccountsProblemDetails }
  | { kind: "invalidUsername"; reason: string }
  | { kind: "upstreamError"; problem?: AccountsProblemDetails; status?: number }
  | { kind: "unknownError"; status?: number; problem?: AccountsProblemDetails };

export type AuthSessionStatus = {
  accountStatus: string;
  email: string;
  emailConfirmed: boolean;
  mfaVerifiedAt: string | null;
  permissions: string[];
  roles: string[];
  sessionId: string;
  userId: string;
};

export type GetAuthSessionResult =
  | { kind: "authenticated"; session: AuthSessionStatus }
  | { kind: "unauthenticated"; status: 401 | 403 }
  | { kind: "upstreamError"; status?: number };

export type CheckUsernameAvailabilityResult =
  | { kind: "available"; response: UsernameAvailability }
  | { kind: "unavailable"; response: UsernameAvailability }
  | { kind: "invalid"; reason: string; response?: UsernameAvailability }
  | { kind: "upstreamError"; problem?: AccountsProblemDetails; status?: number }
  | { kind: "unknownError"; status?: number; problem?: AccountsProblemDetails };

export type UpdateMyProfileResult =
  | { kind: "success"; profile: MyProfile }
  | {
      kind: "validationError";
      errors: FieldErrors;
      message?: string;
      problem?: AccountsProblemDetails;
    }
  | { kind: "unauthorized"; problem?: AccountsProblemDetails }
  | { kind: "forbidden"; problem?: AccountsProblemDetails }
  | { kind: "notFound"; problem?: AccountsProblemDetails }
  | { kind: "upstreamError"; message?: string; problem?: AccountsProblemDetails; status?: number }
  | { kind: "unknownError"; message?: string; problem?: AccountsProblemDetails; status?: number };

export type CreateAvatarUploadIntentResult =
  | { kind: "success"; intent: AvatarUploadIntent }
  | {
      kind: "validationError";
      errors: FieldErrors;
      message?: string;
      problem?: AccountsProblemDetails;
    }
  | { kind: "unauthorized"; problem?: AccountsProblemDetails }
  | { kind: "forbidden"; problem?: AccountsProblemDetails }
  | { kind: "upstreamError"; message?: string; problem?: AccountsProblemDetails; status?: number }
  | { kind: "unknownError"; message?: string; problem?: AccountsProblemDetails; status?: number };

export type CompleteAvatarUploadResult =
  | { kind: "success"; profile: MyProfile }
  | {
      kind: "validationError";
      errors: FieldErrors;
      message?: string;
      problem?: AccountsProblemDetails;
    }
  | { kind: "unauthorized"; problem?: AccountsProblemDetails }
  | { kind: "forbidden"; problem?: AccountsProblemDetails }
  | { kind: "notFound"; problem?: AccountsProblemDetails }
  | { kind: "upstreamError"; message?: string; problem?: AccountsProblemDetails; status?: number }
  | { kind: "unknownError"; message?: string; problem?: AccountsProblemDetails; status?: number };

export function normalizeMyProfile(input: unknown): MyProfile | null {
  const source = asRecord(input);
  if (!source) return null;

  const id = readString(source, "id", "Id");
  const authUserId = readString(source, "authUserId", "AuthUserId");
  const username = readString(source, "username", "Username");
  const normalizedUsername = readString(source, "normalizedUsername", "NormalizedUsername");
  const createdAt = readString(source, "createdAt", "CreatedAt");
  const accountType = readString(source, "accountType", "AccountType");
  const profileVisibility = readString(source, "profileVisibility", "ProfileVisibility");
  const isVerified = readBoolean(source, "isVerified", "IsVerified");
  const followersCount = readNumber(source, "followersCount", "FollowersCount");
  const followingCount = readNumber(source, "followingCount", "FollowingCount");
  const postsCount = readNumber(source, "postsCount", "PostsCount");

  if (
    !id ||
    !authUserId ||
    !username ||
    !normalizedUsername ||
    !createdAt ||
    !accountType ||
    !profileVisibility ||
    isVerified === null ||
    followersCount === null ||
    followingCount === null ||
    postsCount === null
  ) {
    return null;
  }

  return {
    accountType,
    authUserId,
    avatarUrl: readNullableString(source, "avatarUrl", "AvatarUrl"),
    bio: readNullableString(source, "bio", "Bio"),
    city: readNullableString(source, "city", "City"),
    company: readNullableString(source, "company", "Company"),
    country: readNullableString(source, "country", "Country"),
    coverPhotoUrl: readNullableString(source, "coverPhotoUrl", "CoverPhotoUrl"),
    createdAt,
    displayName: readNullableString(source, "displayName", "DisplayName"),
    district: readNullableString(source, "district", "District"),
    followersCount,
    followingCount,
    id,
    isVerified,
    lastSeenAt: readNullableString(source, "lastSeenAt", "LastSeenAt"),
    normalizedUsername,
    occupation: readNullableString(source, "occupation", "Occupation"),
    postsCount,
    profileVisibility,
    updatedAt: readNullableString(source, "updatedAt", "UpdatedAt"),
    username,
    website: readNullableString(source, "website", "Website"),
  };
}

export function normalizePublicProfile(input: unknown): PublicProfile | null {
  const source = asRecord(input);
  if (!source) return null;

  const id = readString(source, "id", "Id");
  const username = readString(source, "username", "Username");
  const accountType = readString(source, "accountType", "AccountType");
  const profileVisibility = readString(source, "profileVisibility", "ProfileVisibility");
  const isVerified = readBoolean(source, "isVerified", "IsVerified");

  if (!id || !username || !accountType || !profileVisibility || isVerified === null) {
    return null;
  }

  return {
    accountType,
    avatarUrl: readNullableString(source, "avatarUrl", "AvatarUrl"),
    bio: readNullableString(source, "bio", "Bio"),
    city: readNullableString(source, "city", "City"),
    company: readNullableString(source, "company", "Company"),
    country: readNullableString(source, "country", "Country"),
    coverPhotoUrl: readNullableString(source, "coverPhotoUrl", "CoverPhotoUrl"),
    createdAt: readNullableString(source, "createdAt", "CreatedAt"),
    displayName: readNullableString(source, "displayName", "DisplayName"),
    district: readNullableString(source, "district", "District"),
    followersCount: readNullableNumber(source, "followersCount", "FollowersCount"),
    followingCount: readNullableNumber(source, "followingCount", "FollowingCount"),
    id,
    isVerified,
    lastSeenAt: readNullableString(source, "lastSeenAt", "LastSeenAt"),
    occupation: readNullableString(source, "occupation", "Occupation"),
    postsCount: readNullableNumber(source, "postsCount", "PostsCount"),
    profileVisibility,
    updatedAt: readNullableString(source, "updatedAt", "UpdatedAt"),
    username,
    website: readNullableString(source, "website", "Website"),
  };
}

export function normalizeAuthSessionStatus(input: unknown): AuthSessionStatus | null {
  const source = asRecord(input);
  if (!source) return null;

  const userId = readString(source, "userId", "UserId");
  const sessionId = readString(source, "sessionId", "SessionId");
  const email = readString(source, "email", "Email");
  const accountStatus = readString(source, "accountStatus", "AccountStatus");
  const emailConfirmed = readBoolean(source, "emailConfirmed", "EmailConfirmed");
  const roles = readStringArray(source, "roles", "Roles");
  const permissions = readStringArray(source, "permissions", "Permissions");

  if (
    !userId ||
    !sessionId ||
    !email ||
    !accountStatus ||
    emailConfirmed === null ||
    roles === null ||
    permissions === null
  ) {
    return null;
  }

  return {
    accountStatus,
    email,
    emailConfirmed,
    mfaVerifiedAt: readNullableString(source, "mfaVerifiedAt", "MfaVerifiedAt"),
    permissions,
    roles,
    sessionId,
    userId,
  };
}

export function normalizeUsernameAvailability(input: unknown): UsernameAvailability | null {
  const source = asRecord(input);
  if (!source) return null;

  const username = readString(source, "username", "Username");
  const normalizedUsername = readString(source, "normalizedUsername", "NormalizedUsername");
  const isAvailable = readBoolean(source, "isAvailable", "IsAvailable");
  if (!username || !normalizedUsername || isAvailable === null) {
    return null;
  }

  return {
    isAvailable,
    normalizedUsername,
    reason: readNullableString(source, "reason", "Reason"),
    suggestedUsername: readNullableString(source, "suggestedUsername", "SuggestedUsername"),
    username,
  };
}

export function normalizeAvatarUploadIntent(input: unknown): AvatarUploadIntent | null {
  const source = asRecord(input);
  if (!source) return null;

  const uploadUrl = readString(source, "uploadUrl", "UploadUrl");
  const method = readString(source, "method", "Method");
  const storageKey = readString(source, "storageKey", "StorageKey");
  const publicUrl = readString(source, "publicUrl", "PublicUrl");
  const expiresAt = readString(source, "expiresAt", "ExpiresAt");
  const headers = readStringRecord(source, "headers", "Headers");

  if (
    !uploadUrl ||
    !method ||
    !storageKey ||
    !publicUrl ||
    !expiresAt ||
    method.toUpperCase() !== "PUT"
  ) {
    return null;
  }

  return {
    expiresAt,
    ...(headers ? { headers } : {}),
    method: "PUT",
    publicUrl,
    storageKey,
    uploadUrl,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) return source[key];
  }

  return undefined;
}

function readString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNullableString(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function readNullableNumber(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function readBoolean(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (typeof value !== "boolean") return null;
  return value;
}

function readStringArray(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (!Array.isArray(value)) return null;
  if (value.some((item) => typeof item !== "string")) return null;
  return value as string[];
}

function readStringRecord(source: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(source, ...keys);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const normalized: Record<string, string> = {};
  for (const [key, recordValue] of Object.entries(record)) {
    if (typeof recordValue === "string" && recordValue.trim().length > 0) {
      normalized[key] = recordValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}
