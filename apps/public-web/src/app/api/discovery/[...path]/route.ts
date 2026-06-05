import type { NextRequest } from "next/server";

import { proxyDiscoveryRequest } from "@/lib/api/discovery-proxy";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyDiscoveryRequest(request, await context.params);
}
