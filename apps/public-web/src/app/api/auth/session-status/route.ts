import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ errorCode: "public_web_config_invalid", title: "public_web_config_invalid" }, { status: 500 });
  }

  const upstreamUrl = new URL("/api/auth/session-status", env.gatewayApiBaseUrl);
  try {
    const initialResponse = await fetchSessionStatus(request, upstreamUrl, request.headers.get("cookie") ?? "", env.publicWebAppUrl);
    if (initialResponse.ok) {
      return NextResponse.json({ authenticated: true, session: initialResponse.session }, { status: 200, headers: initialResponse.headers });
    }

    if (initialResponse.status === 401 || initialResponse.status === 403) {
      const refreshResult = await refreshSession(request, env);
      if (refreshResult) {
        const refreshedResponse = await fetchSessionStatus(request, upstreamUrl, refreshResult.cookieHeader, env.publicWebAppUrl);
        if (refreshedResponse.ok) {
          const response = NextResponse.json({ authenticated: true, session: refreshedResponse.session }, { status: 200 });
          for (const cookie of refreshResult.setCookies) {
            response.headers.append("set-cookie", cookie);
          }
          for (const [key, value] of refreshedResponse.headers.entries()) {
            response.headers.set(key, value);
          }
          return response;
        }

        const response = NextResponse.json({ authenticated: false }, { status: 200 });
        for (const cookie of refreshResult.setCookies) {
          response.headers.append("set-cookie", cookie);
        }
        return response;
      }

      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ authenticated: false }, { status: initialResponse.status });
  } catch {
    return NextResponse.json({ errorCode: "auth_service_unavailable", title: "auth_service_unavailable" }, { status: 503 });
  }
}

async function fetchSessionStatus(request: NextRequest, upstreamUrl: URL, cookieHeader: string, publicWebAppUrl: string) {
  const response = await fetch(upstreamUrl, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      cookie: cookieHeader,
      origin: new URL(publicWebAppUrl).origin,
      referer: publicWebAppUrl,
      "user-agent": request.headers.get("user-agent") ?? "public-web-client",
    },
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, session: null, headers: new Headers() } as const;
  }

  const session = await response.json().catch(() => null);
  if (!session) {
    return { ok: false, status: response.status, session: null, headers: new Headers() } as const;
  }

  const headers = new Headers();
  const contentLanguage = response.headers.get("content-language");
  const contentType = response.headers.get("content-type");
  const correlationId = response.headers.get("x-correlation-id");
  if (contentLanguage) headers.set("content-language", contentLanguage);
  if (contentType) headers.set("content-type", contentType);
  if (correlationId) headers.set("x-correlation-id", correlationId);

  return { ok: true, status: response.status, session, headers } as const;
}

async function refreshSession(request: NextRequest, env: ReturnType<typeof tryGetServerEnv>["env"]) {
  if (!env) return null;

  const sessionId = request.cookies.get(env.authCookieNames.session)?.value?.trim();
  const refreshToken = request.cookies.get(env.authCookieNames.refresh)?.value?.trim();
  if (!sessionId || !refreshToken) return null;

  const upstreamUrl = new URL("/api/auth/refresh", env.gatewayApiBaseUrl);
  const response = await fetch(upstreamUrl, {
    body: JSON.stringify({ sessionId, refreshToken }),
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
      origin: new URL(env.publicWebAppUrl).origin,
      referer: request.nextUrl.href,
      "user-agent": request.headers.get("user-agent") ?? "public-web-client",
    },
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return null;
  }

  const setCookies = readSetCookies(response);
  if (setCookies.length === 0) {
    return null;
  }

  return {
    cookieHeader: mergeCookieHeader(request.headers.get("cookie") ?? "", setCookies),
    setCookies,
  } as const;
}

function readSetCookies(response: Response) {
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = getSetCookie?.call(response.headers) ?? [];
  if (cookies.length > 0) {
    return cookies;
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function mergeCookieHeader(existingCookieHeader: string, setCookieHeaders: string[]) {
  const cookies = new Map<string, string>();
  for (const part of existingCookieHeader.split(";")) {
    const [name, ...valueParts] = part.split("=");
    const key = name?.trim();
    if (!key) continue;
    cookies.set(key, valueParts.join("=").trim());
  }

  for (const header of setCookieHeaders) {
    const [pair] = header.split(";", 1);
    const [name, ...valueParts] = pair.split("=");
    const key = name?.trim();
    if (!key) continue;
    cookies.set(key, valueParts.join("=").trim());
  }

  return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}
