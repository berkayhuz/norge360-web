import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResetPasswordForm } from "./reset-password-form"

describe("ResetPasswordForm", () => {
  it("does not submit when token query is missing", () => {
    render(<ResetPasswordForm token="" userId="" />)
    expect(screen.getByText(/baglantisi eksik veya gecersiz/i)).toBeInTheDocument()
  })
})
