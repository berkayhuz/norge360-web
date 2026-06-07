import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ errorCode: "public_web_config_invalid", title: "public_web_config_invalid" }, { status: 500 });
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

    const proxyResponse = new NextResponse(response.body, {
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      status: response.status,
      statusText: response.statusText,
    });

    forwardSetCookieHeaders(response, proxyResponse);
    return proxyResponse;
  } catch {
    return NextResponse.json({ errorCode: "auth_service_unavailable", title: "auth_service_unavailable" }, { status: 503 });
  }
}

function forwardSetCookieHeaders(upstreamResponse: Response, response: NextResponse) {
  const getSetCookie = (
    upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies = getSetCookie?.call(upstreamResponse.headers) ?? [];

  if (cookies.length > 0) {
    for (const cookie of cookies) {
      response.headers.append("set-cookie", cookie);
    }
    return;
  }

  const cookie = upstreamResponse.headers.get("set-cookie");
  if (cookie) {
    response.headers.append("set-cookie", cookie);
  }
}
