# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Acompanhamento Pré-Natal integrado com a RNDS (Rede Nacional de Dados em Saúde) do DATASUS, utilizando arquitetura de microsserviços baseada em FHIR R4 e TypeORM.

**Stack Principal:**
- Backend: Node.js 20+ LTS, NestJS, TypeORM, PostgreSQL
- Frontend: Next.js 14 (Web Médico/Admin), React Native + Expo (App Gestante)
- Infraestrutura: Docker, RabbitMQ, Redis, MinIO/S3
- Integração: RNDS FHIR R4 com mTLS

## Architecture

### Microsserviços

O sistema é composto por microsserviços independentes que se comunicam via RabbitMQ:

1. **MS Core (porta 3001)** - `apps/core-service/`
   - Gestão de gestantes (Citizen, Pregnancy)
   - CarePlan (plano de cuidado, linha de cuidado)
   - Tasks (consultas, exames, vacinas)
   - Timeline de eventos
   - Consentimento LGPD
   - Database: `prenatal_core`

2. **MS RNDS Integration (porta 3002)** - `apps/rnds-service/`
   - Cliente FHIR R4 com mTLS
   - Sincronização incremental (read) via `_lastUpdated`
   - Publicação transacional (write) via Bundle
   - Validação de conformidade FHIR
   - Mapeamento domínio ↔ FHIR
   - Gestão de ETags e conflitos
   - Workers: sync-worker, publish-worker, retry-worker
   - Database: `rnds_sync` (cursors, logs, audit)

3. **MS Scheduling (porta 3003)** - `apps/scheduling-service/`
   - Gestão de agenda médica
   - Agendamento de consultas
   - Reagendamento e cancelamento
   - Notificações de confirmação
   - Database: `scheduling`

4. **MS Notification (porta 3004)** - `apps/notification-service/`
   - Push notifications (Firebase/OneSignal)
   - E-mail (SendGrid/AWS SES)
   - SMS (Twilio/AWS SNS)
   - Lembretes de consultas/exames
   - Workers: reminder-worker, batch-worker
   - Database: `notifications`

5. **MS Auth (porta 3005)** - `apps/auth-service/`
   - Registro e login (CPF, e-mail)
   - Gestão de tokens JWT
   - 2FA/OTP
   - RBAC: gestante, medico, admin
   - Database: `auth`

### Domain-Driven Design

Cada microsserviço representa um bounded context com:
- Entidades TypeORM próprias
- Repositories pattern
- Services com lógica de negócio
- Controllers com validação (class-validator)
- Event emitters para comunicação assíncrona

### Event-Driven Communication

Todos os eventos são publicados via RabbitMQ:
- Exchange: `appointments` (tipo: topic)
- Routing keys: `appointment.created`, `appointment.cancelled`, etc.
- Dead Letter Queues para retry

## Development Commands

### Infraestrutura Local

```bash
# Iniciar todos os serviços (PostgreSQL, Redis, RabbitMQ, MinIO)
docker-compose up -d

# Parar serviços
docker-compose down

# Ver logs
docker-compose logs -f [service-name]
```

### Backend (por microsserviço)

```bash
# Desenvolvimento
cd apps/[service-name]
pnpm install
pnpm run start:dev

# Build
pnpm run build

# Testes
pnpm run test              # Unit tests
pnpm run test:e2e         # Integration tests
pnpm run test:cov         # Coverage

# Linting
pnpm run lint
pnpm run lint:fix

# TypeORM Migrations
npx typeorm migration:create src/migrations/[MigrationName]
npx typeorm migration:run -d src/data-source.ts
npx typeorm migration:revert -d src/data-source.ts
```

### Frontend

```bash
# Web Médico / Web Admin
cd apps/web-[medico|admin]
pnpm install
pnpm run dev              # Development
pnpm run build           # Production build
pnpm run start           # Start production

# App Mobile
cd apps/app-mobile
pnpm install
npx expo start           # Development
npx expo start --android # Android emulator
npx expo start --ios     # iOS simulator
eas build --platform android  # Production build
```

## RNDS Integration Specifics

### Perfis Brasileiros Obrigatórios

