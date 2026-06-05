# Public Web

This app serves the Norge360 public frontend.

## Runtime env

For local Docker, use the repo-root `./.env.local`.

For Kubernetes production, inject the same values through the deployment manifest or a secret manager.

Set:

- `NEXT_PUBLIC_SITE_URL`
- `PUBLIC_WEB_APP_URL`
- `NEXT_PUBLIC_AUTH_WEB_URL`
- `GATEWAY_API_BASE_URL` or `INTERNAL_API_BASE_URL`
- `AUTH_ACCESS_COOKIE_NAME`
- `AUTH_SESSION_COOKIE_NAME`

For production on Hetzner, the backend URLs should target the backend server's private IP on the gateway's HTTP port, for example `http://10.0.0.2`.

## Notes

- The app talks to the backend through a private gateway address, not a public `backend.norge360.com` hostname.
- Browser-visible links to the auth app use `NEXT_PUBLIC_AUTH_WEB_URL`.
- Local Docker is designed to run behind Caddy with `norge360.com` and `auth.norge360.com` mapped to `127.0.0.1`.
