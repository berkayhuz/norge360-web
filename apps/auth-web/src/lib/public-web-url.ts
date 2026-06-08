const DEFAULT_PUBLIC_WEB_URL =
  process.env.NODE_ENV === "production" ? "https://norge360.com/" : "http://localhost:3000/"

export function getPublicWebUrl(path: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.trim() ||
    DEFAULT_PUBLIC_WEB_URL

  try {
    return new URL(path, baseUrl).toString()
  } catch {
    return path
  }
}
