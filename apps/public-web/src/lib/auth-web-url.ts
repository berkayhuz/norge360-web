const DEFAULT_LOGIN_PATH = "https://auth.norge360.com/login";
const DEFAULT_REGISTER_PATH = "https://auth.norge360.com/register";

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
