FROM oven/bun:1.3.9 AS base
WORKDIR /app
ENV NODE_ENV=development

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN bun install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=production
RUN bun run --cwd apps/api build && (test -f /app/apps/api/dist/main.js || test -f /app/apps/api/dist/main)

FROM oven/bun:1.3.9 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages

EXPOSE 4000

CMD ["bun", "run", "--cwd", "apps/api", "start:prod"]
