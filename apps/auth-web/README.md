# Auth Web

This app serves the Norge360 authentication frontend.

## Runtime env

For local Docker, use the repo-root `./.env.local`.

For Kubernetes production, inject the same values through the deployment manifest or a secret manager.

Set:

- `AUTH_API_BASE_URL`
- `AUTH_WEB_APP_URL`
- `POST_LOGIN_REDIRECT_URL`
- `ALLOWED_REDIRECT_ORIGINS`
- `AUTH_COOKIE_DOMAIN`
- `AUTH_ACCESS_COOKIE_NAME`
- `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_SESSION_COOKIE_NAME`

## Notes

- In production, `AUTH_API_BASE_URL` should point at the trusted gateway endpoint, not the auth API directly.
- The app proxies auth requests to a private backend address, not a public `backend.norge360.com` hostname.
- Cookie domain should usually be `.norge360.com` so auth cookies work across subdomains.
- Local Docker is designed to run behind Caddy with `norge360.com` and `auth.norge360.com` mapped to `127.0.0.1`.
