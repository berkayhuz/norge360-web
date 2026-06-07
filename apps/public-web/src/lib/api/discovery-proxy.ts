import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const DISCOVERY_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/popular-users$/ },
  { method: "GET", pattern: /^\/trending-users$/ },
  { method: "GET", pattern: /^\/follow-suggestions$/ },
  { method: "GET", pattern: /^\/hub$/ },
];

const RESPONSE_HEADERS_TO_FORWARD = ["cache-control", "content-language", "content-type", "x-correlation-id"];

type DiscoveryProxyParams = { path: string[] };

export async function proxyDiscoveryRequest(request: NextRequest, params: DiscoveryProxyParams) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ detail: "public_web_config_invalid", errorCode: "public_web_config_invalid", status: 500, title: "public_web_config_invalid" }, { status: 500 });
  }

  const discoveryPath = `/${params.path.join("/")}`;
  const method = request.method.toUpperCase();
  if (!DISCOVERY_ALLOWED_ROUTES.some((route) => route.method === method && route.pattern.test(discoveryPath))) {
    return NextResponse.json({ errorCode: "discovery_proxy_route_not_allowed", status: 404, title: "discovery_proxy_route_not_allowed" }, { status: 404 });
  }

  const upstreamUrl = new URL(`/api/discovery${discoveryPath}`, env.gatewayApiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: createForwardHeaders(request, env.publicWebAppUrl),
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ detail: "discovery_service_unavailable", errorCode: "discovery_service_unavailable", status: 503, title: "discovery_service_unavailable" }, { status: 503 });
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
  const cookie = sourceHeaders.get("cookie");
  const correlationId = sourceHeaders.get("x-correlation-id");
  const userAgent = sourceHeaders.get("user-agent");

  if (accept) headers.set("accept", accept);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (cookie) headers.set("cookie", cookie);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (userAgent) headers.set("user-agent", userAgent);
  headers.set("origin", new URL(publicWebAppUrl).origin);
  headers.set("referer", publicWebAppUrl);
  return headers;
}
