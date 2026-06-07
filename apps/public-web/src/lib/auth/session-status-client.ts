"use client";

type ClientAuthSessionStatus = {
  authenticated: boolean;
  status?: number;
};

let inFlightSessionStatusPromise: Promise<ClientAuthSessionStatus> | null = null;
let cachedSessionStatus: ClientAuthSessionStatus | null = null;

export async function getClientAuthSessionStatus(): Promise<ClientAuthSessionStatus> {
  if (cachedSessionStatus) {
    return cachedSessionStatus;
  }

  if (inFlightSessionStatusPromise) {
    return inFlightSessionStatusPromise;
  }

  inFlightSessionStatusPromise = (async () => {
    try {
      const response = await fetch("/api/auth/session-status", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        cachedSessionStatus = {
          authenticated: false,
          status: response.status,
        };
        return cachedSessionStatus;
      }

      const payload = (await response.json().catch(() => null)) as
        | { authenticated?: boolean }
        | null;

      cachedSessionStatus = {
        authenticated: Boolean(payload?.authenticated),
        status: response.status,
      };
      return cachedSessionStatus;
    } catch {
      cachedSessionStatus = { authenticated: false };
      return cachedSessionStatus;
    } finally {
      inFlightSessionStatusPromise = null;
    }
  })();

  return inFlightSessionStatusPromise;
}

export function resetClientAuthSessionStatusCache() {
  inFlightSessionStatusPromise = null;
  cachedSessionStatus = null;
}
