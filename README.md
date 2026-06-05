# Norge360 Web

Frontend stack for `norge360.com` and `auth.norge360.com`.

## Local Docker

Use the repo-root env file:

- `.env.local`
- If you need to recreate it, copy `.env.local.example` to `.env.local`.

Then start the stack:

```powershell
docker compose up -d --build
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
