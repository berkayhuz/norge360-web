import type { MyProfile, UpdateMyProfileInput, UpdateMyProfileResult } from "./accounts-types";
import { normalizeMyProfile } from "./accounts-types";

export async function updateMyProfileClient(input: UpdateMyProfileInput): Promise<UpdateMyProfileResult> {
  try {
    const response = await fetch("/api/accounts/profiles/me", {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      method: "PATCH",
    });

    const data = await readJson(response);

    if (response.ok) {
      const profile = normalizeMyProfile(data);
      if (!profile) {
        return { kind: "unknownError", message: "public_web_profile_response_invalid" };
      }

      return { kind: "success", profile };
    }

    const problem = parseProblemDetails(data);

    if (response.status === 400) {
      return {
        kind: "validationError",
        errors: problem.errors ?? {},
        message: problem.errorCode ?? "public_web_profile_validation_error",
        problem,
      };
    }

    if (response.status === 401) return { kind: "unauthorized", problem };
    if (response.status === 403) return { kind: "forbidden", problem };
    if (response.status === 404) return { kind: "notFound", problem };

    if (response.status >= 500) {
      return {
        kind: "upstreamError",
        message: "public_web_profile_service_unavailable",
        problem,
        status: response.status,
      };
    }

    return {
      kind: "unknownError",
      message: problem.errorCode ?? "public_web_profile_unknown_error",
      problem,
      status: response.status,
    };
  } catch {
    return {
      kind: "upstreamError",
      message: "public_web_profile_service_unavailable",
      status: 503,
    };
  }
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
}

function parseProblemDetails(input: unknown) {
  if (!input || typeof input !== "object") {
    return {};
  }

  const record = input as Record<string, unknown>;
  const errors = record.errors && typeof record.errors === "object" ? (record.errors as Record<string, string[]>) : undefined;
  const errorCode = typeof record.errorCode === "string" ? record.errorCode : undefined;
  const detail = typeof record.detail === "string" ? record.detail : undefined;
  const title = typeof record.title === "string" ? record.title : undefined;

  return { detail, errorCode, errors, title };
}
