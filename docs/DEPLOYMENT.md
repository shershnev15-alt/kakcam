# Deployment

## Local

```bash
docker compose up -d --build
docker compose ps
```

Web: `http://localhost:3000`; Admin: `http://localhost:3001`; API: `http://localhost:4000`; PostgreSQL host port 5433; Redis host port 6380. API container применяет committed migrations и idempotent demo seed перед development start. Контейнеры не монтируют общий `node_modules`, поэтому зависимости API, Web и Admin изолированы и воспроизводимы.

Mobile запускается через Expo вне Compose: `pnpm --filter @arena/mobile dev`. API URL задаётся `EXPO_PUBLIC_API_URL`, по умолчанию используется `http://localhost:4000/api/v1`.

## Production direction

Separate OCI images for web/admin/api/worker, managed PostgreSQL/Redis/S3, migrations as one-off release job, CDN/WAF before public web, TLS everywhere, secrets from secret manager, daily backup + PITR. Demo seed and local admin credentials disabled. Rollout: preview → staging smoke → migration → rolling production → health/SLO verification → rollback if error budget gate fails.

Production Docker targets присутствуют как foundation, но не считаются launch-ready до Этапа 14: нужны non-root runtime, SBOM/signing, resource limits, worker image, secret integration, backup restore drill и environment runbooks.
