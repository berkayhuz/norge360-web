import { NextRequest } from "next/server";

import { proxyNotificationsRequest } from "@/lib/api/notifications-proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyNotificationsRequest(request, await context.params);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyNotificationsRequest(request, await context.params);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyNotificationsRequest(request, await context.params);
}
