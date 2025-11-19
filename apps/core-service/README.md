# Core Service - Sistema Pré-Natal

Serviço principal de lógica de negócio do sistema de acompanhamento pré-natal.

## Instalação

```bash
pnpm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o `.env` com suas configurações locais

## Executar

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

## Acessar

- API: http://localhost:3001
- Swagger Docs: http://localhost:3001/api

## Migrations

```bash
# Criar nova migration
pnpm run migration:create src/migrations/MigrationName

# Executar migrations
pnpm run migration:run

# Reverter última migration
pnpm run migration:revert
```

## Testes

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov
```
