import "server-only";

import { cookies, headers } from "next/headers";

import { tryGetServerEnv } from "@/lib/env/server";

import {
  normalizeNotificationPreferences,
  normalizeNotificationsPage,
  normalizeNotificationSummary,
  type NotificationsPage,
  type NotificationPreferences,
  type NotificationSummary,
} from "@/features/notifications/lib/types";

type GatewayResponse<T> = {
  data?: T;
  error?: { status?: number };
  status?: number;
};

type NotificationsPageInput = {
  markAsSeen?: boolean;
  page?: number;
  pageSize?: number;
};

export async function getNotificationsPage(
  input: NotificationsPageInput = {},
): Promise<GatewayResponse<NotificationsPage>> {
  const response = await requestGateway(`/api/notifications?${new URLSearchParams({
    markAsSeen: String(input.markAsSeen ?? true),
    page: String(input.page ?? 1),
    pageSize: String(input.pageSize ?? 20),
  }).toString()}`);

  if ("error" in response) {
    return { error: response.error, status: response.status };
  }

  return {
    data: normalizeNotificationsPage(response.data),
    status: response.status,
  };
}

export async function getNotificationSummary(): Promise<GatewayResponse<NotificationSummary>> {
  const response = await requestGateway("/api/notifications/summary");

  if ("error" in response) {
    return { error: response.error, status: response.status };
  }

  return {
    data: normalizeNotificationSummary(response.data),
    status: response.status,
  };
}

export async function getNotificationPreferences(): Promise<GatewayResponse<NotificationPreferences>> {
  const response = await requestGateway("/api/notifications/preferences");

  if ("error" in response) {
    return { error: response.error, status: response.status };
  }

  return {
    data: normalizeNotificationPreferences(response.data),
    status: response.status,
  };
}

async function requestGateway(path: string): Promise<GatewayResponse<unknown>> {
  const { env } = tryGetServerEnv();
  if (!env) {
    return { error: { status: 500 } };
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const upstreamUrl = new URL(path, env.gatewayApiBaseUrl);

  try {
    const response = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: cookieStore.toString(),
        origin: new URL(env.publicWebAppUrl).origin,
        referer: env.publicWebAppUrl,
        "user-agent": requestHeaders.get("user-agent") ?? "public-web-server",
        "x-correlation-id": requestHeaders.get("x-correlation-id") ?? crypto.randomUUID(),
      },
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    const data = await safeReadJson(response);
    return { data, status: response.status };
  } catch {
    return { error: { status: 503 } };
  }
}

async function safeReadJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json().catch(() => null)) as unknown;
}
