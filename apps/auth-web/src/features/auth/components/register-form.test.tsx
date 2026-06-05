import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithIntl } from "@/test/render-with-intl"

import { RegisterForm } from "./register-form"

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

describe("RegisterForm", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    router.push.mockClear()
    router.refresh.mockClear()
  })

  it("submits register with platform account fields only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Accepted" }), { headers: { "content-type": "application/json" }, status: 202 })
    )

    renderWithIntl(<RegisterForm />)
    await userEvent.type(screen.getByLabelText("Username"), "acme-user")
    await userEvent.type(screen.getByLabelText("Email"), "user@norge360.com")
    await userEvent.type(screen.getByLabelText("Password"), "StrongPass123!")
    await userEvent.click(screen.getByRole("button", { name: /create account/i }))

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({ method: "POST" }))
    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(String(options?.body)).toContain("\"turnstileToken\":\"test-turnstile-token\"")
    expect(await screen.findByText(/registration received/i)).toBeInTheDocument()
  })
})
