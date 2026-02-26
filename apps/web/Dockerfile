ARG BUN_IMAGE=oven/bun:1.3.9

FROM ${BUN_IMAGE} AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN HUSKY=0 NODE_ENV=development bun install --frozen-lockfile

FROM ${BUN_IMAGE} AS build
WORKDIR /app
COPY --from=base /app /app
ARG APP_TARGET=web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --cwd packages/shared build
RUN bun run --cwd apps/web build
RUN test -f /app/apps/web/.next/BUILD_ID

FROM ${BUN_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/packages ./packages

EXPOSE 3000

CMD ["bun", "run", "--smol", "--cwd", "apps/web", "start"]
