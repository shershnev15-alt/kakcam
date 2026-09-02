FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/demo-data/package.json packages/demo-data/package.json
RUN pnpm install --filter @arena/web... --no-frozen-lockfile

FROM dependencies AS development
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/config packages/config
COPY packages/types packages/types
COPY packages/demo-data packages/demo-data
EXPOSE 3000
CMD ["pnpm", "--filter", "@arena/web", "dev"]

FROM development AS builder
RUN pnpm --filter @arena/web build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /workspace/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
