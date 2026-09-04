# Stage 1: Build the Vite app
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy the entire monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server/package.json ./apps/server/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the frontend
RUN cd apps/web && pnpm run build

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
