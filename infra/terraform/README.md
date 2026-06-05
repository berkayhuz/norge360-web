# Terraform

This folder is the infrastructure root for `norge360-web`.

## Current scope

- Frontend server bootstrap support
- Firewall rules for the public frontend node
- DNS records for `norge360.com` and `auth.norge360.com`
- Environment-specific stacks

## Layout

- `backend.tf`: remote state configuration
- `providers.tf`: provider configuration
- `versions.tf`: Terraform and provider version constraints
- `modules/`: reusable infrastructure building blocks
- `environments/`: per-environment root modules

## Notes

- The production stack currently targets the existing frontend server `norge360-frontend-1`.
- Docker and Docker Compose are bootstrapped on the frontend host when enabled.
- TLS is expected to terminate on the frontend host layer, with Cloudflare proxying enabled for public DNS records.
