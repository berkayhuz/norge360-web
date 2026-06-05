import type { NextRequest } from "next/server"

import { proxyAuthRequest } from "@/src/lib/api/proxy"

type RouteContext = {
  params: Promise<{
    path: string[]
  }>
}

export const runtime = "nodejs"

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params)
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, await context.params)
}
