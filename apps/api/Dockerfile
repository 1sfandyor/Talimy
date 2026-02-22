FROM oven/bun:1.3.9 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN HUSKY=0 NODE_ENV=development bun install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=development
RUN bun run --cwd packages/shared build
RUN bun run --cwd packages/database build
RUN bun run --cwd apps/api build
RUN test -f /app/apps/api/dist/main.js
RUN set -eux; \
  if find /app/apps/api/dist -type f -name '*.js' -print0 | xargs -0 grep -n 'require("@/' ; then \
    echo "Alias require found in dist JS"; \
    exit 1; \
  fi
RUN set -eux; \
  if find /app/apps/api/dist -type f -name '*.js' -print0 | xargs -0 grep -n 'from "@/' ; then \
    echo "Alias import found in dist JS"; \
    exit 1; \
  fi

FROM oven/bun:1.3.9 AS deps-prod
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN HUSKY=0 NODE_ENV=production bun install --frozen-lockfile


FROM oven/bun:1.3.9 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=deps-prod /app/package.json ./package.json
COPY --from=deps-prod /app/bun.lock ./bun.lock
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=deps-prod /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps-prod /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=deps-prod /app/packages ./packages
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
RUN test -d /app/apps/api/node_modules/@nestjs/common \
  && test -f /app/apps/api/dist/main.js \
  && test -f /app/packages/shared/dist/index.js \
  && test -f /app/packages/database/dist/index.js \
  && (test -d /app/packages/shared/node_modules/zod || test -d /app/apps/api/node_modules/zod || test -d /app/node_modules/zod) \
  && (test -d /app/packages/database/node_modules/dotenv || test -d /app/apps/api/node_modules/dotenv || test -d /app/node_modules/dotenv) \
  && (test -d /app/packages/database/node_modules/pg || test -d /app/apps/api/node_modules/pg || test -d /app/node_modules/pg)

EXPOSE 4000
CMD ["bun", "run", "--cwd", "apps/api", "start:prod"]
