FROM oven/bun:1.3.9 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN NODE_ENV=development bun install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=production
RUN bun run --cwd apps/api build
RUN (test -f /app/apps/api/dist/main.js || test -f /app/apps/api/dist/main || test -f /app/apps/api/dist/apps/api/src/main.js) \
  && ! grep -R 'require("@/' /app/apps/api/dist \
  && ! grep -R 'from "@/' /app/apps/api/dist

FROM oven/bun:1.3.9 AS runner
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN NODE_ENV=production bun install --frozen-lockfile \
  && test -d /app/node_modules/zod \
  && rm -rf /app/apps/api/src

COPY --from=build /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["bun", "run", "--cwd", "apps/api", "start:prod"]
