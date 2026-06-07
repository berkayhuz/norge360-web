import { NextRequest, NextResponse } from "next/server";

import { tryGetServerEnv } from "@/lib/env/server";

const ACCOUNTS_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/profiles\/me$/ },
  { method: "GET", pattern: /^\/profiles\/[A-Za-z0-9_-]{1,64}$/ },
  { method: "GET", pattern: /^\/usernames\/check$/ },
  { method: "GET", pattern: /^\/internal\/users\/[A-Za-z0-9-]{1,64}\/identity$/ },
  { method: "POST", pattern: /^\/internal\/users\/batch-summary$/ },
  { method: "PATCH", pattern: /^\/profiles\/me$/ },
  { method: "POST", pattern: /^\/profiles\/[A-Za-z0-9_.-]{1,64}\/views$/ },
  { method: "POST", pattern: /^\/profiles\/me\/avatar\/upload-intent$/ },
  { method: "POST", pattern: /^\/profiles\/me\/avatar\/complete$/ },
  { method: "POST", pattern: /^\/profiles\/me\/cover-photo\/upload-intent$/ },
  { method: "POST", pattern: /^\/profiles\/me\/cover-photo\/complete$/ },
  { method: "POST", pattern: /^\/blocks\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "DELETE", pattern: /^\/blocks\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "POST", pattern: /^\/follows\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "DELETE", pattern: /^\/follows\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "POST", pattern: /^\/follows\/requests\/[A-Za-z0-9_.-]{1,64}\/accept$/ },
  { method: "DELETE", pattern: /^\/follows\/requests\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "GET", pattern: /^\/follows\/[A-Za-z0-9_.-]{1,64}\/status$/ },
  { method: "GET", pattern: /^\/follows\/[A-Za-z0-9_.-]{1,64}\/followers$/ },
  { method: "GET", pattern: /^\/follows\/[A-Za-z0-9_.-]{1,64}\/following$/ },
  { method: "GET", pattern: /^\/profile-notifications\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "POST", pattern: /^\/profile-notifications\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "DELETE", pattern: /^\/profile-notifications\/[A-Za-z0-9_.-]{1,64}$/ },
  { method: "GET", pattern: /^\/blocks\/me\/relations$/ },
  { method: "GET", pattern: /^\/blocks\/me$/ },
];

const RESPONSE_HEADERS_TO_FORWARD = [
  "cache-control",
  "content-language",
  "content-type",
  "x-correlation-id",
];

type AccountsProxyParams = {
  path: string[];
};

export async function proxyAccountsRequest(
  request: NextRequest,
  params: AccountsProxyParams,
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

  const accountsPath = `/${params.path.join("/")}`;
  if (!isAllowedAccountsRoute(request.method, accountsPath)) {
    return NextResponse.json(
      {
        errorCode: "accounts_proxy_route_not_allowed",
        status: 404,
        title: "accounts_proxy_route_not_allowed",
      },
      { status: 404 },
    );
  }

  const upstreamUrl = new URL(`/api/accounts${accountsPath}`, env.gatewayApiBaseUrl);
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
      {
        errorCode: "accounts_service_unavailable",
        status: 503,
        detail: "accounts_service_unavailable",
        title: "accounts_service_unavailable",
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

function isAllowedAccountsRoute(method: string, path: string) {
  return ACCOUNTS_ALLOWED_ROUTES.some(
    (route) => route.method === method.toUpperCase() && route.pattern.test(path),
  );
}

function canHaveBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}
