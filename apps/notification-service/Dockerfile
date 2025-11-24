# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY libs/common/package*.json ./libs/common/
COPY apps/notification-service/package*.json ./apps/notification-service/

# Install common lib dependencies
WORKDIR /app/libs/common
RUN npm install

# Build common lib
COPY libs/common ./
RUN npm run build

# Install notification-service dependencies
WORKDIR /app/apps/notification-service
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Install common lib as local dependency
WORKDIR /app/libs/common
RUN npm run build

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/apps/notification-service/node_modules ./node_modules
COPY --from=deps /app/apps/notification-service/package*.json ./
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common

# Copy source code
COPY apps/notification-service/src ./src
COPY apps/notification-service/tsconfig*.json ./
COPY apps/notification-service/nest-cli.json ./

# Build application
RUN npm run build

# Stage 4: Production
FROM base AS production
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3004

CMD ["node", "dist/main"]
