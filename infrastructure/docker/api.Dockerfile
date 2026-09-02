FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/demo-data/package.json packages/demo-data/package.json
COPY packages/rating-engine/package.json packages/rating-engine/package.json
COPY packages/achievements-engine/package.json packages/achievements-engine/package.json
RUN pnpm install --filter @arena/api... --no-frozen-lockfile

FROM dependencies AS development
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/types packages/types
COPY packages/demo-data packages/demo-data
COPY packages/rating-engine packages/rating-engine
COPY packages/achievements-engine packages/achievements-engine
EXPOSE 4000
CMD ["sh", "-lc", "pnpm --filter @arena/api prisma:generate && pnpm --filter @arena/api prisma:migrate && pnpm --filter @arena/api prisma:seed && pnpm --filter @arena/api dev"]

FROM development AS builder
RUN pnpm --filter @arena/api build

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /workspace/apps/api/dist ./dist
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/api/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