**BRIndividuo-1.0 (Patient):**
- URL: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuo-1.0`
- Obrigatório: `identifier` (CPF ou CNS), `name` (usando BRNomeIndividuo), `birthDate`
- Extensions: BRRacaCorEtnia, BRNacionalidade, BRMunicipio
- Proibidos: `deceased[x]`, `maritalStatus`, `multipleBirth[x]`

**BRProfissional-1.0 (Practitioner):**
- Identificadores: CPF do profissional, CRM

**BREstabelecimentoSaude-1.0 (Organization):**
- Identificadores: CNES (7 dígitos), CNPJ

### Códigos LOINC Principais

| Observação | Código LOINC | Uso |
|-----------|--------------|-----|
| USG Obstétrica | 11636-8 | US OB >20 weeks |
| Pressão Arterial Sistólica | 8480-6 | Vital signs |
| Pressão Arterial Diastólica | 8462-4 | Vital signs |
| Peso | 29463-7 | Body weight |
| Altura Uterina | 11977-6 | Uterine fundal height |
| Idade Gestacional | 49051-6 | Gestational age in weeks |
| DUM | 8665-2 | Last menstrual period |
| DPP | 11778-8 | Estimated delivery date |

### Endpoints RNDS

**Homologação:** `https://api-hmg.saude.gov.br/fhir/R4`
**Produção:** `https://api.saude.gov.br/fhir/R4`

**Autenticação:** mTLS + OAuth2 Bearer token (expira em 3600s)

### Padrões de Integração

**Leitura (Sincronização Incremental):**
```typescript
// Buscar recursos modificados após cursor
GET /Observation?subject=Patient/{id}&_lastUpdated=ge{cursor}
GET /Encounter?subject=Patient/{id}&_lastUpdated=ge{cursor}
```

**Escrita (Bundle Transacional):**
```typescript
// Enviar múltiplos recursos atomicamente
POST /Bundle
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [/* resources with request.method=POST */]
}
```

**Validação:** Sempre validar localmente com validator antes de enviar
**Idempotência:** Usar header `Idempotency-Key` para evitar duplicatas
**Controle de Versão:** Usar `If-Match` header com ETag para updates

### Erros Comuns RNDS

- **422 Unprocessable Entity:** Perfil FHIR inválido → validar localmente primeiro
- **409 Conflict:** Recurso modificado → re-read e merge
- **412 Precondition Failed:** ETag desatualizado → buscar versão atual
- **401 Unauthorized:** Token expirado → renovar token
- **403 Forbidden:** Escopo insuficiente → verificar credenciamento

## LGPD Compliance

### Sistema de Consentimento

Todas as ações que envolvem dados pessoais requerem consentimento explícito:

**Entidade:** `Consent` (apps/core-service/src/entities/consent.entity.ts)
- Propósitos: `data_processing`, `data_sharing`, `research`, `marketing`
- Rastreabilidade: IP address, user agent, timestamps
- Granularidade: Consentimento por finalidade

**APIs:**
- `POST /api/v1/consents` - Registrar consentimento
- `DELETE /api/v1/consents/:id` - Revogar consentimento
- `GET /api/v1/consents/citizen/:id` - Listar consentimentos

### Políticas de Retenção

| Categoria | Prazo | Ação ao Fim |
|-----------|-------|-------------|
| Dados Cadastrais | 5 anos após último atendimento | Anonimização |
| Histórico Clínico | 20 anos | Arquivamento permanente |
| Logs de Auditoria | 6 meses | Deleção permanente |
| Consentimentos | 5 anos após revogação | Arquivamento permanente |

**Anonimização Automática:**
```bash
# Rodar manualmente ou via cron job
pnpm run anonymize:inactive-citizens
```

### Direitos dos Titulares

Implementar através das APIs:
- `GET /api/v1/data-subject/data` - Acesso aos dados (portabilidade)
- `PATCH /api/v1/data-subject/data` - Correção
- `POST /api/v1/data-subject/anonymize` - Anonimização/Bloqueio
- `DELETE /api/v1/data-subject/data` - Eliminação (com ressalvas legais)

Prazo de resposta: 15 dias (conforme LGPD Art. 18)

## Database Management

### Conexão TypeORM

Cada microsserviço tem seu próprio database. Configuração em `src/app.module.ts`:

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: config.get('NODE_ENV') === 'development',
    logging: config.get('NODE_ENV') === 'development',
  }),
})
```

### Migrations Strategy

**IMPORTANTE:** NUNCA usar `synchronize: true` em produção.

**Workflow:**
1. Criar entidade TypeORM
2. Gerar migration: `npx typeorm migration:create src/migrations/[Name]`
3. Revisar SQL gerado
4. Executar: `npx typeorm migration:run -d src/data-source.ts`
5. Rollback se necessário: `npx typeorm migration:revert -d src/data-source.ts`

### Soft Delete Pattern

Todas as entidades principais usam soft delete:

```typescript
@DeleteDateColumn()
deletedAt?: Date;

// Para consultar incluindo deletados
repo.find({ withDeleted: true })
```

## Authentication & Authorization

### JWT Flow

**Roles:**
- `gestante` - Acesso apenas aos próprios dados
- `medico` - Acesso a gestantes sob seu cuidado
- `admin` - Acesso total ao sistema

**Guards:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('medico', 'admin')
async create(@Body() dto: CreatePregnancyDto) { ... }
```

