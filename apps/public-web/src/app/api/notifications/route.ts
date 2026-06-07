import { NextRequest } from "next/server";

import { proxyNotificationsRequest } from "@/lib/api/notifications-proxy";

export async function GET(request: NextRequest) {
  return proxyNotificationsRequest(request, { path: [] });
}
