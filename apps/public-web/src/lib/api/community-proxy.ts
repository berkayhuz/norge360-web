import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const COMMUNITY_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/feed$/ },
  { method: "GET", pattern: /^\/saved-posts$/ },
  { method: "GET", pattern: /^\/posts\/saved$/ },
  { method: "GET", pattern: /^\/bookmarks$/ },
  { method: "GET", pattern: /^\/users\/[A-Za-z0-9-]{1,64}\/posts$/ },
  { method: "GET", pattern: /^\/[A-Za-z0-9-]{1,64}\/feed\/[A-Za-z0-9-]{1,64}$/ },
  { method: "GET", pattern: /^\/[A-Za-z0-9-]{1,64}\/feed\/[A-Za-z0-9-]{1,64}\/comments$/ },
  { method: "GET", pattern: /^\/[A-Za-z0-9-]{1,64}\/feed\/[A-Za-z0-9-]{1,64}\/comments\/[A-Za-z0-9-]{1,64}$/ },
  { method: "GET", pattern: /^\/[A-Za-z0-9-]{1,64}\/feed\/[A-Za-z0-9-]{1,64}\/comments\/[A-Za-z0-9-]{1,64}\/replies$/ },
  { method: "POST", pattern: /^\/posts$/ },
  { method: "GET", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}$/ },
  { method: "PUT", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}$/ },
  { method: "DELETE", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/comments$/ },
  { method: "GET", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/comments$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/like$/ },
  { method: "DELETE", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/like$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/save$/ },
  { method: "DELETE", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/save$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/interest$/ },
  { method: "PUT", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/interest$/ },
  { method: "DELETE", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/interest$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/reactions$/ },
  { method: "DELETE", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/reactions$/ },
  { method: "POST", pattern: /^\/posts\/[A-Za-z0-9-]{1,64}\/reports$/ },
  { method: "POST", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/replies$/ },
  { method: "DELETE", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}$/ },
  { method: "GET", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}$/ },
  { method: "GET", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/replies$/ },
  { method: "POST", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/like$/ },
  { method: "DELETE", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/like$/ },
  { method: "POST", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/reactions$/ },
  { method: "DELETE", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/reactions$/ },
  { method: "POST", pattern: /^\/comments\/[A-Za-z0-9-]{1,64}\/reports$/ },
  { method: "GET", pattern: /^\/moderation\/reports$/ },
  { method: "POST", pattern: /^\/moderation\/posts\/[A-Za-z0-9-]{1,64}\/hide$/ },
  { method: "POST", pattern: /^\/moderation\/posts\/[A-Za-z0-9-]{1,64}\/restore$/ },
  { method: "POST", pattern: /^\/moderation\/comments\/[A-Za-z0-9-]{1,64}\/hide$/ },
  { method: "POST", pattern: /^\/moderation\/comments\/[A-Za-z0-9-]{1,64}\/restore$/ },
];

const RESPONSE_HEADERS_TO_FORWARD = ["cache-control", "content-language", "content-type", "x-correlation-id"];

type CommunityProxyParams = { path: string[] };

export async function proxyCommunityRequest(request: NextRequest, params: CommunityProxyParams) {
  const { env } = tryGetServerEnv();
  if (!env) {
    return NextResponse.json({ detail: "public_web_config_invalid", errorCode: "public_web_config_invalid", status: 500, title: "public_web_config_invalid" }, { status: 500 });
  }

  const communityPath = `/${params.path.join("/")}`;
  const method = request.method.toUpperCase();

  if (!isAllowedCommunityRoute(method, communityPath)) {
    return NextResponse.json({ errorCode: "community_proxy_route_not_allowed", status: 404, title: "community_proxy_route_not_allowed" }, { status: 404 });
  }

  const upstreamUrl = new URL(`/api/community${communityPath}`, env.gatewayApiBaseUrl);
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
    return NextResponse.json({ detail: "community_service_unavailable", errorCode: "community_service_unavailable", status: 503, title: "community_service_unavailable" }, { status: 503 });
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
  const contentType = sourceHeaders.get("content-type");
  const correlationId = sourceHeaders.get("x-correlation-id");
  const userAgent = sourceHeaders.get("user-agent");

  if (accept) headers.set("accept", accept);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (userAgent) headers.set("user-agent", userAgent);

  headers.set("origin", new URL(publicWebAppUrl).origin);
  headers.set("referer", publicWebAppUrl);
  return headers;
}

function isAllowedCommunityRoute(method: string, path: string) {
  return COMMUNITY_ALLOWED_ROUTES.some((route) => route.method === method && route.pattern.test(path));
}

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}
