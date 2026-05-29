import { describe, expect, it } from "vitest"

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth-schemas"

const validPassword = "StrongPass123!"

describe("auth schemas", () => {
  it("validates successful login payloads", () => {
    expect(
      loginSchema.safeParse({
        emailOrUserName: "user@norge360.com",
        password: "secret",
        rememberMe: true,
      }).success
    ).toBe(true)
  })

  it("rejects weak registration passwords", () => {
    const result = registerSchema.safeParse({
      culture: "tr-TR",
      email: "user@norge360.com",
      password: "short",
      userName: "acme-user",
    })

    expect(result.success).toBe(false)
  })

  it("accepts valid registration payloads", () => {
    const result = registerSchema.safeParse({
      culture: "tr-TR",
      email: "user@norge360.com",
      password: validPassword,
      userName: "acme-user",
    })

    expect(result.success).toBe(true)
  })

  it("rejects reset password when token is missing", () => {
    const result = resetPasswordSchema.safeParse({
      confirmPassword: validPassword,
      newPassword: validPassword,
      token: "",
      userId: "11111111-1111-1111-1111-111111111111",
    })

    expect(result.success).toBe(false)
  })
})
