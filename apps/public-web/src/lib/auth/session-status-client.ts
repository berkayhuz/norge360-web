"use client";

type ClientAuthSessionStatus = {
  authenticated: boolean;
  status?: number;
};

let inFlightSessionStatusPromise: Promise<ClientAuthSessionStatus> | null = null;

export async function getClientAuthSessionStatus(): Promise<ClientAuthSessionStatus> {
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
        return {
          authenticated: false,
          status: response.status,
        };
      }

      const payload = (await response.json().catch(() => null)) as
        | { authenticated?: boolean }
        | null;

      return {
        authenticated: Boolean(payload?.authenticated),
        status: response.status,
      };
    } catch {
      return { authenticated: false };
    } finally {
      inFlightSessionStatusPromise = null;
    }
  })();

  return inFlightSessionStatusPromise;
}

export function resetClientAuthSessionStatusCache() {
  inFlightSessionStatusPromise = null;
}
