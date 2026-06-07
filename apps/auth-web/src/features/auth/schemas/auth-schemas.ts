import { z } from "zod"

const guidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "auth.validation.guid"
  )

export const passwordSchema = z
  .string()
  .min(12, "auth.validation.passwordMin")
  .max(128, "auth.validation.passwordMax")
  .refine((value) => !/\s/.test(value), "auth.validation.passwordNoWhitespace")
  .refine((value) => /[a-z]/.test(value), "auth.validation.passwordLowercase")
  .refine((value) => /[A-Z]/.test(value), "auth.validation.passwordUppercase")
  .refine((value) => /\d/.test(value), "auth.validation.passwordDigit")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "auth.validation.passwordSymbol")
  .refine((value) => new Set(value).size >= 4, "auth.validation.passwordVariety")

export const loginSchema = z.object({
  emailOrUserName: z.string().trim().min(1, "auth.validation.required").max(256, "auth.validation.maxLength"),
  mfaCode: z.string().trim().max(32, "auth.validation.maxLength").optional().transform((v) => (v ? v : undefined)),
  password: z.string().min(1, "auth.validation.required").max(256, "auth.validation.maxLength"),
  recoveryCode: z.string().trim().max(128, "auth.validation.maxLength").optional().transform((v) => (v ? v : undefined)),
  rememberMe: z.boolean().default(false),
  turnstileToken: z.string().trim().min(1, "auth.validation.required"),
})

export const registerSchema = z.object({
  culture: z.enum(["nb-NO", "en-US", "sv-SE", "da-DK", "de-DE"]).default("en-US"),
  email: z.string().trim().email("auth.validation.invalidEmail").max(256, "auth.validation.maxLength"),
  firstName: z.string().trim().max(100, "auth.validation.maxLength").optional().transform((v) => (v ? v : undefined)),
  lastName: z.string().trim().max(100, "auth.validation.maxLength").optional().transform((v) => (v ? v : undefined)),
  password: passwordSchema,
  turnstileToken: z.string().trim().min(1, "auth.validation.required"),
  userName: z.string().trim().min(3, "auth.validation.userNameMin").max(64, "auth.validation.userNameMax"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("auth.validation.invalidEmail").max(256, "auth.validation.maxLength"),
  turnstileToken: z.string().trim().min(1, "auth.validation.required"),
})

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "auth.validation.required"),
    newPassword: passwordSchema,
    token: z.string().trim().min(1, "auth.validation.required").max(512, "auth.validation.maxLength"),
    turnstileToken: z.string().trim().min(1, "auth.validation.required"),
    userId: guidSchema,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "auth.validation.passwordMismatch",
    path: ["confirmPassword"],
  })

export const confirmEmailSchema = z.object({
  token: z.string().trim().min(1, "auth.validation.required").max(512, "auth.validation.maxLength"),
  userId: guidSchema,
})

export const resendConfirmEmailSchema = z.object({
  email: z.string().trim().email("auth.validation.invalidEmail").max(256, "auth.validation.maxLength"),
})

export const confirmEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("auth.validation.invalidEmail").max(256, "auth.validation.maxLength"),
  token: z.string().trim().min(1, "auth.validation.required").max(512, "auth.validation.maxLength"),
  userId: guidSchema,
})

export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ResendConfirmEmailInput = z.infer<typeof resendConfirmEmailSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
