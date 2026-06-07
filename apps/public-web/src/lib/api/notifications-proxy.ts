import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const NOTIFICATIONS_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/$/ },
  { method: "GET", pattern: /^\/summary$/ },
  { method: "POST", pattern: /^\/seen$/ },
  { method: "GET", pattern: /^\/preferences$/ },
  { method: "PUT", pattern: /^\/preferences$/ },
];

const RESPONSE_HEADERS_TO_FORWARD = [
  "cache-control",
  "content-language",
  "content-type",
  "x-correlation-id",
];

type NotificationsProxyParams = {
  path?: string[];
};

export async function proxyNotificationsRequest(
  request: NextRequest,
  params: NotificationsProxyParams,
) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json(
      {
        detail: "public_web_config_invalid",
        errorCode: "public_web_config_invalid",
        status: 500,
        title: "public_web_config_invalid",
      },
      { status: 500 },
    );
  }

  const notificationPath = `/${(params.path ?? []).join("/")}`;
  const method = request.method.toUpperCase();
  if (!isAllowedNotificationsRoute(method, notificationPath)) {
    return NextResponse.json(
      {
        errorCode: "notifications_proxy_route_not_allowed",
        status: 404,
        title: "notifications_proxy_route_not_allowed",
      },
      { status: 404 },
    );
  }

  const upstreamUrl = new URL(`/api/notifications${notificationPath === "/" ? "" : notificationPath}`, env.gatewayApiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  let upstreamResponse: Response;
  try {
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
      {
        detail: "notifications_service_unavailable",
        errorCode: "notifications_service_unavailable",
        status: 503,
        title: "notifications_service_unavailable",
      },
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

  return new NextResponse(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

function createForwardHeaders(request: NextRequest, publicWebAppUrl: string) {
  const headers = new Headers();
  const sourceHeaders = request.headers;

  const accept = sourceHeaders.get("accept");
  const acceptLanguage = sourceHeaders.get("accept-language");
  const contentType = sourceHeaders.get("content-type");
  const cookie = sourceHeaders.get("cookie");
  const correlationId = sourceHeaders.get("x-correlation-id");
  const userAgent = sourceHeaders.get("user-agent");

  if (accept) headers.set("accept", accept);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (contentType) headers.set("content-type", contentType);
  if (cookie) headers.set("cookie", cookie);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (userAgent) headers.set("user-agent", userAgent);

  headers.set("origin", new URL(publicWebAppUrl).origin);
  headers.set("referer", publicWebAppUrl);
  return headers;
}

function isAllowedNotificationsRoute(method: string, path: string) {
  return NOTIFICATIONS_ALLOWED_ROUTES.some(
    (route) => route.method === method && route.pattern.test(path),
  );
}

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}
