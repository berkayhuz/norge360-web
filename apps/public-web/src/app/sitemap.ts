import type { MetadataRoute } from "next";

import { tryGetServerEnv } from "@/lib/env/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { env } = tryGetServerEnv();
  const baseUrl = env?.siteUrl ?? "http://localhost:3000";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      changeFrequency: "daily",
      lastModified: now,
      priority: 1,
      url: new URL("/", baseUrl).toString(),
    }
  ];

  return entries;
}
