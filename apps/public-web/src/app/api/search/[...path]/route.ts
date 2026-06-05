import type { NextRequest } from "next/server";

import { proxySearchRequest } from "@/lib/api/search-proxy";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxySearchRequest(request, await context.params);
}
