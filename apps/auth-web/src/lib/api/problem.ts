import type { ProblemDetails, ValidationErrors } from "./types"

const ERROR_MESSAGE_KEYS = {
  account_locked: "account_locked",
  auth_body_too_large: "auth_body_too_large",
  auth_rate_limit_exceeded: "auth_rate_limit_exceeded",
  cookie_origin_validation_failed: "cookie_origin_validation_failed",
  duplicate_email: "duplicate_email",
  email_confirmation_required: "email_confirmation_required",
  email_unavailable: "email_unavailable",
  invalid_credentials: "invalid_credentials",
  invalid_email_change_token: "invalid_email_change_token",
  invalid_email_confirmation_token: "invalid_email_confirmation_token",
  invalid_mfa_code: "invalid_mfa_code",
  invalid_password_reset_token: "invalid_password_reset_token",
  invalid_recovery_code: "invalid_recovery_code",
  mfa_required: "mfa_required",
  registration_conflict: "registration_conflict"
} as const
type KnownErrorMessageKey = (typeof ERROR_MESSAGE_KEYS)[keyof typeof ERROR_MESSAGE_KEYS]
export type AuthErrorMessageKey =
  | KnownErrorMessageKey
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "server"
  | "default"

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails
  readonly fieldErrors: ValidationErrors
  readonly userMessage: string

  constructor(problem: ProblemDetails) {
    super(getDefaultProblemUserMessage(problem))
    this.name = "ApiProblemError"
    this.problem = problem
    this.fieldErrors = normalizeValidationErrors(problem.errors)
    this.userMessage = getDefaultProblemUserMessage(problem)
  }
}

export function getProblemMessageKey(problem: ProblemDetails): AuthErrorMessageKey {
  const knownMessage = getKnownErrorMessageKey(problem.errorCode)
  if (knownMessage) return knownMessage

  if (problem.status === 429) return "auth_rate_limit_exceeded"
  if (problem.status === 400 && problem.errors) return "validation"
  if (problem.status === 401) return "unauthorized"
  if (problem.status === 403) return "forbidden"
  if (problem.status && problem.status >= 500) return "server"

  return "default"
}

function getDefaultProblemUserMessage(problem: ProblemDetails): string {
  return problem.title?.trim() || "Request failed"
}

function getKnownErrorMessageKey(errorCode: string | undefined) {
  if (!errorCode || !(errorCode in ERROR_MESSAGE_KEYS)) {
    return undefined
  }

  return ERROR_MESSAGE_KEYS[errorCode as keyof typeof ERROR_MESSAGE_KEYS]
}

export function normalizeValidationErrors(errors: ValidationErrors | undefined) {
  if (!errors) {
    return {}
  }

  return Object.entries(errors).reduce<ValidationErrors>((accumulator, [field, messages]) => {
    accumulator[toCamelCaseField(field)] = messages
    return accumulator
  }, {})
}

export function toCamelCaseField(field: string) {
  const normalized = field.replace(/^\$\.?/, "").replace(/\[(\d+)\]/g, ".$1")
  const lastSegment = normalized.split(".").filter(Boolean).at(-1) ?? normalized

  if (!lastSegment) {
    return field
  }

  return lastSegment.charAt(0).toLowerCase() + lastSegment.slice(1)
}

export async function parseProblemResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as unknown

    if (isProblemDetails(payload)) {
      return new ApiProblemError({
        ...payload,
        status: payload.status ?? response.status
      })
    }
  }

  return new ApiProblemError({
    status: response.status,
    title: response.statusText
  })
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return typeof value === "object" && value !== null
}
