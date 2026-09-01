
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/package.json 
RUN pnpm install --frozen-lockfile
RUN cd apps/server && pnpm exec esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.js --external:@prisma/client --external:bcrypt --external:express --external:cors --external:jsonwebtoken --external:googleapis --external:socket.io --external:multer
RUN pnpm --filter server deploy --legacy --prod /app/out
RUN cd /app/out && npx prisma generate
FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/out ./
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
