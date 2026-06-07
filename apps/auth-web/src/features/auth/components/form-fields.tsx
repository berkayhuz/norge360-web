"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/primitives/button"
import { Input } from "@workspace/ui/components/forms/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { cn } from "@workspace/ui/lib/utils"

import { firstFieldError } from "./form-utils"

import type { ValidationErrors } from "@/src/lib/api/types"

type FieldProps = {
  autoComplete?: string
  defaultValue?: string
  description?: string
  disabled?: boolean
  fieldErrors: ValidationErrors
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  label: string
  maxLength?: number
  minLength?: number
  name: string
  placeholder?: string
  required?: boolean
  showStrengthMeter?: boolean
  translateError?: (message: any) => string
  type?: React.HTMLInputTypeAttribute
}

export function TextField({
  autoComplete,
  defaultValue,
  description,
  disabled,
  fieldErrors,
  inputMode,
  label,
  maxLength,
  minLength,
  name,
  placeholder,
  required,
  showStrengthMeter,
  translateError,
  type = "text",
}: FieldProps) {
  const error = firstFieldError(fieldErrors, name)
  const translatedError = error ? translateError?.(error) ?? error : undefined
  const errorId = translatedError ? `${name}-error` : undefined
  const descriptionId = description ? `${name}-description` : undefined
  const [value, setValue] = React.useState(defaultValue ?? "")
  React.useEffect(() => {
    setValue(defaultValue ?? "")
  }, [defaultValue])
  const strength = showStrengthMeter ? evaluatePasswordStrength(value) : null

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
      </Label>
      <Input
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ")}
        aria-invalid={Boolean(translatedError)}
        autoComplete={autoComplete}
        className={cn(translatedError && "border-destructive focus-visible:border-destructive")}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required={required}
        onChange={showStrengthMeter ? (event) => setValue(event.currentTarget.value) : undefined}
        type={type}
      />
      {description ? (
        <p className="text-xs text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {strength ? <PasswordStrengthMeter strength={strength} /> : null}
      {translatedError ? (
        <p className="text-xs text-destructive" id={errorId} role="alert">
          {translatedError}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordField(props: Omit<FieldProps, "type">) {
  return <TextField {...props} type="password" />
}

export function FieldMessage({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "danger" | "neutral" | "success"
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tone === "danger" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "neutral" && "border-border bg-muted/50 text-muted-foreground",
        tone === "success" &&
          "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  )
}

function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  const width = `${(strength.score / 4) * 100}%`

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            strength.tone === "weak" && "bg-rose-500",
            strength.tone === "fair" && "bg-amber-500",
            strength.tone === "good" && "bg-sky-500",
            strength.tone === "strong" && "bg-emerald-500",
          )}
          style={{ width }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {strength.label}</p>
    </div>
  )
}

type PasswordStrength = {
  label: "Weak" | "Fair" | "Good" | "Strong"
  score: number
  tone: "weak" | "fair" | "good" | "strong"
}

function evaluatePasswordStrength(value: string): PasswordStrength | null {
  if (!value) {
    return null
  }

  let score = 0
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 1) return { label: "Weak", score: 1, tone: "weak" }
  if (score === 2) return { label: "Fair", score: 2, tone: "fair" }
  if (score === 3) return { label: "Good", score: 3, tone: "good" }
  return { label: "Strong", score: 4, tone: "strong" }
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <Button className="w-full" disabled={disabled} size="lg" type="submit">
      {children}
    </Button>
  )
}
