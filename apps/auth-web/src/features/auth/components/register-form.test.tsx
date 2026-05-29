import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
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

    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText("Kullanici adi"), "acme-user")
    await userEvent.type(screen.getByLabelText("E-posta"), "user@norge360.com")
    await userEvent.type(screen.getByLabelText("Sifre"), "StrongPass123!")
    await userEvent.click(screen.getByRole("button", { name: /hesap olustur/i }))

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({ method: "POST" }))
    expect(await screen.findByText(/kayit alindi/i)).toBeInTheDocument()
  })
})
