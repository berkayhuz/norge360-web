const DEFAULT_AUTH_WEB_URL = "https://auth.norge360.com";
const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";

export function getAuthWebLoginUrl() {
  return buildAuthWebUrl(LOGIN_PATH);
}

export function getAuthWebRegisterUrl() {
  return buildAuthWebUrl(REGISTER_PATH);
}

function buildAuthWebUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_WEB_URL?.trim() || DEFAULT_AUTH_WEB_URL;

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
