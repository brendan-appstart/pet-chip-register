# syntax=docker/dockerfile:1

# --- dependencies ---
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime ---
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -r nodejs && useradd -r -g nodejs nextjs \
  && mkdir -p /app/var && chown -R nextjs:nodejs /app

# Next.js standalone server + static assets + checked-in SQL migrations + the
# dependency-light migrator that runs on startup.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations
COPY --from=build --chown=nextjs:nodejs /app/scripts/migrate-prod.mjs ./scripts/migrate-prod.mjs

USER nextjs
EXPOSE 3000
# Apply migrations, then start the standalone server (self-contained first boot).
CMD ["sh", "-c", "node scripts/migrate-prod.mjs && node server.js"]
