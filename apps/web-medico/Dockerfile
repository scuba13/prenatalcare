# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Development stage
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npx", "vite", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG VITE_AUTH_API_URL=http://localhost:3005
ARG VITE_CORE_API_URL=http://localhost:3001
ARG VITE_SCHEDULING_API_URL=http://localhost:3003
ARG VITE_NOTIFICATION_API_URL=http://localhost:3004
ARG VITE_RNDS_API_URL=http://localhost:3002

ENV VITE_AUTH_API_URL=${VITE_AUTH_API_URL}
ENV VITE_CORE_API_URL=${VITE_CORE_API_URL}
ENV VITE_SCHEDULING_API_URL=${VITE_SCHEDULING_API_URL}
ENV VITE_NOTIFICATION_API_URL=${VITE_NOTIFICATION_API_URL}
ENV VITE_RNDS_API_URL=${VITE_RNDS_API_URL}

RUN npm run build

# Production stage - usando nginx para servir arquivos estáticos
FROM nginx:alpine AS production

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos do build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
