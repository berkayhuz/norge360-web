export type Guid = string

export type AccountActionAcceptedResponse = {
  message: string
}

export type AuthIssuedSessionResponse = {
  accessTokenExpiresAt: string
  email: string
  refreshTokenExpiresAt: string
  sessionId: Guid
  userId: Guid
  userName: string
}

export type AuthenticationTokenResponse = AuthIssuedSessionResponse & {
  accessToken: string
  isPersistent: boolean
  refreshToken: string
}

export type AuthSessionStatusResponse = {
  accountStatus: string
  email: string
  emailConfirmed: boolean
  mfaVerifiedAt: string | null
  permissions: string[]
  roles: string[]
  sessionId: Guid
  userId: Guid
}

export type ValidationErrors = Record<string, string[]>

export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  traceId?: string
  correlationId?: string
  errorCode?: string
  errors?: ValidationErrors
}
