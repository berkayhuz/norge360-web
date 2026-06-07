import "server-only";

import { cookies, headers } from "next/headers";

import { tryGetServerEnv } from "@/lib/env/server";

import {
  normalizeAuthSessionStatus,
  normalizeAvatarUploadIntent,
  normalizeMyProfile,
  normalizePublicProfile,
  normalizeUsernameAvailability,
  type CompleteAvatarUploadInput,
  type CompleteAvatarUploadResult,
  type CreateAvatarUploadIntentInput,
  type CreateAvatarUploadIntentResult,
  type UpdateMyProfileInput,
  type UpdateMyProfileResult,
  type CheckUsernameAvailabilityResult,
  type AccountsProblemDetails,
  type GetAuthSessionResult,
  type GetMyProfileResult,
  type GetPublicProfileResult,
} from "./accounts-types";

export async function getMyProfile(): Promise<GetMyProfileResult> {
  const response = await requestGateway("/api/accounts/profiles/me");

  if ("error" in response) {
    return { kind: "upstreamError", problem: response.error.problem, status: response.error.status };
  }

  const { data, status } = response;

  if (status === 200) {
    const normalized = normalizeMyProfile(data);
    if (!normalized) {
      return { kind: "upstreamError", status };
    }

    return { kind: "success", profile: normalized };
  }

  const problem = parseProblemDetails(data, status);

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status === 202) return { kind: "pending", problem };
  if (status === 404) return { kind: "notFound", problem };

  return { kind: "upstreamError", problem, status };
}

export async function getAuthSessionStatus(): Promise<GetAuthSessionResult> {
  const response = await requestGateway("/api/auth/session-status");

  if ("error" in response) {
    return { kind: "upstreamError", status: response.error.status };
  }

  const { data, status } = response;

  if (status === 200) {
    const normalized = normalizeAuthSessionStatus(data);
    if (!normalized) {
      return { kind: "upstreamError", status };
    }

    return { kind: "authenticated", session: normalized };
  }

  if (status === 401 || status === 403) {
    return { kind: "unauthenticated", status };
  }

  return { kind: "upstreamError", status };
}

