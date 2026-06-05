import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ title: "Public web configuration error" }, { status: 500 });
  }

  const upstreamUrl = new URL("/api/auth/logout", env.gatewayApiBaseUrl);
  try {
    const body = await request.text();
    const response = await fetch(upstreamUrl, {
      body: body.length > 0 ? body : "{}",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    return new NextResponse(response.body, {
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      status: response.status,
      statusText: response.statusText,
    });
  } catch {
    return NextResponse.json({ title: "Auth service unavailable" }, { status: 503 });
  }
}
