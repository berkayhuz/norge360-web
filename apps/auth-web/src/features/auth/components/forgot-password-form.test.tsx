import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ForgotPasswordForm } from "./forgot-password-form"

describe("ForgotPasswordForm", () => {
  afterEach(() => vi.restoreAllMocks())

  it("shows success message for accepted forgot-password requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Accepted" }), {
        headers: { "content-type": "application/json" },
        status: 202,
      })
    )

    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByLabelText("E-posta"), "user@norge360.com")
    await userEvent.click(screen.getByRole("button", { name: /baglantisi gonder/i }))
    expect(await screen.findByText(/sifre sifirlama baglantisi/i)).toBeInTheDocument()
  })
})
