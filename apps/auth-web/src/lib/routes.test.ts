import { describe, expect, it } from "vitest"

import { resolveSafeRedirect } from "./routes"

describe("resolveSafeRedirect", () => {
  it("allows safe relative routes", () => {
    expect(resolveSafeRedirect("/session", "/fallback")).toBe("/session")
  })

  it("rejects protocol-relative and api routes", () => {
    expect(resolveSafeRedirect("//evil.test", "/fallback")).toBe("/fallback")
    expect(resolveSafeRedirect("/api/auth/logout", "/fallback")).toBe(
      "/fallback"
    )
  })

  it("rejects unsafe external origins", () => {
    expect(
      resolveSafeRedirect("https://evil.test/session", "/session", {
        allowedOrigins: ["https://app.norge360.com"],
        appOrigin: "https://auth.norge360.com",
      })
    ).toBe("/session")
  })

  it("allows allowlisted external origins", () => {
    expect(
      resolveSafeRedirect("https://app.norge360.com/dashboard", "/session", {
        allowedOrigins: ["https://app.norge360.com"],
        appOrigin: "https://auth.norge360.com",
      })
    ).toBe("https://app.norge360.com/dashboard")
  })
})
