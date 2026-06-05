import type { DiscoverUser, DiscoveryHub } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new Error((data as { title?: string } | null)?.title ?? "discovery_request_failed");
  }
  return (data ?? ({} as T)) as T;
}

export async function getPopularUsers(limit = 10) {
  const response = await fetch(`/api/discovery/popular-users?limit=${limit}`, { cache: "no-store" });
  return readJson<DiscoverUser[]>(response);
}

export async function getDiscoveryHub(limit = 10) {
  const response = await fetch(`/api/discovery/hub?limit=${limit}`, { cache: "no-store" });
  return readJson<DiscoveryHub>(response);
}
