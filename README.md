# Norge360 Web

Frontend stack for `norge360.com` and `auth.norge360.com`.

## Local Docker

Use the repo-root env file:

- `.env.local`
- If you need to recreate it, copy `.env.local.example` to `.env.local`.

Then start the stack:

```powershell
docker compose --env-file .env.local up -d --build
```

## GitHub Secrets Sync

Sync production secrets from `.env.secrets.production` to the current GitHub repo:

```powershell
pnpm secrets:sync
```

For local HTTPS, map these hostnames to `127.0.0.1` in your hosts file:

- `norge360.com`
- `www.norge360.com`
- `auth.norge360.com`

The local Caddy config uses internal TLS so the browser can talk to the stack over HTTPS without public DNS.

## Production Deploy

Production on Hetzner uses a GitHub Actions self-hosted runner on `norge360-frontend-1`.

1. Install Docker and register the runner on the server with:

```bash
sudo bash scripts/ops/setup-hetzner-frontend-runner.sh \
  --repo berkayhuz/norge360-web \
  --token YOUR_RUNNER_REGISTRATION_TOKEN
```

2. Add these repository environment variables or secrets in GitHub Actions `production`:

- `GATEWAY_API_BASE_URL`
- `INTERNAL_API_BASE_URL`
- `AUTH_API_BASE_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

3. Push to `main`.

The deploy workflow writes a production env file on the runner, then runs:

```bash
docker compose --env-file .env.production -p norge360-web up -d --build --remove-orphans
```

If runner registration fails with `404`, generate a fresh GitHub runner registration token and rerun the bootstrap command. Those tokens expire quickly.

## Production Kubernetes

Apply the production overlay:

```powershell
kubectl apply -k k8s/production
```

Production is designed for:

- TLS at ingress
- 2 replicas per frontend
- HPA scaling
- rolling updates
- PDB protection during maintenance
- network policies that only allow backend egress
