# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files (monorepo)
COPY package*.json ./

# Copy common library package files
COPY libs/common/package*.json ./libs/common/

# Copy app package files
COPY apps/core-service/package*.json ./apps/core-service/

# Install dependencies for common library
WORKDIR /app/libs/common
RUN npm install

# Build common library
COPY libs/common ./
RUN npm run build

# Install dependencies for core-service
WORKDIR /app/apps/core-service
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Install common library as local dependency
RUN npm install ../../libs/common

# Rebuild common library (garante que está sempre atualizado)
WORKDIR /app/libs/common
RUN npm run build

# Development image
FROM base AS dev
WORKDIR /app

# Copy node_modules from deps stage (now includes @prenatal/common)
COPY --from=deps /app/apps/core-service/node_modules ./node_modules

# Copy application code
COPY apps/core-service .

# Expose port
EXPOSE 3001

# Start in development mode with hot reload
CMD ["npm", "run", "start:dev"]

# Builder image
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage (includes @prenatal/common)
COPY --from=deps /app/apps/core-service/node_modules ./node_modules

# Copy package.json from deps stage
COPY --from=deps /app/apps/core-service/package*.json ./

# Copy common library (compiled) into node_modules structure for TypeScript resolution
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common

# Copy application source code
COPY apps/core-service/src ./src
COPY apps/core-service/tsconfig*.json ./
COPY apps/core-service/nest-cli.json ./

# Build application
RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy node_modules from builder (base dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy common library into node_modules (must be separate to preserve structure)
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common

# Copy package.json for runtime
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main"]
