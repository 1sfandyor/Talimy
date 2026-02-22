FROM oven/bun:1.3.9 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN HUSKY=0 NODE_ENV=development bun install --frozen-lockfile

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=base /app /app
ARG APP_TARGET=web
ENV NODE_ENV=production
RUN cd apps/web && node node_modules/next/dist/bin/next build
RUN test -f /app/apps/web/.next/BUILD_ID

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/packages ./packages

EXPOSE 3000

CMD ["node", "apps/web/node_modules/next/dist/bin/next", "start", "-p", "3000"]
