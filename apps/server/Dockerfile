# Stage 1: Build and isolate production dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Opt in to Node environment proxies when a restricted build network requires one.
ARG NODE_USE_ENV_PROXY

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy the entire monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/package.json 

# Fetch locked packages without dependency lifecycle scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma Client
RUN cd apps/server && npx prisma generate

# Build shared packages before the server that imports their dist exports.
RUN pnpm --filter server... run build

# Build a production workspace from the same frozen lockfile. pnpm 9 deploy
# re-resolves workspace dependency ranges, so it cannot enforce this lock.
RUN mkdir -p /app/out/apps/server /app/out/apps/web /app/out/packages/validation /app/out/packages/types \
    && cp package.json pnpm-lock.yaml pnpm-workspace.yaml /app/out/ \
    && cp apps/server/package.json /app/out/apps/server/ \
    && cp -R apps/server/dist apps/server/prisma /app/out/apps/server/ \
    && cp apps/web/package.json /app/out/apps/web/ \
    && cp packages/validation/package.json /app/out/packages/validation/ \
    && cp -R packages/validation/dist /app/out/packages/validation/ \
    && cp packages/types/package.json /app/out/packages/types/ \
    && cp -R packages/types/dist /app/out/packages/types/ \
    && cd /app/out && pnpm install --prod --frozen-lockfile --offline --ignore-scripts

# Generate into the production dependency tree, not only the build tree.
RUN pnpm --filter server exec prisma generate --schema /app/out/apps/server/prisma/schema.prisma

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app

# Install openssl for Prisma engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy the isolated production build from stage 1
COPY --from=builder /app/out ./

WORKDIR /app/apps/server

# The official Node image provides this unprivileged runtime account.
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
