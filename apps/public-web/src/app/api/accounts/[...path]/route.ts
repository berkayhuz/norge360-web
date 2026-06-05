import type { NextRequest } from "next/server";

import { proxyAccountsRequest } from "@/lib/api/accounts-proxy";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAccountsRequest(request, await context.params);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyAccountsRequest(request, await context.params);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAccountsRequest(request, await context.params);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAccountsRequest(request, await context.params);
}
