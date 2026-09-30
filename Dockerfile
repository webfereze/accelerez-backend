# syntax=docker/dockerfile:1
#
# Railway builds from this Dockerfile (see railway.json → builder: DOCKERFILE).
# Do not switch to Nixpacks/Railpack — they guess wrong with Yarn 4.

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Yarn 4 comes from the "packageManager" field via corepack. Never `npm install`.
RUN corepack enable

# Manifests first so the install layer caches independently of source changes.
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY . .
RUN yarn build

# --- Production stage ---
FROM node:22-alpine
WORKDIR /app
RUN corepack enable

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

USER node

# Railway injects PORT at runtime; config.ts reads it and falls back to 8006.
EXPOSE 8006

# The schema comes from TypeORM `synchronize` (DB_SYNCHRONIZE=true on Railway),
# and the seeders run inside the app at boot, once each, keyed in seed_history.
CMD ["node", "dist/main.js"]