**Token Lifecycle:**
- Access Token: 15 minutos
- Refresh Token: 7 dias
- Renovação: `POST /api/v1/auth/refresh`

## Testing Strategy

### Unit Tests

```bash
# Rodar testes de um serviço específico
cd apps/core-service
pnpm run test

# Com coverage
pnpm run test:cov
```

**Padrão de Mock:**
```typescript
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};
```

### Integration Tests (E2E)

```bash
pnpm run test:e2e
```

**Setup:** Usa banco de dados separado (definir em `.env.test`)

**Exemplo:**
```typescript
beforeAll(async () => {
  // Login e obter token
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'test@test.com', password: 'password' });
  accessToken = response.body.accessToken;
});
```

### Cobertura Mínima

- Unit Tests: **80%**
- Integration Tests: Fluxos principais

## Observability

### Métricas (Prometheus)

Expostas em `/metrics` de cada serviço:
- `http_requests_total` - Total de requests
- `http_request_duration_seconds` - Latência

### Logs Estruturados

Usar NestJS Logger:
```typescript
this.logger.log('Message', 'Context');
this.logger.error('Error message', trace, 'Context');
```

### Distributed Tracing

OpenTelemetry integrado (quando configurado):
- Trace ID propagado via headers
- Spans para operações críticas (FHIR sync, DB queries)

## Security Best Practices

1. **NUNCA commitar secrets** - Usar `.env` (gitignored)
2. **Validação de entrada** - class-validator em todos os DTOs
3. **SQL Injection** - TypeORM com parameterized queries
4. **XSS** - Frontend sanitiza inputs
5. **CORS** - Configurar origens permitidas
6. **Rate Limiting** - Implementado no API Gateway (Kong/NGINX)
7. **Audit Logs** - Todas as operações sensíveis são auditadas

### Criptografia

**At Rest:** Colunas sensíveis (CPF, telefone) usam transformer:
```typescript
@Column({ transformer: new EncryptionTransformer() })
cpf: string;
```

**In Transit:** TLS 1.3 obrigatório + mTLS para RNDS

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/prenatal_core
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672

# RNDS
RNDS_BASE_URL=https://api-hmg.saude.gov.br/fhir/R4
RNDS_CERT_PATH=/path/to/client.crt
RNDS_KEY_PATH=/path/to/client.key
RNDS_CA_PATH=/path/to/ca.crt

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
ENCRYPTION_KEY=32-char-key-for-aes-256

# Notifications
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## Common Workflows

### Adicionar Nova Entidade

1. Criar arquivo `*.entity.ts` em `src/entities/`
2. Definir com decorators TypeORM
3. Adicionar ao módulo TypeORM
4. Criar migration
5. Criar DTO de validação
6. Implementar service e controller
7. Adicionar testes

### Adicionar Nova Rota API

1. Criar DTO em `src/dtos/`
2. Implementar no controller
3. Aplicar guards (`@UseGuards(JwtAuthGuard, RolesGuard)`)
4. Definir roles (`@Roles('medico', 'admin')`)
5. Documentar com Swagger (`@ApiOperation`, `@ApiResponse`)
6. Adicionar testes E2E

### Adicionar Sincronização RNDS

1. Mapear recurso FHIR → Domínio em `mappers/fhir-to-domain.mapper.ts`
2. Mapear Domínio → FHIR em `mappers/domain-to-fhir.mapper.ts`
3. Implementar lógica de sync em `sync.service.ts`
4. Adicionar worker se necessário (cron job)
5. Validar contra perfil RNDS localmente
6. Implementar retry logic com backoff exponencial

## References

- **RNDS Implementation Guide:** https://rnds-fhir.saude.gov.br/ImplementationGuide/rnds
- **NestJS Docs:** https://docs.nestjs.com/
- **TypeORM Docs:** https://typeorm.io/
- **FHIR R4 Spec:** https://hl7.org/fhir/R4/
- **BR Core:** https://hl7.org.br/fhir/core/

## Important Notes

- **Monorepo:** Usar `pnpm` para gerenciar dependências compartilhadas
- **Migrations:** SEMPRE revisar SQL antes de aplicar em produção
- **FHIR Validation:** Validar localmente antes de enviar para RNDS
- **LGPD:** Todo novo endpoint que manipula dados pessoais precisa verificar consentimento
- **Retry Policy:** Usar exponential backoff (1s, 2s, 4s) para operações RNDS
- **Timezone:** Usar UTC para timestamps, converter para BRT apenas no frontend
