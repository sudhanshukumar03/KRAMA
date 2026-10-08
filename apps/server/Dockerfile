# Stage 1: Build and isolate production dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy the entire monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/package.json 

# Install dependencies (ignoring scripts initially)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN cd apps/server && npx prisma generate

# Build TypeScript
RUN cd apps/server && npx tsc

# Deploy the server package into an isolated directory (/app/out)
RUN pnpm --filter server deploy --legacy --prod /app/out

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app

# Install openssl for Prisma engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy the isolated production build from stage 1
COPY --from=builder /app/out ./

# Copy the built dist and prisma schema
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]
