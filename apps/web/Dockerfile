# Built from the repo root (context: .) so /content is available to the build.
FROM node:24-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace web --include-workspace-root && mkdir -p apps/web/node_modules

FROM node:24-alpine AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json ./
COPY content ./content
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build -w web

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S codex && adduser -S codex -G codex
# standalone output mirrors the monorepo layout (outputFileTracingRoot = repo root)
COPY --from=build --chown=codex:codex /repo/apps/web/.next/standalone ./
COPY --from=build --chown=codex:codex /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=codex:codex /repo/apps/web/public ./apps/web/public
USER codex
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