export async function getPublicProfileByUsername(
  username: string,
): Promise<GetPublicProfileResult> {
  const normalizedInput = username.trim();
  if (!normalizedInput) {
    return { kind: "invalidUsername", reason: "username_required" };
  }

  const response = await requestGateway(
    `/api/accounts/profiles/${encodeURIComponent(normalizedInput)}`,
  );

  if ("error" in response) {
    return { kind: "upstreamError", problem: response.error.problem, status: response.error.status };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizePublicProfile(data);
    if (!normalized) {
      return { kind: "unknownError", status };
    }

    return { kind: "success", profile: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 404) return { kind: "notFound", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status === 400) return { kind: "invalidUsername", reason: problem.errorCode ?? "bad_request" };

  if (status >= 500) {
    return { kind: "upstreamError", problem, status };
  }

  return { kind: "unknownError", status, problem };
}

export async function resolveAuthUserIdByProfileId(profileId: string): Promise<string | null> {
  const value = profileId.trim();
  if (!value) return null;

  const response = await requestGateway(`/api/accounts/internal/users/resolve-by-profile/${encodeURIComponent(value)}`);
  if ("error" in response) return null;
  if (response.status !== 200 || !response.data || typeof response.data !== "object") return null;
  const authUserId = (response.data as Record<string, unknown>).authUserId;
  return typeof authUserId === "string" ? authUserId : null;
}

export async function checkUsernameAvailability(
  username: string,
): Promise<CheckUsernameAvailabilityResult> {
  const normalizedInput = username.trim();
  if (!normalizedInput) {
    return { kind: "invalid", reason: "username_required" };
  }

  const response = await requestGateway(
    `/api/accounts/usernames/check?username=${encodeURIComponent(normalizedInput)}`,
  );

  if ("error" in response) {
    return { kind: "upstreamError", problem: response.error.problem, status: response.error.status };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeUsernameAvailability(data);
    if (!normalized) {
      return { kind: "unknownError", status };
    }

    if (normalized.isAvailable) {
      return { kind: "available", response: normalized };
    }

    const reason = normalized.reason ?? "";
    if (reason.startsWith("username_")) {
      if (reason === "username_length_invalid" || reason === "username_format_invalid" || reason === "username_required") {
        return { kind: "invalid", reason, response: normalized };
      }

      return { kind: "unavailable", response: normalized };
    }

    return { kind: "unavailable", response: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status >= 500) {
    return { kind: "upstreamError", problem, status };
  }

  return { kind: "unknownError", status, problem };
}

export async function updateMyProfile(
  input: UpdateMyProfileInput,
): Promise<UpdateMyProfileResult> {
  const response = await requestGateway("/api/accounts/profiles/me", {
    body: input,
    method: "PATCH",
  });

  if ("error" in response) {
    return {
      kind: "upstreamError",
      message: "public_web_profile_service_unavailable",
      problem: response.error.problem,
      status: response.error.status,
    };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeMyProfile(data);
    if (!normalized) {
      return { kind: "unknownError", message: "public_web_profile_response_invalid", status };
    }

    return { kind: "success", profile: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 400) {
    return {
      kind: "validationError",
      errors: problem.errors ?? {},
      message: getProblemMessageCode(problem, "public_web_profile_validation_error"),
      problem,
    };
  }

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status === 404) return { kind: "notFound", problem };

  if (status >= 500) {
    return {
      kind: "upstreamError",
      message: "public_web_profile_service_unavailable",
      problem,
      status,
    };
  }

  return {
    kind: "unknownError",
    message: getProblemMessageCode(problem, "public_web_profile_unknown_error"),
    problem,
    status,
  };
}

export async function createAvatarUploadIntent(
  input: CreateAvatarUploadIntentInput,
): Promise<CreateAvatarUploadIntentResult> {
  const response = await requestGateway("/api/accounts/profiles/me/avatar/upload-intent", {
    body: input,
    method: "POST",
  });

  if ("error" in response) {
    return {
      kind: "upstreamError",
      message: "public_web_avatar_upload_intent_service_unavailable",
      problem: response.error.problem,
      status: response.error.status,
    };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeAvatarUploadIntent(data);
    if (!normalized) {
      return { kind: "unknownError", message: "public_web_avatar_upload_intent_response_invalid", status };
    }

    return { kind: "success", intent: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 400) {
    return {
      kind: "validationError",
      errors: problem.errors ?? {},
      message: getProblemMessageCode(problem, "public_web_avatar_upload_intent_validation_error"),
      problem,
    };
  }

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status >= 500) {
    return {
      kind: "upstreamError",
      message: "public_web_avatar_upload_intent_service_unavailable",
      problem,
      status,
    };
  }

  return {
    kind: "unknownError",
    message: getProblemMessageCode(problem, "public_web_avatar_upload_intent_unknown_error"),
    problem,
    status,
  };
}

export async function createCoverPhotoUploadIntent(
  input: CreateAvatarUploadIntentInput,
): Promise<CreateAvatarUploadIntentResult> {
  const response = await requestGateway("/api/accounts/profiles/me/cover-photo/upload-intent", {
    body: input,
    method: "POST",
  });

  if ("error" in response) {
    return {
      kind: "upstreamError",
      message: "public_web_cover_photo_upload_intent_service_unavailable",
      problem: response.error.problem,
      status: response.error.status,
    };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeAvatarUploadIntent(data);
    if (!normalized) {
      return { kind: "unknownError", message: "public_web_cover_photo_upload_intent_response_invalid", status };
    }

    return { kind: "success", intent: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 400) {
    return {
      kind: "validationError",
      errors: problem.errors ?? {},
      message: getProblemMessageCode(problem, "public_web_cover_photo_upload_intent_validation_error"),
      problem,
    };
  }

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status >= 500) {
    return {
      kind: "upstreamError",
      message: "public_web_cover_photo_upload_intent_service_unavailable",
      problem,
      status,
    };
  }

  return {
    kind: "unknownError",
    message: getProblemMessageCode(problem, "public_web_cover_photo_upload_intent_unknown_error"),
    problem,
    status,
  };
}

export async function completeAvatarUpload(
  input: CompleteAvatarUploadInput,
): Promise<CompleteAvatarUploadResult> {
  const response = await requestGateway("/api/accounts/profiles/me/avatar/complete", {
    body: input,
    method: "POST",
  });

  if ("error" in response) {
    return {
      kind: "upstreamError",
      message: "public_web_avatar_completion_service_unavailable",
      problem: response.error.problem,
      status: response.error.status,
    };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeMyProfile(data);
    if (!normalized) {
      return { kind: "unknownError", message: "public_web_avatar_completion_response_invalid", status };
    }

    return { kind: "success", profile: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 400) {
    return {
      kind: "validationError",
      errors: problem.errors ?? {},
      message: getProblemMessageCode(problem, "public_web_avatar_completion_validation_error"),
      problem,
    };
  }

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status === 404) return { kind: "notFound", problem };
  if (status >= 500) {
    return {
      kind: "upstreamError",
      message: "public_web_avatar_completion_service_unavailable",
      problem,
      status,
    };
  }

  return {
    kind: "unknownError",
    message: getProblemMessageCode(problem, "public_web_avatar_completion_unknown_error"),
    problem,
    status,
  };
}

export async function completeCoverPhotoUpload(
  input: CompleteAvatarUploadInput,
): Promise<CompleteAvatarUploadResult> {
  const response = await requestGateway("/api/accounts/profiles/me/cover-photo/complete", {
    body: input,
    method: "POST",
  });

  if ("error" in response) {
    return {
      kind: "upstreamError",
      message: "public_web_cover_photo_completion_service_unavailable",
      problem: response.error.problem,
      status: response.error.status,
    };
  }

  const { data, status } = response;
  if (status === 200) {
    const normalized = normalizeMyProfile(data);
    if (!normalized) {
      return { kind: "unknownError", message: "public_web_cover_photo_completion_response_invalid", status };
    }

    return { kind: "success", profile: normalized };
  }

  const problem = parseProblemDetails(data, status);
  if (status === 400) {
    return {
      kind: "validationError",
      errors: problem.errors ?? {},
      message: getProblemMessageCode(problem, "public_web_cover_photo_completion_validation_error"),
      problem,
    };
  }

  if (status === 401) return { kind: "unauthorized", problem };
  if (status === 403) return { kind: "forbidden", problem };
  if (status === 404) return { kind: "notFound", problem };
  if (status >= 500) {
    return {
      kind: "upstreamError",
      message: "public_web_cover_photo_completion_service_unavailable",
      problem,
      status,
    };
  }

  return {
    kind: "unknownError",
    message: getProblemMessageCode(problem, "public_web_cover_photo_completion_unknown_error"),
    problem,
    status,
  };
}

type GatewayResponse =
  | { data: unknown; status: number }
  | { error: { problem?: AccountsProblemDetails; status?: number } };

type GatewayRequestOptions = {
  body?: unknown;
  method?: "GET" | "PATCH" | "POST";
};

async function requestGateway(
  path: string,
  options?: GatewayRequestOptions,
): Promise<GatewayResponse> {
  const { env } = tryGetServerEnv();
  if (!env) {
    return { error: { status: 500 } };
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const upstreamUrl = new URL(path, env.gatewayApiBaseUrl);
  const method = options?.method ?? "GET";

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      body: method === "PATCH" || method === "POST" ? JSON.stringify(options?.body ?? {}) : undefined,
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: cookieStore.toString(),
        ...(method === "PATCH" || method === "POST" ? { "content-type": "application/json" } : {}),
        origin: new URL(env.publicWebAppUrl).origin,
        referer: env.publicWebAppUrl,
        "user-agent": requestHeaders.get("user-agent") ?? "public-web-server",
        "x-correlation-id": requestHeaders.get("x-correlation-id") ?? crypto.randomUUID(),
      },
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { error: { status: 503 } };
  }

  const data = await safeReadJson(response);
  return { data, status: response.status };
}

async function safeReadJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json().catch(() => null)) as unknown;
}

