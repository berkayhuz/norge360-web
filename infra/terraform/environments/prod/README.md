# Prod Environment

This environment manages the public frontend host and DNS for `norge360-web`.

## Current scope

- `norge360-frontend-1`
- `norge360-web-frontend-firewall`
- Hetzner SSH key registration for the frontend admin key
- Cloudflare DNS records for `norge360.com`, `auth.norge360.com`, and `www.norge360.com`
- Optional Docker bootstrap on the frontend server

## Required inputs

- `HCLOUD_TOKEN`
- `CLOUDFLARE_API_TOKEN`

If you enable the Docker bootstrap, add your SSH CIDR(s) to `frontend_admin_cidrs` first so the firewall still allows the remote-exec session.

## Workflow

1. Set `HCLOUD_TOKEN` in your shell.
2. Set `CLOUDFLARE_API_TOKEN` in your shell.
3. Run `terraform init` inside this directory.
4. Run `terraform plan`.
5. Run `terraform apply` after reviewing the plan.
