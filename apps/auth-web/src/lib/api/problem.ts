import type { ProblemDetails, ValidationErrors } from "./types"

const RATE_LIMIT_MESSAGE =
  "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin."

const ERROR_MESSAGES = {
  account_locked: "Hesap geçici olarak kilitli. Bir süre sonra tekrar deneyin.",
  auth_body_too_large: "İstek çok büyük. Lütfen formu kontrol edin.",
  auth_rate_limit_exceeded: RATE_LIMIT_MESSAGE,
  cookie_origin_validation_failed:
    "Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar deneyin.",
  duplicate_email: "Bu e-posta adresi ile zaten bir hesap var.",
  email_confirmation_required:
    "Devam etmek için önce e-posta adresinizi doğrulamanız gerekiyor.",
  email_unavailable: "Bu e-posta adresi kullanılamıyor.",
  invalid_credentials: "E-posta/kullanıcı adı veya şifre hatalı.",
  invalid_email_change_token:
    "E-posta değişikliği bağlantısı geçersiz veya süresi dolmuş.",
  invalid_email_confirmation_token:
    "E-posta doğrulama bağlantısı geçersiz veya süresi dolmuş.",
  invalid_mfa_code: "Doğrulama kodu hatalı.",
  invalid_password_reset_token:
    "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
  invalid_recovery_code: "Kurtarma kodu hatalı.",
  mfa_required: "Devam etmek için iki aşamalı doğrulama kodu gerekiyor.",
  registration_conflict:
    "Kayıt tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.",
} as const

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails
  readonly fieldErrors: ValidationErrors
  readonly userMessage: string

  constructor(problem: ProblemDetails) {
    const userMessage = getProblemUserMessage(problem)
    super(userMessage)
    this.name = "ApiProblemError"
    this.problem = problem
    this.fieldErrors = normalizeValidationErrors(problem.errors)
    this.userMessage = userMessage
  }
}

export function getProblemUserMessage(problem: ProblemDetails) {
  const knownMessage = getKnownErrorMessage(problem.errorCode)

  if (knownMessage) {
    return knownMessage
  }

  if (problem.status === 429) {
    return RATE_LIMIT_MESSAGE
  }

  if (problem.status === 400 && problem.errors) {
    return "Formdaki bazı alanlar geçersiz. Lütfen işaretli alanları kontrol edin."
  }

  if (problem.status === 401) {
    return "Oturum doğrulanamadı. Lütfen tekrar giriş yapın."
  }

  if (problem.status === 403) {
    return "Bu işlem için yetkiniz yok."
  }

  if (problem.status && problem.status >= 500) {
    return "Şu anda işlem tamamlanamadı. Lütfen biraz sonra tekrar deneyin."
  }

  return "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin."
}

function getKnownErrorMessage(errorCode: string | undefined) {
  if (!errorCode || !(errorCode in ERROR_MESSAGES)) {
    return undefined
  }

  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES]
}

export function normalizeValidationErrors(
  errors: ValidationErrors | undefined
) {
  if (!errors) {
    return {}
  }

  return Object.entries(errors).reduce<ValidationErrors>(
    (accumulator, [field, messages]) => {
      accumulator[toCamelCaseField(field)] = messages
      return accumulator
    },
    {}
  )
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
        status: payload.status ?? response.status,
      })
    }
  }

  return new ApiProblemError({
    status: response.status,
    title: response.statusText,
  })
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return typeof value === "object" && value !== null
}
