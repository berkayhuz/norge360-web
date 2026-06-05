# Norge360 Kubernetes

This directory contains a production-oriented Kustomize overlay for the web frontend stack.

## Apply

```bash
kubectl apply -k k8s/production
```

## What it includes

- `norge360-public-web`
- `norge360-auth-web`

## Notes

- This overlay is a deployment scaffold for a future Kubernetes-hosted frontend.
- TLS is modeled at the ingress layer with a dedicated secret placeholder.
- Network policies default-deny ingress and egress, then reopen only the paths needed for the frontend apps.
