FROM node:20-alpine

WORKDIR /app

# Copy package files and install all dependencies (including tsx and Prisma)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]
