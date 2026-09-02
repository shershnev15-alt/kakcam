FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @arena/admin... --no-frozen-lockfile

FROM dependencies AS development
COPY tsconfig.base.json ./
COPY apps/admin apps/admin
COPY packages/config packages/config
EXPOSE 3001
CMD ["pnpm", "--filter", "@arena/admin", "dev"]

FROM development AS builder
RUN pnpm --filter @arena/admin build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=builder /workspace/apps/admin/.next/standalone ./
COPY --chown=node:node --from=builder /workspace/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
USER node
CMD ["node", "apps/admin/server.js"]
