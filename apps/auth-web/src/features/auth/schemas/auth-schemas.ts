import { z } from "zod"

const guidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Gecerli bir kimlik girin."
  )

export const passwordSchema = z
  .string()
  .min(12, "Sifre en az 12 karakter olmali.")
  .max(128, "Sifre en fazla 128 karakter olabilir.")
  .refine((value) => !/\s/.test(value), "Sifre bosluk iceremez.")
  .refine((value) => /[a-z]/.test(value), "Sifre kucuk harf icermeli.")
  .refine((value) => /[A-Z]/.test(value), "Sifre buyuk harf icermeli.")
  .refine((value) => /\d/.test(value), "Sifre rakam icermeli.")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Sifre ozel karakter icermeli.")
  .refine((value) => new Set(value).size >= 4, "Sifre en az 4 farkli karakter icermeli.")

export const loginSchema = z.object({
  emailOrUserName: z.string().trim().min(1).max(256),
  mfaCode: z.string().trim().max(32).optional().transform((v) => (v ? v : undefined)),
  password: z.string().min(1).max(256),
  recoveryCode: z.string().trim().max(128).optional().transform((v) => (v ? v : undefined)),
  rememberMe: z.boolean().default(false),
})

export const registerSchema = z.object({
  culture: z.enum(["tr-TR", "en-US"]).default("tr-TR"),
  email: z.string().trim().email().max(256),
  firstName: z.string().trim().max(100).optional().transform((v) => (v ? v : undefined)),
  lastName: z.string().trim().max(100).optional().transform((v) => (v ? v : undefined)),
  password: passwordSchema,
  userName: z.string().trim().min(3).max(64),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
})

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(1),
    newPassword: passwordSchema,
    token: z.string().trim().min(1).max(512),
    userId: guidSchema,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Sifreler eslesmiyor.",
    path: ["confirmPassword"],
  })

export const confirmEmailSchema = z.object({
  token: z.string().trim().min(1).max(512),
  userId: guidSchema,
})

export const resendConfirmEmailSchema = z.object({
  email: z.string().trim().email(),
})

export const confirmEmailChangeSchema = z.object({
  newEmail: z.string().trim().email(),
  token: z.string().trim().min(1).max(512),
  userId: guidSchema,
})

export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ResendConfirmEmailInput = z.infer<typeof resendConfirmEmailSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
