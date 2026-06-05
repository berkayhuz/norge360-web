import type { NextRequest } from "next/server";

import { proxyCommunityRequest } from "@/lib/api/community-proxy";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyCommunityRequest(request, await context.params);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyCommunityRequest(request, await context.params);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyCommunityRequest(request, await context.params);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyCommunityRequest(request, await context.params);
}
