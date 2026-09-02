# Deployment

## Local

```bash
docker compose up -d --build
docker compose ps
```

Web: `http://localhost:3000`; API: `http://localhost:4000`; PostgreSQL host port 5433; Redis host port 6380. API container применяет committed migrations и idempotent demo seed перед development start.

## Production direction

Separate OCI images for web/api/worker, managed PostgreSQL/Redis/S3, migrations as one-off release job, CDN/WAF before web, TLS everywhere, secrets from secret manager, daily backup + PITR. Demo seed disabled. Rollout: preview → staging smoke → migration → rolling production → health/SLO verification → rollback if error budget gate fails.

Production Docker targets присутствуют как foundation, но не считаются launch-ready до Этапа 14: нужны non-root runtime, SBOM/signing, resource limits, worker image, secret integration, backup restore drill и environment runbooks.
