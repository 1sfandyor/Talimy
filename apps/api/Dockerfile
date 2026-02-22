FROM oven/bun:1.3.9 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN NODE_ENV=development bun install --frozen-lockfile

FROM base AS build
ENV NODE_ENV=development
RUN bun --cwd apps/api run build
RUN set -eux; \
  find /app/apps/api/dist -maxdepth 6 -type f | sed -n '1,200p'; \
  (test -f /app/apps/api/dist/main.js || test -f /app/apps/api/dist/main || test -f /app/apps/api/dist/apps/api/src/main.js)
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


FROM oven/bun:1.3.9 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages

EXPOSE 4000
CMD ["bun", "--cwd", "apps/api", "run", "start:prod"]
