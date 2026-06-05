import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithIntl } from "@/test/render-with-intl"

import { LoginForm } from "./login-form"

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

describe("LoginForm", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    router.push.mockClear()
    router.refresh.mockClear()
  })

  it("submits login with platform credentials only", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sessionId: "11111111-1111-1111-1111-111111111111" }), {
        headers: { "content-type": "application/json" },
        status: 200
      })
    )

    renderWithIntl(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email or username/i), "user@norge360.com")
    await userEvent.type(screen.getByLabelText(/password/i), "secret")
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" })))
    const [, options] = fetchMock.mock.calls[0] ?? []
    expect(typeof options?.body).toBe("string")
    expect(String(options?.body)).toContain("\"turnstileToken\":\"test-turnstile-token\"")
  })
})
