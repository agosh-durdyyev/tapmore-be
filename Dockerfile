# syntax=docker/dockerfile:1
# Production image for the TapMore API (AdonisJS + Postgres).

FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

# Compile TypeScript into build/ with all dependencies available.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN node ace build

# Install only production dependencies next to the compiled app.
FROM base AS deps
COPY --from=build /app/build/package.json /app/build/pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3333 LOG_LEVEL=info
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./
EXPOSE 3333
# Apply pending migrations, then start. --force is required outside development.
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
