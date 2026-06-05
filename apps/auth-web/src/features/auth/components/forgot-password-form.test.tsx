import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithIntl } from "@/test/render-with-intl"

import { ForgotPasswordForm } from "./forgot-password-form"

describe("ForgotPasswordForm", () => {
  afterEach(() => vi.restoreAllMocks())

  it("shows success message for accepted forgot-password requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Accepted" }), {
        headers: { "content-type": "application/json" },
        status: 202
      })
    )

    renderWithIntl(<ForgotPasswordForm />)
    await userEvent.type(screen.getByLabelText("Email"), "user@norge360.com")
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }))
    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(String(options?.body)).toContain("\"turnstileToken\":\"test-turnstile-token\"")
    expect(await screen.findByText(/password reset link will be sent/i)).toBeInTheDocument()
  })
})
