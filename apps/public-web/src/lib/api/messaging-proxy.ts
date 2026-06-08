import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const GUID = "[0-9a-fA-F-]{36}";

const MESSAGING_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/conversations$/ },
  { method: "POST", pattern: /^\/conversations\/direct$/ },
  { method: "POST", pattern: /^\/conversations\/groups$/ },
  { method: "GET", pattern: new RegExp(`^/conversations/${GUID}/messages$`) },
  { method: "POST", pattern: new RegExp(`^/conversations/${GUID}/messages$`) },
  { method: "PATCH", pattern: new RegExp(`^/conversations/${GUID}/messages/${GUID}$`) },
  { method: "POST", pattern: new RegExp(`^/conversations/${GUID}/messages/${GUID}/recall$`) },
  { method: "POST", pattern: new RegExp(`^/conversations/${GUID}/messages/${GUID}/reactions$`) },
  { method: "DELETE", pattern: new RegExp(`^/conversations/${GUID}/messages/${GUID}/reactions/.+$`) },
  { method: "POST", pattern: new RegExp(`^/conversations/${GUID}/read$`) },
  { method: "PATCH", pattern: new RegExp(`^/conversations/${GUID}/me$`) },
  { method: "GET", pattern: new RegExp(`^/conversations/${GUID}/media$`) },
  { method: "POST", pattern: new RegExp(`^/conversations/${GUID}/reports$`) },
  { method: "POST", pattern: /^\/search$/ },
  { method: "GET", pattern: /^\/settings$/ },
  { method: "PUT", pattern: /^\/settings$/ },
  { method: "POST", pattern: /^\/devices$/ },
  { method: "DELETE", pattern: /^\/devices\/[A-Za-z0-9._:-]{1,128}$/ },
  { method: "GET", pattern: new RegExp(`^/users/${GUID}/devices$`) },
  { method: "POST", pattern: new RegExp(`^/requests/${GUID}/accept$`) },
  { method: "POST", pattern: new RegExp(`^/requests/${GUID}/reject$`) },
];

const RESPONSE_HEADERS_TO_FORWARD = ["cache-control", "content-language", "content-type", "x-correlation-id"];

type MessagingProxyParams = { path: string[] };

export async function proxyMessagingRequest(request: NextRequest, params: MessagingProxyParams) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json(
      { detail: "public_web_config_invalid", errorCode: "public_web_config_invalid", status: 500, title: "public_web_config_invalid" },
      { status: 500 },
    );
  }

  const messagingPath = `/${params.path.join("/")}`;
  const method = request.method.toUpperCase();
  if (!isAllowedMessagingRoute(method, messagingPath)) {
    return NextResponse.json(
      { errorCode: "messaging_proxy_route_not_allowed", status: 404, title: "messaging_proxy_route_not_allowed" },
      { status: 404 },
    );
  }

  const upstreamUrl = new URL(`/api/messaging${messagingPath}`, env.gatewayApiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      body: canHaveBody(method) ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      headers: createForwardHeaders(request, env.publicWebAppUrl),
      method,
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
  for (const header of RESPONSE_HEADERS_TO_FORWARD) {
    const value = upstreamResponse.headers.get(header);
    if (value) responseHeaders.set(header, value);
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
  const authorization = sourceHeaders.get("authorization");
  const contentType = sourceHeaders.get("content-type");
  const cookie = sourceHeaders.get("cookie");
  const correlationId = sourceHeaders.get("x-correlation-id");
  const userAgent = sourceHeaders.get("user-agent");

  if (accept) headers.set("accept", accept);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);
  if (cookie) headers.set("cookie", cookie);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (userAgent) headers.set("user-agent", userAgent);

  headers.set("origin", new URL(publicWebAppUrl).origin);
  headers.set("referer", publicWebAppUrl);
  return headers;
}

function isAllowedMessagingRoute(method: string, path: string) {
  return MESSAGING_ALLOWED_ROUTES.some((route) => route.method === method && route.pattern.test(path));
}

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}
