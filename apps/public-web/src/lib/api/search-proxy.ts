import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const SEARCH_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/suggest$/ },
  { method: "GET", pattern: /^$/ },
];

const RESPONSE_HEADERS_TO_FORWARD = [
  "cache-control",
  "content-language",
  "content-type",
  "x-correlation-id",
];

type SearchProxyParams = {
  path: string[];
};

export async function proxySearchRequest(
  request: NextRequest,
  params: SearchProxyParams,
) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json(
      {
        errorCode: "public_web_config_invalid",
        status: 500,
        detail: "public_web_config_invalid",
        title: "public_web_config_invalid",
      },
      { status: 500 },
    );
  }

  const searchPath = params.path.length > 0 ? `/${params.path.join("/")}` : "";
  if (!isAllowedSearchRoute(request.method, searchPath)) {
    return NextResponse.json(
      { errorCode: "search_proxy_route_not_allowed", status: 404, title: "search_proxy_route_not_allowed" },
      { status: 404 },
    );
  }

  const upstreamUrl = new URL(`/api/v1/search${searchPath}`, env.gatewayApiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: createForwardHeaders(request, env.publicWebAppUrl),
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      {
        errorCode: "search_service_unavailable",
        status: 503,
        detail: "search_service_unavailable",
        title: "search_service_unavailable",
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

function isAllowedSearchRoute(method: string, path: string) {
  return SEARCH_ALLOWED_ROUTES.some(
    (route) => route.method === method.toUpperCase() && route.pattern.test(path),
  );
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
