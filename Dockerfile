# =========================
# Stage 1: Build
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# =========================
# Stage 2: Production
# =========================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist


# Create non-root user
RUN addgroup -S nodejs && \
    adduser -S nestjs -G nodejs

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

CMD ["node", "dist/src/main.js"]