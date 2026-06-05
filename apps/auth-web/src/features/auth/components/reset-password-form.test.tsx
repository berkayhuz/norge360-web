import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithIntl } from "@/test/render-with-intl"

import { ResetPasswordForm } from "./reset-password-form"

describe("ResetPasswordForm", () => {
  it("does not submit when token query is missing", () => {
    renderWithIntl(<ResetPasswordForm token="" userId="" />)
    expect(screen.getByText(/link is missing or invalid/i)).toBeInTheDocument()
  })

  it("submits turnstile token with reset password request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Accepted" }), {
        headers: { "content-type": "application/json" },
        status: 202
      })
    )

    renderWithIntl(
      <ResetPasswordForm
        token="reset-token"
        userId="11111111-1111-1111-1111-111111111111"
      />
    )

    await userEvent.type(screen.getByLabelText("New password"), "StrongPass123!")
    await userEvent.type(screen.getByLabelText("Confirm new password"), "StrongPass123!")
    await userEvent.click(screen.getByRole("button"))

    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(String(options?.body)).toContain("\"turnstileToken\":\"test-turnstile-token\"")
  })
})