function parseProblemDetails(data: unknown, status: number): AccountsProblemDetails {
  if (!data || typeof data !== "object") {
    return { status };
  }

  const value = data as Record<string, unknown>;

  return {
    correlationId: toOptionalString(readProblemValue(value, "correlationId", "CorrelationId")),
    detail: toOptionalString(readProblemValue(value, "detail", "Detail")),
    errors: readFieldErrors(readProblemValue(value, "errors", "Errors")),
    errorCode: toOptionalString(readProblemValue(value, "errorCode", "ErrorCode")),
    instance: toOptionalString(readProblemValue(value, "instance", "Instance")),
    status: readProblemStatus(value) ?? status,
    title: toOptionalString(readProblemValue(value, "title", "Title")),
    traceId: toOptionalString(readProblemValue(value, "traceId", "TraceId")),
    type: toOptionalString(readProblemValue(value, "type", "Type")),
  };
}

function getProblemMessageCode(
  problem: AccountsProblemDetails | undefined,
  fallback: string,
) {
  if (problem?.errorCode) {
    return problem.errorCode
  }

  if (problem?.status) {
    return `${fallback}_${problem.status}`
  }

  return fallback
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readProblemValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in source) return source[key];
  }

  return undefined;
}

function readProblemStatus(source: Record<string, unknown>) {
  const value = readProblemValue(source, "status", "Status");
  return typeof value === "number" ? value : undefined;
}

function readFieldErrors(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, string[]> = {};
  for (const [key, fieldValue] of Object.entries(record)) {
    if (!Array.isArray(fieldValue)) {
      continue;
    }

    const messages = fieldValue.filter((item): item is string => typeof item === "string");
    if (messages.length > 0) {
      normalized[key] = messages;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
