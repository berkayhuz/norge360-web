"use client"

import * as React from "react"

import { Button } from "@norge360/ui/components/button"
import { cn } from "@norge360/ui/lib/utils"

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
  type = "text",
}: FieldProps) {
  const error = firstFieldError(fieldErrors, name)
  const errorId = error ? `${name}-error` : undefined
  const descriptionId = description ? `${name}-description` : undefined

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
        )}
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {description ? (
        <p className="text-xs text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" id={errorId} role="alert">
          {error}
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
