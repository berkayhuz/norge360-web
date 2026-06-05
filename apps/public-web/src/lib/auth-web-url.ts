const DEFAULT_LOGIN_PATH = "/login";
const DEFAULT_REGISTER_PATH = "/register";

export function getAuthWebLoginUrl() {
  return buildAuthWebUrl(DEFAULT_LOGIN_PATH);
}

export function getAuthWebRegisterUrl() {
  return buildAuthWebUrl(DEFAULT_REGISTER_PATH);
}

function buildAuthWebUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_WEB_URL?.trim();
  if (!baseUrl) {
    return path;
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
