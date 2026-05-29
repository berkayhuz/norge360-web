import type { z } from "zod"

import type { ValidationErrors } from "@/src/lib/api/types"

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export function getOptionalFormString(formData: FormData, key: string) {
  const value = getFormString(formData, key).trim()
  return value ? value : undefined
}

export function getFormBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on"
}

export function zodFieldErrors(error: z.ZodError): ValidationErrors {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >

  return Object.entries(fieldErrors).reduce<ValidationErrors>(
    (accumulator, [field, messages]) => {
      if (messages?.length) {
        accumulator[field] = messages
      }

      return accumulator
    },
    {}
  )
}

export function firstFieldError(fieldErrors: ValidationErrors, field: string) {
  return fieldErrors[field]?.[0]
}

export function mergeFieldErrors(
  current: ValidationErrors,
  next: ValidationErrors
) {
  return {
    ...current,
    ...next,
  }
}
