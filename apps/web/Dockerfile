# Stage 1: Build the Vite app
FROM node:24-alpine AS builder

WORKDIR /app

# Opt in to Node environment proxies when a restricted build network requires one.
ARG NODE_USE_ENV_PROXY

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Cache dependency installation separately from application source changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/validation/package.json ./packages/validation/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json

# Install dependencies
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/prisma.config.ts ./apps/server/prisma.config.ts

# Frontend schema types depend on the generated Prisma client.
RUN pnpm --filter server exec prisma generate

# Build the frontend
RUN pnpm --filter client... run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy our custom Nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
