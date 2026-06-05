import { describe, expect, it } from "vitest"

import { resolveSafeRedirect } from "./routes"

describe("resolveSafeRedirect", () => {
  it("allows safe relative routes", () => {
    expect(resolveSafeRedirect("/dashboard", "/fallback")).toBe("/dashboard")
  })

  it("rejects protocol-relative and api routes", () => {
    expect(resolveSafeRedirect("//evil.test", "/fallback")).toBe("/fallback")
    expect(resolveSafeRedirect("/api/auth/logout", "/fallback")).toBe(
      "/fallback"
    )
  })

  it("rejects unsafe external origins", () => {
    expect(
      resolveSafeRedirect("https://evil.test/session", "https://norge360.com/", {
        allowedOrigins: ["https://app.norge360.com"],
        appOrigin: "https://auth.norge360.com",
      })
    ).toBe("https://norge360.com/")
  })

  it("allows allowlisted external origins", () => {
    expect(
      resolveSafeRedirect("https://app.norge360.com/dashboard", "https://norge360.com/", {
        allowedOrigins: ["https://app.norge360.com"],
        appOrigin: "https://auth.norge360.com",
      })
    ).toBe("https://app.norge360.com/dashboard")
  })
})
