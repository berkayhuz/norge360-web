import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const RESPONSE_HEADERS_TO_FORWARD = [
  "cache-control",
  "content-language",
  "content-type",
  "x-correlation-id",
];

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAuthRequest(request, await context.params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAuthRequest(request, await context.params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAuthRequest(request, await context.params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAuthRequest(request, await context.params);
}

async function proxyAuthRequest(request: NextRequest, params: { path: string[] }) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json(
      { errorCode: "public_web_config_invalid", title: "public_web_config_invalid" },
      { status: 500 },
    );
  }

  const authPath = `/${params.path.join("/")}`;
  const upstreamUrl = new URL(`/api/auth${authPath}`, env.gatewayApiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  let upstreamResponse: Response;
  try {
    const method = request.method.toUpperCase();
    upstreamResponse = await fetch(upstreamUrl, {
      body: canHaveBody(method) ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      headers: createForwardHeaders(request, env.publicWebAppUrl),
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { errorCode: "auth_service_unavailable", title: "auth_service_unavailable" },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  for (const header of RESPONSE_HEADERS_TO_FORWARD) {
    const value = upstreamResponse.headers.get(header);
    if (value) {
      responseHeaders.set(header, value);
    }
  }

  const proxyResponse = new NextResponse(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });

  forwardSetCookieHeaders(upstreamResponse, proxyResponse);
  return proxyResponse;
}

function createForwardHeaders(request: NextRequest, publicWebAppUrl: string) {
  const headers = new Headers();
  const sourceHeaders = request.headers;

  const accept = sourceHeaders.get("accept");
  const acceptLanguage = sourceHeaders.get("accept-language");
  const cookie = sourceHeaders.get("cookie");
  const correlationId = sourceHeaders.get("x-correlation-id");
  const contentType = sourceHeaders.get("content-type");
  const userAgent = sourceHeaders.get("user-agent");

  if (accept) headers.set("accept", accept);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (cookie) headers.set("cookie", cookie);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (contentType) headers.set("content-type", contentType);
  if (userAgent) headers.set("user-agent", userAgent);

  headers.set("origin", new URL(publicWebAppUrl).origin);
  headers.set("referer", publicWebAppUrl);

  return headers;
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

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}
