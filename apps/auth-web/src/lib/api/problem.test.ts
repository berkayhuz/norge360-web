import { describe, expect, it } from "vitest"

import {
  ApiProblemError,
  normalizeValidationErrors,
  toCamelCaseField,
} from "./problem"

describe("ProblemDetails normalization", () => {
  it("maps backend validation fields to form field names", () => {
    expect(
      normalizeValidationErrors({
        EmailOrUserName: ["Required"],
        "request.Password": ["Invalid"],
      })
    ).toEqual({
      emailOrUserName: ["Required"],
      password: ["Invalid"],
    })
  })

  it("normalizes JSON path field names", () => {
    expect(toCamelCaseField("$.Email")).toBe("email")
  })

  it("uses safe user-facing messages for known error codes", () => {
    const error = new ApiProblemError({
      detail: "Raw technical detail",
      errorCode: "invalid_credentials",
      status: 401,
      title: "Invalid credentials",
    })

    expect(error.userMessage).toBe("E-posta/kullanıcı adı veya şifre hatalı.")
  })
})
