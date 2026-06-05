import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ title: "Public web configuration error" }, { status: 500 });
  }

  const upstreamUrl = new URL("/api/auth/session-status", env.gatewayApiBaseUrl);
  try {
    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    if (!response.ok) {
      return NextResponse.json({ authenticated: false }, { status: response.status });
    }

    const session = await response.json().catch(() => null);
    return NextResponse.json({ authenticated: true, session }, { status: 200 });
  } catch {
    return NextResponse.json({ title: "Auth service unavailable" }, { status: 503 });
  }
}
