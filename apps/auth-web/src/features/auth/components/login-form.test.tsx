import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ sessionId: "11111111-1111-1111-1111-111111111111" }), { headers: { "content-type": "application/json" }, status: 200 }))
    render(<LoginForm returnUrl="/session" />)
    await userEvent.type(screen.getByLabelText(/E-posta veya/i), "user@norge360.com")
    await userEvent.type(screen.getByLabelText(/Şifre|Sifre/i), "secret")
    await userEvent.click(screen.getByRole("button", { name: /Giriş|Giris/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" })))
  })
})
