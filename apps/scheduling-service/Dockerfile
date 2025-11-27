# Multi-stage build for Scheduling Service
FROM node:18-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy root level package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy libs (common package)
COPY libs/common/package*.json ./libs/common/
COPY apps/scheduling-service/package*.json ./apps/scheduling-service/

# Install dependencies at libs/common level
WORKDIR /app/libs/common
RUN npm install

# Build common library
COPY libs/common ./
RUN npm run build

# Install dependencies at scheduling-service level
WORKDIR /app/apps/scheduling-service
RUN npm install --legacy-peer-deps

# Link common library
RUN npm install ../../libs/common --legacy-peer-deps

# Go back to libs/common and build again (after linking)
WORKDIR /app/libs/common
RUN npm run build

# Stage 2: Builder
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/apps/scheduling-service/node_modules ./node_modules

# Copy common library (compiled) into node_modules structure for TypeScript resolution
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common

# Copy service source code
COPY --from=deps /app/apps/scheduling-service/package*.json ./
COPY apps/scheduling-service/src ./src
COPY apps/scheduling-service/tsconfig*.json ./
COPY apps/scheduling-service/nest-cli.json ./

# Build the application
RUN npm run build

# Stage 3: Production
FROM base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy node_modules and built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy common library into node_modules (must be separate to preserve structure)
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
