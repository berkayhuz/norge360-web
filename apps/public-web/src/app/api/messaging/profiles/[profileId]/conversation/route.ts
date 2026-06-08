import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { resolveAuthUserIdByProfileId, resolveAuthUserIdByUsername } from "@/lib/api/accounts-server";
import { tryGetServerEnv } from "@/lib/env/server";

type RouteContext = {
  params: Promise<{
    profileId: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: RouteContext) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json(
      { detail: "public_web_config_invalid", errorCode: "public_web_config_invalid", status: 500, title: "public_web_config_invalid" },
      { status: 500 },
    );
  }

  const { profileId } = await context.params;
  const normalizedProfileId = profileId.startsWith("user-") ? profileId.slice(5) : profileId;
  const username = request.nextUrl.searchParams.get("username")?.trim() ?? null;
  const targetUserId =
    (isGuid(normalizedProfileId) ? await resolveAuthUserIdByProfileId(normalizedProfileId) : null) ??
    (username ? await resolveAuthUserIdByUsername(username) : null) ??
    (!isGuid(normalizedProfileId) ? await resolveAuthUserIdByUsername(normalizedProfileId) : null);
  if (!targetUserId) {
    return NextResponse.json(
      { detail: "profile_not_found", errorCode: "profile_not_found", status: 404, title: "profile_not_found" },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const upstreamUrl = new URL("/api/messaging/conversations/direct", env.gatewayApiBaseUrl);
  const authorization = requestHeaders.get("authorization");
  const upstreamHeaders = new Headers({
    accept: "application/json",
    "content-type": "application/json",
    cookie: cookieStore.toString(),
    origin: new URL(env.publicWebAppUrl).origin,
    referer: request.nextUrl.href,
    "user-agent": requestHeaders.get("user-agent") ?? "public-web-server",
    "x-correlation-id": requestHeaders.get("x-correlation-id") ?? crypto.randomUUID(),
  });
  if (authorization) {
    upstreamHeaders.set("authorization", authorization);
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      body: JSON.stringify({ targetUserId, initialMessage: null }),
      cache: "no-store",
      headers: upstreamHeaders,
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json(
      { detail: "messaging_service_unavailable", errorCode: "messaging_service_unavailable", status: 503, title: "messaging_service_unavailable" },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  return new NextResponse(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

function isGuid(value: string) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}
