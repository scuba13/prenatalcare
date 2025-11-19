# 🏗️ Plano de Implementação - Sistema de Acompanhamento Pré-Natal com RNDS

> **Arquitetura**: Microsserviços
> **Stack Base**: Node.js, React/Next.js, React Native, PostgreSQL, Redis, RabbitMQ
> **Integração**: RNDS via FHIR (mTLS)
> **Gestão de Código**: Claude Code

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Microsserviços do Sistema](#3-microsserviços-do-sistema)
4. [LGPD e Políticas de Retenção de Dados](#4-lgpd-e-políticas-de-retenção-de-dados)
5. [Fases de Implementação](#5-fases-de-implementação)
6. [Infraestrutura e DevOps](#6-infraestrutura-e-devops)
7. [Matriz de Dependências](#7-matriz-de-dependências)
8. [Critérios de Aceite por Fase](#8-critérios-de-aceite-por-fase)

---

## 1) Visão Geral da Arquitetura

### 1.1 Diagrama de Microsserviços

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Kong/NGINX)                  │
│                    + OAuth2/OIDC + Rate Limiting                 │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│  Web Médico    │   │  Web Admin     │   │  App Gestante  │
│  (Next.js)     │   │  (Next.js)     │   │ (React Native) │
└────────────────┘   └────────────────┘   └────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        MESSAGE BROKER (RabbitMQ)                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MS Core     │  │  MS RNDS     │  │ MS Scheduling│  │ MS Notification│
│  (Business)  │  │ (Integration)│  │ (Appointments)│ │  (Alerts)     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                 │                 │
┌──────▼─────────────────▼─────────────────▼─────────────────▼────────┐
│                     PostgreSQL (Primary DB)                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Redis Cache  │  │  MinIO/S3    │  │  Prometheus  │
│              │  │  (Files)     │  │  + Grafana   │
└──────────────┘  └──────────────┘  └──────────────┘

                    ┌──────────────────┐
                    │  RNDS FHIR API   │
                    │  (DATASUS)       │
                    └──────────────────┘
```

### 1.2 Princípios Arquiteturais

- **Domain-Driven Design (DDD)**: cada microsserviço representa um bounded context
- **Event-Driven Architecture**: comunicação assíncrona via mensageria
- **Database per Service**: isolamento de dados (com exceções justificadas)
- **API-First**: contratos OpenAPI/Swagger
- **Resiliência**: Circuit Breaker, Retry, Timeout, Bulkhead
- **Observabilidade**: Logs estruturados, métricas, traces distribuídos

---

## 2) Stack Tecnológica

### 2.1 Backend (Microsserviços)

| Componente | Tecnologia | Justificativa |
|------------|-----------|---------------|
| **Runtime** | Node.js 20+ LTS | Performance, ecosystem npm, async I/O |
| **Framework** | NestJS | Arquitetura enterprise, DI, modules |
| **ORM** | TypeORM | Decorators, migrations robustas, suporte PostgreSQL completo |
| **Validação** | class-validator + class-transformer | Integração nativa NestJS, decorators |
| **HTTP Client** | Axios + Retry Axios | Suporte mTLS, interceptors |
| **FHIR Client** | @smile-cdr/fhirts | FHIR R4 types, validation |
| **Mensageria** | amqplib (RabbitMQ) | Pub/Sub, routing, DLQ |
| **Cache** | ioredis | Performance, TTL, pub/sub |

### 2.2 Frontend

| Aplicação | Stack | Características |
|-----------|-------|-----------------|
| **Web Médico** | Next.js 14 (App Router), TailwindCSS, shadcn/ui | SSR, SEO, performance |
| **Web Admin** | Next.js 14 (App Router), TailwindCSS, Recharts | Dashboard analytics |
| **App Gestante** | React Native 0.73+, Expo, React Navigation | Cross-platform Android/iOS |

**Libs Compartilhadas**:
- React Query (TanStack Query) - state management + cache
- Axios - HTTP client
- Zod - validação
- date-fns - manipulação de datas
- react-hook-form - formulários

### 2.3 Infraestrutura

| Serviço | Tecnologia | Propósito |
|---------|-----------|-----------|
| **API Gateway** | Kong / NGINX | Roteamento, autenticação, rate limiting |
| **Auth** | Keycloak / Auth0 | OIDC, OAuth2, SSO |
| **Database** | PostgreSQL 16 | ACID, JSONB, full-text search |
| **Cache** | Redis 7 | Session store, cache, pub/sub |
| **Message Broker** | RabbitMQ 3.12 | AMQP, filas, exchanges |
| **Storage** | MinIO / AWS S3 | Object storage (laudos PDF, imagens) |
| **Observability** | Prometheus + Grafana + Loki | Métricas, logs, dashboards |
| **APM** | OpenTelemetry | Distributed tracing |
| **Container** | Docker + Docker Compose | Dev/QA environments |
| **Orchestration** | Kubernetes (opcional) | Produção escalável |

---

## 3) Microsserviços do Sistema

### MS-01: Core Service (Negócio Principal)

**Responsabilidades**:
- Gestão de gestantes (Citizen, Pregnancy)
- CarePlan (plano de cuidado, linha de cuidado)
- Tasks (consultas, exames, vacinas)
- Timeline de eventos
- Consentimento LGPD

**Bounded Context**: Pré-natal
**Database**: `prenatal_core`
**Porta**: 3001

**APIs Principais**:
- `POST /api/v1/pregnancies` - Criar gestação
- `GET /api/v1/pregnancies/:id/care-plan` - Obter CarePlan
- `GET /api/v1/pregnancies/:id/timeline` - Timeline de eventos
- `PATCH /api/v1/tasks/:id` - Atualizar tarefa
- `POST /api/v1/consents` - Registrar consentimento

---

### MS-02: RNDS Integration Service

**Responsabilidades**:
- Cliente FHIR R4 com mTLS
- Sincronização incremental (read) via `_lastUpdated`
- Publicação transacional (write) via Bundle
- Validação de conformidade FHIR
- Mapeamento domínio ↔ FHIR
- Gestão de ETags e conflitos 409/412
- Retry queue com backoff exponencial

**Bounded Context**: Integração RNDS
**Database**: `rnds_sync` (cursors, logs, audit)
**Porta**: 3002

**APIs Principais**:
- `POST /api/v1/rnds/sync-patient/:cpf` - Sincronizar paciente
- `POST /api/v1/rnds/publish-bundle` - Publicar Bundle FHIR
- `GET /api/v1/rnds/validation-report/:bundleId` - Relatório validação
- `POST /api/v1/rnds/retry/:jobId` - Reprocessar falha

**Workers**:
- `sync-worker` - Sincronização incremental a cada 15 min
- `publish-worker` - Processa fila de publicações
- `retry-worker` - Reprocessa falhas com backoff

---

### MS-03: Scheduling Service (Agendamento)

**Responsabilidades**:
- Gestão de agenda médica (disponibilidade)
- Agendamento de consultas
- Reagendamento e cancelamento
- Notificações de confirmação
- Integração com calendário (iCal)

**Bounded Context**: Agendamento
**Database**: `scheduling`
**Porta**: 3003

**APIs Principais**:
- `GET /api/v1/schedules/availability` - Disponibilidade médico
- `POST /api/v1/appointments` - Agendar consulta
- `PATCH /api/v1/appointments/:id` - Reagendar/Cancelar
- `GET /api/v1/appointments/patient/:id` - Consultas da gestante

---

### MS-04: Notification Service (Notificações)

**Responsabilidades**:
- Push notifications (Firebase/OneSignal)
- E-mail (SendGrid/AWS SES)
- SMS (Twilio/AWS SNS)
- Lembretes de consultas/exames
- Alertas de tarefas pendentes
- Template engine

**Bounded Context**: Notificações
**Database**: `notifications` (histórico, preferências)
**Porta**: 3004

**APIs Principais**:
- `POST /api/v1/notifications/send` - Enviar notificação
- `GET /api/v1/notifications/preferences/:userId` - Preferências
- `POST /api/v1/notifications/schedule` - Agendar lembrete

**Workers**:
- `reminder-worker` - Envia lembretes programados (cron)
- `batch-worker` - Processamento em lote

---

### MS-05: Auth Service (Autenticação/Autorização)

**Responsabilidades**:
- Registro e login (CPF, e-mail)
- Gestão de tokens JWT
- Refresh tokens
- 2FA/OTP
- RBAC (roles: gestante, medico, admin)
- Integração com Keycloak/Auth0

**Bounded Context**: Identidade
**Database**: `auth` (users, sessions, tokens)
**Porta**: 3005

**APIs Principais**:
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/verify-otp` - Verificar OTP

---

### MS-06: Analytics Service (Opcional - Fase 2)

**Responsabilidades**:
- Métricas de uso
- Dashboards administrativos
- Relatórios de adesão
- KPIs de saúde (taxas de completude de CarePlan)

**Bounded Context**: Analytics
**Database**: `analytics` (OLAP - ClickHouse/TimescaleDB)
**Porta**: 3006

---

## 4) LGPD e Políticas de Retenção de Dados

### 4.1 Princípios LGPD Aplicados

O sistema deve seguir rigorosamente os princípios da Lei Geral de Proteção de Dados (Lei nº 13.709/2018):

**Princípios Fundamentais**:
- ✅ **Finalidade**: Dados coletados apenas para acompanhamento pré-natal e gestão de saúde
- ✅ **Adequação**: Compatibilidade com as finalidades informadas
- ✅ **Necessidade**: Limitação ao mínimo necessário
- ✅ **Livre acesso**: Gestantes podem consultar seus dados a qualquer momento
- ✅ **Qualidade dos dados**: Garantia de exatidão, clareza e atualização
- ✅ **Transparência**: Informações claras sobre tratamento de dados
- ✅ **Segurança**: Proteção contra acessos não autorizados
- ✅ **Prevenção**: Medidas para prevenir danos
- ✅ **Não discriminação**: Impossibilidade de uso discriminatório
- ✅ **Responsabilização**: Demonstração da adoção de medidas eficazes

### 4.2 Gestão de Consentimento

**Sistema de Consentimento**:

```typescript
// Entity TypeORM
@Entity('consents')
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  citizenId: string;

  @Column({ type: 'enum', enum: ['data_processing', 'data_sharing', 'research', 'marketing'] })
  purpose: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', default: false })
  granted: boolean;

  @Column({ type: 'timestamp' })
  grantedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'varchar' })
  ipAddress: string;

  @Column({ type: 'varchar' })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Fluxo de Consentimento**:

1. **Onboarding**: Apresentação clara dos termos de uso e política de privacidade
2. **Granularidade**: Consentimento específico por finalidade
3. **Revogação**: Possibilidade de revogação a qualquer momento
4. **Rastreabilidade**: Log completo de todas as ações de consentimento

**APIs de Consentimento**:

```typescript
// POST /api/v1/consents - Registrar consentimento
{
  "citizenId": "uuid",
  "purpose": "data_processing",
  "granted": true,
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}

// DELETE /api/v1/consents/:id - Revogar consentimento
// GET /api/v1/consents/citizen/:id - Listar consentimentos
```

### 4.3 Políticas de Retenção de Dados

**Categorias de Dados e Retenção**:

| Categoria | Prazo de Retenção | Justificativa Legal | Ação ao Fim |
|-----------|-------------------|---------------------|-------------|
| **Dados Cadastrais** (nome, CPF, contato) | 5 anos após último atendimento | Lei 13.787/2018 (prontuário eletrônico) | Anonimização |
| **Histórico Clínico** (consultas, exames) | 20 anos | CFM Resolução 1.638/2002 | Arquivamento permanente |
| **Dados de Gestação** (DUM, IG, CarePlan) | 20 anos | CFM Resolução 1.638/2002 | Arquivamento permanente |
| **Logs de Auditoria** | 6 meses | LGPD Art. 37 | Deleção permanente |
| **Logs de Acesso** | 6 meses | Marco Civil da Internet | Deleção permanente |
| **Consentimentos** | 5 anos após revogação | LGPD Art. 8º | Arquivamento permanente |
| **Dados de Marketing** | Até revogação do consentimento | LGPD Art. 16 | Deleção imediata |
| **Dados de Pesquisa** | Conforme protocolo aprovado | CEP/CONEP | Conforme protocolo |

**Implementação de Retenção com TypeORM**:

```typescript
// Entity com soft delete
@Entity('citizens')
export class Citizen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cpf: string;

  @Column()
  fullName: string;

  @Column({ type: 'date', nullable: true })
  lastAppointmentDate?: Date;

  @Column({ type: 'enum', enum: ['active', 'archived', 'anonymized'], default: 'active' })
  dataStatus: string;

  @DeleteDateColumn()
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Service de retenção
@Injectable()
export class DataRetentionService {
  constructor(
    @InjectRepository(Citizen)
    private citizenRepo: Repository<Citizen>,
  ) {}

  async anonymizeInactiveCitizens() {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const citizensToAnonymize = await this.citizenRepo
      .createQueryBuilder('citizen')
      .where('citizen.lastAppointmentDate < :date', { date: fiveYearsAgo })
      .andWhere('citizen.dataStatus = :status', { status: 'active' })
      .getMany();

    for (const citizen of citizensToAnonymize) {
      await this.citizenRepo.update(citizen.id, {
        fullName: 'ANONIMIZADO',
        cpf: '***.***.***-**',
        email: 'anonimizado@example.com',
        phone: '***********',
        dataStatus: 'anonymized',
      });
    }

    return { anonymized: citizensToAnonymize.length };
  }
}
```

### 4.4 Direitos dos Titulares (LGPD)

**Implementação dos Direitos**:

| Direito | Implementação | Prazo de Resposta |
|---------|--------------|-------------------|
| **Confirmação de tratamento** | API GET /api/v1/data-subject/confirmation | 15 dias |
| **Acesso aos dados** | API GET /api/v1/data-subject/data | 15 dias |
| **Correção de dados** | API PATCH /api/v1/data-subject/data | Imediato |
| **Anonimização/Bloqueio** | API POST /api/v1/data-subject/anonymize | 15 dias |
| **Eliminação** | API DELETE /api/v1/data-subject/data | 15 dias (com ressalvas legais) |
| **Portabilidade** | API GET /api/v1/data-subject/export (JSON/CSV) | 15 dias |
| **Informação sobre compartilhamento** | API GET /api/v1/data-subject/sharing-info | 15 dias |
| **Revogação de consentimento** | API DELETE /api/v1/consents/:id | Imediato |

**Exemplo de API de Portabilidade**:

```typescript
// GET /api/v1/data-subject/export?format=json
@Get('export')
async exportData(
  @Query('format') format: 'json' | 'csv',
  @Req() req: Request,
) {
  const citizenId = req.user.citizenId;

  const data = {
    personal: await this.citizenRepo.findOne({ where: { id: citizenId } }),
    pregnancies: await this.pregnancyRepo.find({ where: { citizenId } }),
    appointments: await this.appointmentRepo.find({ where: { citizenId } }),
    consents: await this.consentRepo.find({ where: { citizenId } }),
  };

  if (format === 'csv') {
    return this.convertToCSV(data);
  }

  return data;
}
```

### 4.5 Segurança e Anonimização

**Técnicas de Proteção**:

1. **Encryption at Rest**: Colunas sensíveis criptografadas com AES-256
2. **Encryption in Transit**: TLS 1.3 obrigatório
3. **Pseudonimização**: IDs gerados com UUID v4
4. **Masking**: CPF/telefone mascarados em logs
5. **Tokenização**: Dados bancários nunca armazenados diretamente

**Implementação de Criptografia com TypeORM**:

```typescript
// Transformer customizado para criptografia
import { createCipheriv, createDecipheriv } from 'crypto';

class EncryptionTransformer implements ValueTransformer {
  to(value: string): string {
    const cipher = createCipheriv('aes-256-cbc', process.env.ENCRYPTION_KEY, IV);
    return cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
  }

  from(value: string): string {
    const decipher = createDecipheriv('aes-256-cbc', process.env.ENCRYPTION_KEY, IV);
    return decipher.update(value, 'hex', 'utf8') + decipher.final('utf8');
  }
}

@Entity('citizens')
export class Citizen {
  @Column({ transformer: new EncryptionTransformer() })
  cpf: string;

  @Column({ transformer: new EncryptionTransformer() })
  phone: string;
}
```

### 4.6 Auditoria e Logs

**Logging de Ações Sensíveis**:

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  action: string; // READ, CREATE, UPDATE, DELETE, EXPORT

  @Column()
  entityType: string; // Citizen, Pregnancy, etc.

  @Column()
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes?: any;

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

// Interceptor de auditoria
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    
    // Executa a requisição
    const result = await firstValueFrom(next.handle());

    // Registra no audit log
    await this.auditRepo.save({
      userId: request.user?.id,
      action: request.method,
      entityType: this.extractEntityType(request.url),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return result;
  }
}
```

### 4.7 DPO e Processos

**Responsabilidades do DPO (Data Protection Officer)**:

1. Informar e aconselhar sobre obrigações LGPD
2. Monitorar conformidade
3. Atender solicitações de titulares
4. Cooperar com ANPD
5. Gerenciar relatórios de impacto (RIPD)

**Canal de Comunicação**:
- E-mail: dpo@prenatal-app.com.br
- Telefone: 0800-XXX-XXXX
- Formulário web: /fale-com-dpo

---

## 5) Fases de Implementação

### Fase 1: Setup e Fundações (Semanas 1-2)

**Objetivo**: Estrutura base do projeto e infraestrutura de desenvolvimento.

**Atividades**:

1. **Setup de Monorepo**:
   ```bash
   # Estrutura de pastas
   prenatal-system/
   ├── apps/
   │   ├── core-service/
   │   ├── rnds-service/
   │   ├── scheduling-service/
   │   ├── notification-service/
   │   ├── auth-service/
   │   ├── web-medico/
   │   ├── web-admin/
   │   └── app-mobile/
   ├── libs/
   │   ├── shared/              # Tipos, utils compartilhados
   │   ├── fhir-models/         # Modelos FHIR
   │   └── api-client/          # Cliente HTTP tipado
   ├── docker-compose.yml
   ├── pnpm-workspace.yaml
   └── turbo.json
   ```

2. **Configurar Docker Compose**:
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       ports: ["5432:5432"]
       environment:
         POSTGRES_PASSWORD: postgres
       volumes:
         - pgdata:/var/lib/postgresql/data

     redis:
       image: redis:7-alpine
       ports: ["6379:6379"]

     rabbitmq:
       image: rabbitmq:3.12-management
       ports:
         - "5672:5672"
         - "15672:15672"

     minio:
       image: minio/minio
       ports: ["9000:9000", "9001:9001"]
       command: server /data --console-address ":9001"
   ```

3. **Inicializar cada microsserviço com NestJS**:
   ```bash
   cd apps/core-service
   nest new . --package-manager pnpm
   
   # Instalar dependências
   pnpm add @nestjs/typeorm typeorm pg
   pnpm add @nestjs/config @nestjs/swagger
   pnpm add class-validator class-transformer
   pnpm add -D @types/node
   ```

4. **Configurar TypeORM em cada serviço**:
   ```typescript
   // apps/core-service/src/app.module.ts
   import { Module } from '@nestjs/common';
   import { TypeOrmModule } from '@nestjs/typeorm';
   import { ConfigModule, ConfigService } from '@nestjs/config';

   @Module({
     imports: [
       ConfigModule.forRoot({ isGlobal: true }),
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
       }),
     ],
   })
   export class AppModule {}
   ```

5. **Definir entidades iniciais**:
   ```typescript
   // apps/core-service/src/entities/citizen.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   @Entity('citizens')
   export class Citizen {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ unique: true })
     cpf: string;

     @Column()
     fullName: string;

     @Column({ type: 'date' })
     birthDate: Date;

     @Column({ nullable: true })
     email?: string;

     @Column({ nullable: true })
     phone?: string;

     @Column({ type: 'jsonb', nullable: true })
     address?: {
       street: string;
       number: string;
       city: string;
       state: string;
       postalCode: string;
     };

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

   ```typescript
   // apps/core-service/src/entities/pregnancy.entity.ts
   import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
   import { Citizen } from './citizen.entity';

   @Entity('pregnancies')
   export class Pregnancy {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @ManyToOne(() => Citizen)
     @JoinColumn({ name: 'citizenId' })
     citizen: Citizen;

     @Column()
     citizenId: string;

     @Column({ type: 'date' })
     lastMenstrualPeriod: Date;

     @Column({ type: 'date' })
     estimatedDueDate: Date;

     @Column({ type: 'int' })
     gestationalWeeks: number;

     @Column({ type: 'int' })
     gestationalDays: number;

     @Column({ type: 'enum', enum: ['active', 'completed', 'terminated'], default: 'active' })
     status: string;

     @Column({ type: 'jsonb', nullable: true })
     riskFactors?: {
       hypertension?: boolean;
       diabetes?: boolean;
       previousCSection?: boolean;
       multipleBirths?: boolean;
     };

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

6. **Criar primeira migration**:
   ```bash
   # Instalar TypeORM CLI
   pnpm add -D ts-node

   # Criar migration
   npx typeorm migration:create src/migrations/InitialSchema

   # Executar migration
   npx typeorm migration:run -d src/data-source.ts
   ```

7. **Configurar linting e formatação**:
   ```json
   // .eslintrc.js (raiz do monorepo)
   {
     "extends": ["@typescript-eslint/recommended"],
     "rules": {
       "@typescript-eslint/no-explicit-any": "warn"
     }
   }
   ```

**Critérios de Aceite Fase 1**:
- ✅ Monorepo configurado com pnpm + Turborepo
- ✅ Docker Compose funcional com todos os serviços
- ✅ TypeORM configurado em todos os microsserviços
- ✅ Entidades básicas criadas (Citizen, Pregnancy)
- ✅ Primeira migration executada com sucesso
- ✅ Linting e formatação funcionando

---

### Fase 2: Core Service (Semanas 3-5)

**Objetivo**: Implementar lógica de negócio principal do sistema.

**Atividades**:

1. **Modelagem completa do domínio**:

   ```typescript
   // CarePlan Entity
   @Entity('care_plans')
   export class CarePlan {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @ManyToOne(() => Pregnancy)
     @JoinColumn({ name: 'pregnancyId' })
     pregnancy: Pregnancy;

     @Column()
     pregnancyId: string;

     @Column({ type: 'date' })
     startDate: Date;

     @Column({ type: 'date' })
     endDate: Date;

     @Column({ type: 'enum', enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' })
     status: string;

     @Column({ type: 'jsonb' })
     activities: {
       type: 'consultation' | 'exam' | 'vaccine';
       name: string;
       dueDate: Date;
       completed: boolean;
     }[];

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

   ```typescript
   // Task Entity
   @Entity('tasks')
   export class Task {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @ManyToOne(() => Pregnancy)
     @JoinColumn({ name: 'pregnancyId' })
     pregnancy: Pregnancy;

     @Column()
     pregnancyId: string;

     @Column({ type: 'enum', enum: ['consultation', 'exam', 'vaccine'] })
     type: string;

     @Column()
     title: string;

     @Column({ type: 'text', nullable: true })
     description?: string;

     @Column({ type: 'date' })
     dueDate: Date;

     @Column({ type: 'date', nullable: true })
     completedDate?: Date;

     @Column({ type: 'enum', enum: ['pending', 'completed', 'cancelled'], default: 'pending' })
     status: string;

     @Column({ type: 'int', default: 1 })
     priority: number;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

2. **Implementar repositories e services**:

   ```typescript
   // citizens.service.ts
   import { Injectable } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { Citizen } from './entities/citizen.entity';

   @Injectable()
   export class CitizensService {
     constructor(
       @InjectRepository(Citizen)
       private citizensRepo: Repository<Citizen>,
     ) {}

     async findByCpf(cpf: string): Promise<Citizen | null> {
       return this.citizensRepo.findOne({ where: { cpf } });
     }

     async create(data: Partial<Citizen>): Promise<Citizen> {
       const citizen = this.citizensRepo.create(data);
       return this.citizensRepo.save(citizen);
     }

     async update(id: string, data: Partial<Citizen>): Promise<Citizen> {
       await this.citizensRepo.update(id, data);
       return this.citizensRepo.findOne({ where: { id } });
     }
   }
   ```

   ```typescript
   // pregnancies.service.ts
   import { Injectable } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { Pregnancy } from './entities/pregnancy.entity';

   @Injectable()
   export class PregnanciesService {
     constructor(
       @InjectRepository(Pregnancy)
       private pregnanciesRepo: Repository<Pregnancy>,
     ) {}

     async create(data: Partial<Pregnancy>): Promise<Pregnancy> {
       const pregnancy = this.pregnanciesRepo.create(data);
       this.calculateGestationalAge(pregnancy);
       return this.pregnanciesRepo.save(pregnancy);
     }

     async findByCitizen(citizenId: string): Promise<Pregnancy[]> {
       return this.pregnanciesRepo.find({ 
         where: { citizenId },
         relations: ['citizen']
       });
     }

     private calculateGestationalAge(pregnancy: Pregnancy): void {
       const now = new Date();
       const diffMs = now.getTime() - pregnancy.lastMenstrualPeriod.getTime();
       const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
       
       pregnancy.gestationalWeeks = Math.floor(diffDays / 7);
       pregnancy.gestationalDays = diffDays % 7;
     }
   }
   ```

3. **Implementar controllers com validação**:

   ```typescript
   // dtos/create-pregnancy.dto.ts
   import { IsUUID, IsDateString, IsOptional, IsObject } from 'class-validator';

   export class CreatePregnancyDto {
     @IsUUID()
     citizenId: string;

     @IsDateString()
     lastMenstrualPeriod: string;

     @IsOptional()
     @IsObject()
     riskFactors?: {
       hypertension?: boolean;
       diabetes?: boolean;
     };
   }
   ```

   ```typescript
   // pregnancies.controller.ts
   import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
   import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
   import { PregnanciesService } from './pregnancies.service';
   import { CreatePregnancyDto } from './dtos/create-pregnancy.dto';
   import { JwtAuthGuard } from '../auth/jwt-auth.guard';

   @ApiTags('Pregnancies')
   @Controller('api/v1/pregnancies')
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth()
   export class PregnanciesController {
     constructor(private readonly pregnanciesService: PregnanciesService) {}

     @Post()
     @ApiOperation({ summary: 'Create a new pregnancy record' })
     async create(@Body() dto: CreatePregnancyDto) {
       return this.pregnanciesService.create(dto);
     }

     @Get('citizen/:citizenId')
     @ApiOperation({ summary: 'Get pregnancies by citizen' })
     async findByCitizen(@Param('citizenId') citizenId: string) {
       return this.pregnanciesService.findByCitizen(citizenId);
     }
   }
   ```

4. **Implementar timeline de eventos**:

   ```typescript
   // timeline.service.ts
   @Injectable()
   export class TimelineService {
     constructor(
       @InjectRepository(Task)
       private tasksRepo: Repository<Task>,
       @InjectRepository(Pregnancy)
       private pregnanciesRepo: Repository<Pregnancy>,
     ) {}

     async getTimeline(pregnancyId: string) {
       const pregnancy = await this.pregnanciesRepo.findOne({
         where: { id: pregnancyId },
         relations: ['citizen'],
       });

       const tasks = await this.tasksRepo.find({
         where: { pregnancyId },
         order: { dueDate: 'ASC' },
       });

       return {
         pregnancy,
         currentWeek: pregnancy.gestationalWeeks,
         tasks: tasks.map(task => ({
           ...task,
           weekNumber: this.calculateWeek(task.dueDate, pregnancy.lastMenstrualPeriod),
         })),
      };
     }

     private calculateWeek(date: Date, lmp: Date): number {
       const diffMs = date.getTime() - lmp.getTime();
       const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
       return Math.floor(diffDays / 7);
     }
   }
   ```

5. **Adicionar teste unitários**:

   ```typescript
   // pregnancies.service.spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import { getRepositoryToken } from '@nestjs/typeorm';
   import { PregnanciesService } from './pregnancies.service';
   import { Pregnancy } from './entities/pregnancy.entity';

   describe('PregnanciesService', () => {
     let service: PregnanciesService;
     let mockRepository: any;

     beforeEach(async () => {
       mockRepository = {
         create: jest.fn(),
         save: jest.fn(),
         findOne: jest.fn(),
         find: jest.fn(),
       };

       const module: TestingModule = await Test.createTestingModule({
         providers: [
           PregnanciesService,
           {
             provide: getRepositoryToken(Pregnancy),
             useValue: mockRepository,
           },
         ],
       }).compile();

       service = module.get<PregnanciesService>(PregnanciesService);
     });

     it('should calculate gestational age correctly', async () => {
       const lmp = new Date('2025-01-01');
       const pregnancy = { lastMenstrualPeriod: lmp } as Pregnancy;
       
       mockRepository.create.mockReturnValue(pregnancy);
       mockRepository.save.mockResolvedValue(pregnancy);

       const result = await service.create({ lastMenstrualPeriod: lmp });

       expect(result.gestationalWeeks).toBeGreaterThan(0);
     });
   });
   ```

**Critérios de Aceite Fase 2**:
- ✅ Core Service completo com todas as entidades
- ✅ CRUD funcional para Citizens, Pregnancies, Tasks
- ✅ Timeline de eventos implementada
- ✅ Consentimento LGPD implementado
- ✅ Validação com class-validator
- ✅ Swagger/OpenAPI documentado
- ✅ Testes unitários > 80% cobertura

---

### Fase 3: RNDS Integration Service (Semanas 6-8)

**Objetivo**: Implementar integração completa com RNDS (leitura e escrita FHIR).

**Atividades**:

1. **Configurar cliente FHIR com mTLS**:

   ```typescript
   // fhir-client.service.ts
   import { Injectable } from '@nestjs/common';
   import axios, { AxiosInstance } from 'axios';
   import * as https from 'https';
   import * as fs from 'fs';

   @Injectable()
   export class FhirClientService {
     private client: AxiosInstance;

     constructor() {
       const httpsAgent = new https.Agent({
         cert: fs.readFileSync(process.env.RNDS_CERT_PATH),
         key: fs.readFileSync(process.env.RNDS_KEY_PATH),
         ca: fs.readFileSync(process.env.RNDS_CA_PATH),
         rejectUnauthorized: true,
       });

       this.client = axios.create({
         baseURL: process.env.RNDS_BASE_URL,
         httpsAgent,
         headers: {
           'Content-Type': 'application/fhir+json',
           'Accept': 'application/fhir+json',
         },
         timeout: 30000,
       });
     }

     async getPatient(cpf: string) {
       const response = await this.client.get(`/Patient`, {
         params: {
           identifier: `http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|${cpf}`,
         },
       });
       return response.data;
     }

     async createBundle(bundle: any) {
       const response = await this.client.post('/Bundle', bundle);
       return response.data;
     }
   }
   ```

2. **Implementar mapeadores FHIR ↔ Domínio**:

   ```typescript
   // mappers/pregnancy-to-fhir.mapper.ts
   export class PregnancyToFhirMapper {
     static toCondition(pregnancy: Pregnancy): fhir4.Condition {
       return {
         resourceType: 'Condition',
         id: pregnancy.id,
         clinicalStatus: {
           coding: [{
             system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
             code: pregnancy.status === 'active' ? 'active' : 'resolved',
           }],
         },
         code: {
           coding: [{
             system: 'http://snomed.info/sct',
             code: '77386006',
             display: 'Pregnancy',
           }],
         },
         subject: {
           reference: `Patient/${pregnancy.citizenId}`,
         },
         onsetDateTime: pregnancy.lastMenstrualPeriod.toISOString(),
       };
     }

     static toCarePlan(pregnancy: Pregnancy, tasks: Task[]): fhir4.CarePlan {
       return {
         resourceType: 'CarePlan',
         id: pregnancy.id,
         status: 'active',
         intent: 'plan',
         title: 'Plano de Cuidado Pré-Natal',
         subject: {
           reference: `Patient/${pregnancy.citizenId}`,
         },
         period: {
           start: pregnancy.lastMenstrualPeriod.toISOString(),
           end: pregnancy.estimatedDueDate.toISOString(),
         },
         activity: tasks.map(task => ({
           detail: {
             kind: 'Task',
             code: {
               text: task.title,
             },
             status: task.status === 'completed' ? 'completed' : 'in-progress',
             scheduledTiming: {
               event: [task.dueDate.toISOString()],
             },
           },
         })),
       };
     }
   }
   ```

3. **Implementar sincronização incremental**:

   ```typescript
   // sync.service.ts
   @Injectable()
   export class SyncService {
     constructor(
       private fhirClient: FhirClientService,
       @InjectRepository(SyncCursor)
       private cursorRepo: Repository<SyncCursor>,
     ) {}

     async syncPatient(cpf: string) {
       const cursor = await this.cursorRepo.findOne({
         where: { resourceType: 'Patient', identifier: cpf },
       });

       const params: any = {
         identifier: `http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|${cpf}`,
       };

       if (cursor?.lastUpdated) {
         params._lastUpdated = `gt${cursor.lastUpdated.toISOString()}`;
       }

       const bundle = await this.fhirClient.client.get('/Patient', { params });

       // Processar bundle
       if (bundle.data.entry?.length > 0) {
         await this.processPatientBundle(bundle.data);
         
         // Atualizar cursor
         await this.cursorRepo.save({
           resourceType: 'Patient',
           identifier: cpf,
           lastUpdated: new Date(),
         });
       }

       return bundle.data;
     }

     private async processPatientBundle(bundle: fhir4.Bundle) {
       // Processar cada recurso do bundle
       for (const entry of bundle.entry || []) {
         const resource = entry.resource;
         
         if (resource.resourceType === 'Patient') {
           await this.upsertPatient(resource as fhir4.Patient);
         }
       }
     }

     private async upsertPatient(patient: fhir4.Patient) {
       // Implementar lógica de upsert no banco
     }
   }
   ```

4. **Implementar publicação transacional**:

   ```typescript
   // publish.service.ts
   @Injectable()
   export class PublishService {
     constructor(
       private fhirClient: FhirClientService,
       @InjectRepository(PublishLog)
       private publishLogRepo: Repository<PublishLog>,
     ) {}

     async publishPregnancy(pregnancyId: string) {
       const pregnancy = await this.pregnanciesRepo.findOne({
         where: { id: pregnancyId },
         relations: ['citizen', 'tasks'],
       });

       // Criar Bundle transacional
       const bundle: fhir4.Bundle = {
         resourceType: 'Bundle',
         type: 'transaction',
         entry: [
           {
             fullUrl: `urn:uuid:${pregnancy.id}`,
             resource: PregnancyToFhirMapper.toCondition(pregnancy),
             request: {
               method: 'POST',
               url: 'Condition',
             },
           },
           {
             fullUrl: `urn:uuid:${pregnancy.id}-careplan`,
             resource: PregnancyToFhirMapper.toCarePlan(pregnancy, pregnancy.tasks),
             request: {
               method: 'POST',
               url: 'CarePlan',
             },
           },
         ],
       };

       try {
         const result = await this.fhirClient.createBundle(bundle);
         
         await this.publishLogRepo.save({
           bundleId: pregnancy.id,
           status: 'success',
           request: bundle,
           response: result,
         });

         return result;
       } catch (error) {
         await this.publishLogRepo.save({
           bundleId: pregnancy.id,
           status: 'failed',
           request: bundle,
           error: error.message,
         });
         throw error;
       }
     }
   }
   ```

5. **Implementar retry com backoff exponencial**:

   ```typescript
   // retry.service.ts
   @Injectable()
   export class RetryService {
     async retryWithBackoff<T>(
       fn: () => Promise<T>,
       maxRetries = 3,
       baseDelay = 1000,
     ): Promise<T> {
       let lastError: Error;

       for (let attempt = 0; attempt < maxRetries; attempt++) {
         try {
           return await fn();
         } catch (error) {
           lastError = error;
           
           if (attempt < maxRetries - 1) {
             const delay = baseDelay * Math.pow(2, attempt);
             await this.sleep(delay);
           }
         }
       }

       throw lastError;
     }

     private sleep(ms: number): Promise<void> {
       return new Promise(resolve => setTimeout(resolve, ms));
     }
   }
   ```

6. **Criar workers de sincronização**:

   ```typescript
   // sync.worker.ts
   import { Injectable } from '@nestjs/common';
   import { Cron, CronExpression } from '@nestjs/schedule';

   @Injectable()
   export class SyncWorker {
     constructor(
       private syncService: SyncService,
       @InjectRepository(Pregnancy)
       private pregnanciesRepo: Repository<Pregnancy>,
     ) {}

     @Cron(CronExpression.EVERY_30_MINUTES)
     async handleIncrementalSync() {
       const activePregnancies = await this.pregnanciesRepo.find({
         where: { status: 'active' },
         relations: ['citizen'],
       });

       for (const pregnancy of activePregnancies) {
         try {
           await this.syncService.syncPatient(pregnancy.citizen.cpf);
         } catch (error) {
           console.error(`Sync failed for pregnancy ${pregnancy.id}:`, error);
         }
       }
     }
   }
   ```

**Critérios de Aceite Fase 3**:
- ✅ Cliente FHIR com mTLS configurado
- ✅ Sincronização incremental (read) funcionando
- ✅ Publicação transacional (write) funcionando
- ✅ Validação FHIR implementada
- ✅ Retry com backoff exponencial
- ✅ Workers de sincronização ativos
- ✅ Logs de auditoria completos

---

### Fase 4: Scheduling Service (Semanas 9-10)

**Objetivo**: Sistema de agendamento de consultas e gestão de agenda médica.

**Atividades**:

1. **Modelagem de agenda**:

   ```typescript
   // schedule.entity.ts
   @Entity('schedules')
   export class Schedule {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column()
     doctorId: string;

     @Column({ type: 'enum', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] })
     dayOfWeek: string;

     @Column({ type: 'time' })
     startTime: string;

     @Column({ type: 'time' })
     endTime: string;

     @Column({ type: 'int', default: 30 })
     slotDuration: number; // minutos

     @Column({ type: 'boolean', default: true })
     isActive: boolean;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

   ```typescript
   // appointment.entity.ts
   @Entity('appointments')
   export class Appointment {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column()
     pregnancyId: string;

     @Column()
     doctorId: string;

     @Column({ type: 'timestamp' })
     scheduledAt: Date;

     @Column({ type: 'int', default: 30 })
     duration: number;

     @Column({ type: 'enum', enum: ['scheduled', 'confirmed', 'cancelled', 'completed'], default: 'scheduled' })
     status: string;

     @Column({ type: 'text', nullable: true })
     notes?: string;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

2. **Implementar disponibilidade**:

   ```typescript
   // availability.service.ts
   @Injectable()
   export class AvailabilityService {
     constructor(
       @InjectRepository(Schedule)
       private scheduleRepo: Repository<Schedule>,
       @InjectRepository(Appointment)
       private appointmentRepo: Repository<Appointment>,
     ) {}

     async getAvailableSlots(doctorId: string, date: Date) {
       const dayOfWeek = this.getDayOfWeek(date);
       
       const schedule = await this.scheduleRepo.findOne({
         where: { doctorId, dayOfWeek, isActive: true },
       });

       if (!schedule) {
         return [];
       }

       const slots = this.generateSlots(schedule, date);
       const bookedSlots = await this.getBookedSlots(doctorId, date);

       return slots.filter(slot => 
         !bookedSlots.some(booked => booked.getTime() === slot.getTime())
       );
     }

     private generateSlots(schedule: Schedule, date: Date): Date[] {
       const slots: Date[] = [];
       const [startHour, startMin] = schedule.startTime.split(':').map(Number);
       const [endHour, endMin] = schedule.endTime.split(':').map(Number);

       let current = new Date(date);
       current.setHours(startHour, startMin, 0, 0);

       const end = new Date(date);
       end.setHours(endHour, endMin, 0, 0);

       while (current < end) {
         slots.push(new Date(current));
         current = new Date(current.getTime() + schedule.slotDuration * 60000);
       }

       return slots;
     }

     private async getBookedSlots(doctorId: string, date: Date): Promise<Date[]> {
       const startOfDay = new Date(date);
       startOfDay.setHours(0, 0, 0, 0);

       const endOfDay = new Date(date);
       endOfDay.setHours(23, 59, 59, 999);

       const appointments = await this.appointmentRepo
         .createQueryBuilder('appointment')
         .where('appointment.doctorId = :doctorId', { doctorId })
         .andWhere('appointment.scheduledAt >= :startOfDay', { startOfDay })
         .andWhere('appointment.scheduledAt <= :endOfDay', { endOfDay })
         .andWhere('appointment.status IN (:...statuses)', { 
           statuses: ['scheduled', 'confirmed'] 
         })
         .getMany();

       return appointments.map(a => a.scheduledAt);
     }

     private getDayOfWeek(date: Date): string {
       const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
       return days[date.getDay()];
     }
   }
   ```

3. **Implementar agendamento**:

   ```typescript
   // appointments.service.ts
   @Injectable()
   export class AppointmentsService {
     constructor(
       @InjectRepository(Appointment)
       private appointmentRepo: Repository<Appointment>,
       private availabilityService: AvailabilityService,
       private eventEmitter: EventEmitter2,
     ) {}

     async create(data: CreateAppointmentDto) {
       // Verificar disponibilidade
       const availableSlots = await this.availabilityService.getAvailableSlots(
         data.doctorId,
         new Date(data.scheduledAt),
       );

       const requestedSlot = new Date(data.scheduledAt);
       const isAvailable = availableSlots.some(
         slot => slot.getTime() === requestedSlot.getTime()
       );

       if (!isAvailable) {
         throw new ConflictException('Horário não disponível');
       }

       const appointment = this.appointmentRepo.create(data);
       const saved = await this.appointmentRepo.save(appointment);

       // Emitir evento para notificação
       this.eventEmitter.emit('appointment.created', saved);

       return saved;
     }

     async cancel(id: string, reason: string) {
       const appointment = await this.appointmentRepo.findOne({ where: { id } });

       if (!appointment) {
         throw new NotFoundException('Consulta não encontrada');
       }

       await this.appointmentRepo.update(id, { 
         status: 'cancelled',
         notes: reason,
       });

       this.eventEmitter.emit('appointment.cancelled', { ...appointment, reason });

       return this.appointmentRepo.findOne({ where: { id } });
     }
   }
   ```

4. **Integrar com RabbitMQ para notificações**:

   ```typescript
   // appointment-events.listener.ts
   import { Injectable } from '@nestjs/common';
   import { OnEvent } from '@nestjs/event-emitter';
   import * as amqp from 'amqplib';

   @Injectable()
   export class AppointmentEventsListener {
     private channel: amqp.Channel;

     async onModuleInit() {
       const connection = await amqp.connect(process.env.RABBITMQ_URL);
       this.channel = await connection.createChannel();
       await this.channel.assertExchange('appointments', 'topic', { durable: true });
     }

     @OnEvent('appointment.created')
     async handleAppointmentCreated(appointment: Appointment) {
       await this.channel.publish(
         'appointments',
         'appointment.created',
         Buffer.from(JSON.stringify(appointment)),
       );
     }

     @OnEvent('appointment.cancelled')
     async handleAppointmentCancelled(data: any) {
       await this.channel.publish(
         'appointments',
         'appointment.cancelled',
         Buffer.from(JSON.stringify(data)),
       );
     }
   }
   ```

**Critérios de Aceite Fase 4**:
- ✅ Scheduling Service completo
- ✅ Disponibilidade de horários funcionando
- ✅ Agendamento com validação de conflitos
- ✅ Reagendamento e cancelamento
- ✅ Integração com RabbitMQ
- ✅ Testes unitários > 80%

---

### Fase 5: Notification Service (Semanas 11-12)

**Objetivo**: Sistema de notificações multi-canal (push, e-mail, SMS).

**Atividades**:

1. **Setup de providers**:

   ```typescript
   // providers/firebase.provider.ts
   import * as admin from 'firebase-admin';

   @Injectable()
   export class FirebaseProvider {
     private messaging: admin.messaging.Messaging;

     constructor() {
       admin.initializeApp({
         credential: admin.credential.cert({
           projectId: process.env.FIREBASE_PROJECT_ID,
           clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
           privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
         }),
       });

       this.messaging = admin.messaging();
     }

     async send(token: string, payload: { title: string; body: string; data?: any }) {
       return this.messaging.send({
         token,
         notification: {
           title: payload.title,
           body: payload.body,
         },
         data: payload.data,
       });
     }
   }
   ```

2. **Implementar notification service**:

   ```typescript
   // notifications.service.ts
   @Injectable()
   export class NotificationsService {
     constructor(
       private firebaseProvider: FirebaseProvider,
       @InjectRepository(Notification)
       private notificationRepo: Repository<Notification>,
       @InjectRepository(UserPreference)
       private preferenceRepo: Repository<UserPreference>,
     ) {}

     async send(data: SendNotificationDto) {
       const preferences = await this.preferenceRepo.findOne({
         where: { userId: data.userId },
       });

       const notification = this.notificationRepo.create({
         userId: data.userId,
         type: data.type,
         title: data.title,
         body: data.body,
         channel: 'push',
         status: 'pending',
       });

       try {
         if (preferences?.pushEnabled && preferences.fcmToken) {
           await this.firebaseProvider.send(preferences.fcmToken, {
             title: data.title,
             body: data.body,
             data: data.data,
           });

           notification.status = 'sent';
           notification.sentAt = new Date();
         }

         await this.notificationRepo.save(notification);
         return notification;
       } catch (error) {
         notification.status = 'failed';
         notification.error = error.message;
         await this.notificationRepo.save(notification);
         throw error;
       }
     }
   }
   ```

3. **Criar workers de lembretes**:

   ```typescript
   // reminder.worker.ts
   @Injectable()
   export class ReminderWorker {
     constructor(
       private notificationsService: NotificationsService,
       @InjectRepository(Appointment)
       private appointmentRepo: Repository<Appointment>,
     ) {}

     @Cron(CronExpression.EVERY_HOUR)
     async sendAppointmentReminders() {
       const tomorrow = new Date();
       tomorrow.setDate(tomorrow.getDate() + 1);
       tomorrow.setHours(0, 0, 0, 0);

       const endOfTomorrow = new Date(tomorrow);
       endOfTomorrow.setHours(23, 59, 59, 999);

       const appointments = await this.appointmentRepo
         .createQueryBuilder('appointment')
         .where('appointment.scheduledAt >= :start', { start: tomorrow })
         .andWhere('appointment.scheduledAt <= :end', { end: endOfTomorrow })
         .andWhere('appointment.status = :status', { status: 'confirmed' })
         .leftJoinAndSelect('appointment.pregnancy', 'pregnancy')
         .leftJoinAndSelect('pregnancy.citizen', 'citizen')
         .getMany();

       for (const appointment of appointments) {
         await this.notificationsService.send({
           userId: appointment.pregnancy.citizen.id,
           type: 'appointment_reminder',
           title: 'Lembrete de Consulta',
           body: `Você tem uma consulta amanhã às ${this.formatTime(appointment.scheduledAt)}`,
           data: { appointmentId: appointment.id },
         });
       }
     }

     private formatTime(date: Date): string {
       return date.toLocaleTimeString('pt-BR', { 
         hour: '2-digit', 
         minute: '2-digit' 
       });
     }
   }
   ```

4. **Consumir eventos do RabbitMQ**:

   ```typescript
   // appointment-notifications.consumer.ts
   @Injectable()
   export class AppointmentNotificationsConsumer implements OnModuleInit {
     constructor(
       private notificationsService: NotificationsService,
       @InjectRepository(Pregnancy)
       private pregnancyRepo: Repository<Pregnancy>,
     ) {}

     async onModuleInit() {
       const connection = await amqp.connect(process.env.RABBITMQ_URL);
       const channel = await connection.createChannel();

       await channel.assertExchange('appointments', 'topic', { durable: true });
       await channel.assertQueue('notification-service-appointments', { durable: true });
       await channel.bindQueue(
         'notification-service-appointments',
         'appointments',
         'appointment.*',
       );

       channel.consume('notification-service-appointments', async (msg) => {
         if (msg) {
           const appointment = JSON.parse(msg.content.toString());
           
           if (msg.fields.routingKey === 'appointment.created') {
             await this.handleAppointmentCreated(appointment);
           } else if (msg.fields.routingKey === 'appointment.cancelled') {
             await this.handleAppointmentCancelled(appointment);
           }

           channel.ack(msg);
         }
       });
     }

     private async handleAppointmentCreated(appointment: any) {
       const pregnancy = await this.pregnancyRepo.findOne({
         where: { id: appointment.pregnancyId },
         relations: ['citizen'],
       });

       await this.notificationsService.send({
         userId: pregnancy.citizen.id,
         type: 'appointment_created',
         title: 'Consulta Agendada',
         body: `Sua consulta foi agendada para ${this.formatDate(appointment.scheduledAt)}`,
         data: { appointmentId: appointment.id },
       });
     }

     private async handleAppointmentCancelled(data: any) {
       const pregnancy = await this.pregnancyRepo.findOne({
         where: { id: data.pregnancyId },
         relations: ['citizen'],
       });

       await this.notificationsService.send({
         userId: pregnancy.citizen.id,
         type: 'appointment_cancelled',
         title: 'Consulta Cancelada',
         body: `Sua consulta foi cancelada. Motivo: ${data.reason}`,
         data: { appointmentId: data.id },
       });
     }

     private formatDate(date: string): string {
       return new Date(date).toLocaleDateString('pt-BR', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit',
       });
     }
   }
   ```

**Critérios de Aceite Fase 5**:
- ✅ Notification Service completo
- ✅ Push notifications funcionando (Firebase)
- ✅ E-mail funcionando (SendGrid)
- ✅ SMS funcionando (Twilio)
- ✅ Workers de lembretes ativos
- ✅ Consumidor RabbitMQ funcionando
- ✅ Preferências de usuário implementadas

---

### Fase 6: Auth Service (Semanas 13-14)

**Objetivo**: Sistema de autenticação e autorização com JWT e RBAC.

**Atividades**:

1. **Implementar Auth Service**:

   ```typescript
   // user.entity.ts
   @Entity('users')
   export class User {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ unique: true })
     email: string;

     @Column()
     password: string;

     @Column({ type: 'enum', enum: ['gestante', 'medico', 'admin'] })
     role: string;

     @Column({ nullable: true })
     citizenId?: string;

     @Column({ nullable: true })
     doctorId?: string;

     @Column({ type: 'boolean', default: false })
     isVerified: boolean;

     @Column({ type: 'boolean', default: true })
     isActive: boolean;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

   ```typescript
   // auth.service.ts
   import * as bcrypt from 'bcrypt';
   import { JwtService } from '@nestjs/jwt';

   @Injectable()
   export class AuthService {
     constructor(
       @InjectRepository(User)
       private userRepo: Repository<User>,
       private jwtService: JwtService,
     ) {}

     async register(data: RegisterDto) {
       const existingUser = await this.userRepo.findOne({
         where: { email: data.email },
       });

       if (existingUser) {
         throw new ConflictException('E-mail já cadastrado');
       }

       const hashedPassword = await bcrypt.hash(data.password, 10);

       const user = this.userRepo.create({
         ...data,
         password: hashedPassword,
       });

       return this.userRepo.save(user);
     }

     async login(data: LoginDto) {
       const user = await this.userRepo.findOne({
         where: { email: data.email },
       });

       if (!user) {
         throw new UnauthorizedException('Credenciais inválidas');
       }

       const isPasswordValid = await bcrypt.compare(data.password, user.password);

       if (!isPasswordValid) {
         throw new UnauthorizedException('Credenciais inválidas');
       }

       if (!user.isActive) {
         throw new UnauthorizedException('Usuário inativo');
       }

       const payload = {
         sub: user.id,
         email: user.email,
         role: user.role,
         citizenId: user.citizenId,
         doctorId: user.doctorId,
       };

       return {
         accessToken: this.jwtService.sign(payload),
         refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
         user: {
           id: user.id,
           email: user.email,
           role: user.role,
         },
       };
     }

     async validateToken(token: string) {
       try {
         return this.jwtService.verify(token);
       } catch {
         throw new UnauthorizedException('Token inválido');
       }
     }
   }
   ```

2. **Implementar Guards de autorização**:

   ```typescript
   // jwt-auth.guard.ts
   import { Injectable, ExecutionContext } from '@nestjs/common';
   import { AuthGuard } from '@nestjs/passport';

   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {
     canActivate(context: ExecutionContext) {
       return super.canActivate(context);
     }
   }
   ```

   ```typescript
   // roles.guard.ts
   import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
   import { Reflector } from '@nestjs/core';

   @Injectable()
   export class RolesGuard implements CanActivate {
     constructor(private reflector: Reflector) {}

     canActivate(context: ExecutionContext): boolean {
       const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
       
       if (!requiredRoles) {
         return true;
       }

       const request = context.switchToHttp().getRequest();
       const user = request.user;

       return requiredRoles.includes(user.role);
     }
   }
   ```

   ```typescript
   // roles.decorator.ts
   import { SetMetadata } from '@nestjs/common';

   export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
   ```

3. **Usar guards nos controllers**:

   ```typescript
   // pregnancies.controller.ts
   @Controller('api/v1/pregnancies')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @ApiBearerAuth()
   export class PregnanciesController {
     @Post()
     @Roles('medico', 'admin')
     async create(@Body() dto: CreatePregnancyDto) {
       return this.pregnanciesService.create(dto);
     }

     @Get('my')
     @Roles('gestante')
     async getMyPregnancies(@Req() req: Request) {
       const user = req.user as any;
       return this.pregnanciesService.findByCitizen(user.citizenId);
     }
   }
   ```

**Critérios de Aceite Fase 6**:
- ✅ Auth Service completo
- ✅ Registro e login funcionando
- ✅ JWT tokens funcionando
- ✅ Refresh tokens implementado
- ✅ RBAC (gestante, medico, admin) funcionando
- ✅ Guards aplicados em todas as rotas
- ✅ Testes de autenticação > 80%

---

### Fase 7: Web Médico (Semanas 15-17)

**Objetivo**: Interface web completa para profissionais de saúde.

**Atividades**:

1. **Setup Next.js**:

   ```bash
   cd apps/web-medico
   pnpm create next-app@latest . --typescript --tailwind --app
   pnpm add @tanstack/react-query axios react-hook-form zod
   pnpm add @shadcn/ui
   ```

2. **Configurar autenticação**:

   ```typescript
   // lib/auth.ts
   import axios from 'axios';

   export const authApi = axios.create({
     baseURL: process.env.NEXT_PUBLIC_API_URL,
   });

   export async function login(email: string, password: string) {
     const response = await authApi.post('/auth/login', { email, password });
     localStorage.setItem('accessToken', response.data.accessToken);
     localStorage.setItem('refreshToken', response.data.refreshToken);
     return response.data;
   }

   export function getAccessToken() {
     return localStorage.getItem('accessToken');
   }

   export function logout() {
     localStorage.removeItem('accessToken');
     localStorage.removeItem('refreshToken');
   }
   ```

3. **Criar telas principais**:

   - Dashboard com métricas
   - Lista de gestantes
   - Detalhes de gestante com timeline
   - Agendamento de consultas
   - Registro de consultas e exames

4. **Implementar React Query**:

   ```typescript
   // hooks/use-pregnancies.ts
   import { useQuery, useMutation } from '@tanstack/react-query';
   import axios from 'axios';

   const api = axios.create({
     baseURL: process.env.NEXT_PUBLIC_API_URL,
     headers: {
       Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
     },
   });

   export function usePregnancies() {
     return useQuery({
       queryKey: ['pregnancies'],
       queryFn: async () => {
         const response = await api.get('/pregnancies');
         return response.data;
       },
     });
   }

   export function useCreatePregnancy() {
     return useMutation({
       mutationFn: async (data: any) => {
         const response = await api.post('/pregnancies', data);
         return response.data;
       },
     });
   }
   ```

**Critérios de Aceite Fase 7**:
- ✅ Web Médico completo
- ✅ Autenticação funcionando
- ✅ Todas as telas principais implementadas
- ✅ Integração com backend via API
- ✅ Responsivo (desktop e tablet)
- ✅ Testes E2E com Playwright

---

### Fase 8: Web Admin (Semanas 18-19)

**Objetivo**: Dashboard administrativo com métricas e gestão.

**Atividades**:

1. **Criar dashboards com Recharts**
2. **Implementar gestão de usuários**
3. **Relatórios de adesão**
4. **Logs de auditoria**

**Critérios de Aceite Fase 8**:
- ✅ Web Admin completo
- ✅ Dashboards funcionais
- ✅ Gestão de usuários
- ✅ Relatórios exportáveis (CSV/PDF)

---

### Fase 9: App Mobile (Semanas 20-22)

**Objetivo**: Aplicativo React Native para gestantes.

**Atividades**:

1. **Setup React Native + Expo**:

   ```bash
   cd apps/app-mobile
   pnpm create expo-app . --template blank-typescript
   pnpm add @tanstack/react-query axios react-navigation
   ```

2. **Implementar telas principais**:

   - Onboarding e registro
   - Timeline de gestação
   - Agendamento de consultas
   - Notificações
   - Perfil e configurações

3. **Integrar push notifications**:

   ```typescript
   // services/notifications.ts
   import * as Notifications from 'expo-notifications';
   import * as Device from 'expo-device';

   export async function registerForPushNotifications() {
     if (!Device.isDevice) {
       alert('Notificações push não funcionam no simulador');
       return;
     }

     const { status: existingStatus } = await Notifications.getPermissionsAsync();
     let finalStatus = existingStatus;

     if (existingStatus !== 'granted') {
       const { status } = await Notifications.requestPermissionsAsync();
       finalStatus = status;
     }

     if (finalStatus !== 'granted') {
       return;
     }

     const token = (await Notifications.getExpoPushTokenAsync()).data;
     return token;
   }
   ```

**Critérios de Aceite Fase 9**:
- ✅ App Mobile completo
- ✅ Build Android (.apk)
- ✅ Push notifications funcionando
- ✅ Todas as telas implementadas
- ✅ Testes E2E

---

### Fase 10: Testes, Segurança e Deploy (Semanas 23-24)

**Objetivo**: Garantir qualidade, segurança e disponibilizar em produção.

**Atividades**:

1. **Testes de integração**:

   ```typescript
   // tests/integration/pregnancy.e2e.spec.ts
   import { Test, TestingModule } from '@nestjs/testing';
   import * as request from 'supertest';
   import { AppModule } from '../src/app.module';

   describe('Pregnancy Flow (e2e)', () => {
     let app;
     let accessToken: string;

     beforeAll(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();

       app = moduleFixture.createNestApplication();
       await app.init();

       // Login
       const loginResponse = await request(app.getHttpServer())
         .post('/auth/login')
         .send({ email: 'medico@test.com', password: 'password123' });

       accessToken = loginResponse.body.accessToken;
     });

     it('should create a pregnancy', () => {
       return request(app.getHttpServer())
         .post('/api/v1/pregnancies')
         .set('Authorization', `Bearer ${accessToken}`)
         .send({
           citizenId: 'uuid',
           lastMenstrualPeriod: '2025-01-01',
         })
         .expect(201);
     });

     afterAll(async () => {
       await app.close();
     });
   });
   ```

2. **Análise de segurança**:

   ```bash
   # Scan de vulnerabilidades
   pnpm audit
   
   # OWASP Dependency Check
   dependency-check --scan ./ --format HTML --out ./reports
   
   # Snyk
   snyk test
   ```

3. **Configurar observabilidade**:

   ```typescript
   // monitoring/prometheus.ts
   import { register, Counter, Histogram } from 'prom-client';

   export const httpRequestCounter = new Counter({
     name: 'http_requests_total',
     help: 'Total HTTP requests',
     labelNames: ['method', 'route', 'status'],
   });

   export const httpRequestDuration = new Histogram({
     name: 'http_request_duration_seconds',
     help: 'HTTP request duration',
     labelNames: ['method', 'route'],
   });

   export async function getMetrics() {
     return register.metrics();
   }
   ```

4. **CI/CD**:

   ```yaml
   # .github/workflows/ci.yml
   name: CI/CD

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: pnpm/action-setup@v2
         - uses: actions/setup-node@v3
           with:
             node-version: '20'
             cache: 'pnpm'
         
         - name: Install dependencies
           run: pnpm install

         - name: Lint
           run: pnpm lint

         - name: Test
           run: pnpm test

         - name: Build
           run: pnpm build

     deploy:
       needs: test
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Deploy to production
           run: |
             # Deploy scripts
   ```

5. **Deploy**:

   **Opções de infraestrutura**:

   1. **Docker Compose (simples)**:
      - Adequado para MVP e ambientes pequenos
      - Single server ou cluster pequeno

   2. **Kubernetes (escalável)**:
      - Produção robusta
      - Auto-scaling
      - Alta disponibilidade

   **Deploy Backend** (exemplo Kubernetes):

   ```yaml
   # k8s/core-service-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: core-service
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: core-service
     template:
       metadata:
         labels:
           app: core-service
       spec:
         containers:
         - name: core-service
           image: registry.example.com/prenatal/core-service:latest
           ports:
           - containerPort: 3001
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: db-secret
                 key: url
           resources:
             requests:
               memory: "256Mi"
               cpu: "250m"
             limits:
               memory: "512Mi"
               cpu: "500m"
           livenessProbe:
             httpGet:
               path: /health
               port: 3001
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /ready
               port: 3001
             initialDelaySeconds: 10
             periodSeconds: 5
   ```

**Critérios de Aceite Fase 10**:
- ✅ Cobertura de testes > 80%
- ✅ Testes E2E passando em todos os fronts
- ✅ Análise de segurança completa
- ✅ Dashboards de observabilidade configurados
- ✅ CI/CD pipeline funcional
- ✅ Deploy em ambiente de homologação
- ✅ Deploy em produção (quando aprovado)

---

## 6) Infraestrutura e DevOps

### 6.1 Ambientes

1. **Desenvolvimento (Local)**:
   - Docker Compose
   - Dados de teste
   - Mock FHIR server

2. **Homologação (Staging)**:
   - Réplica de produção
   - RNDS Homologação (DATASUS)
   - CI/CD automático

3. **Produção**:
   - Kubernetes ou Cloud provider gerenciado
   - RNDS Produção
   - Deploy manual com aprovação

### 6.2 Variáveis de Ambiente

```bash
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...

# RNDS
RNDS_BASE_URL=https://api-hmg.saude.gov.br/fhir/R4  # Homologação
RNDS_CERT_PATH=/certs/client.crt
RNDS_KEY_PATH=/certs/client.key
RNDS_CA_PATH=/certs/ca.crt

# Auth
JWT_SECRET=...
JWT_EXPIRES_IN=15m

# Notifications
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
```

### 6.3 Backup e Disaster Recovery

**Backup PostgreSQL**:
- Daily full backup
- Continuous WAL archiving
- Retention: 30 dias

**Restore Plan**:
- RPO (Recovery Point Objective): 1 hora
- RTO (Recovery Time Objective): 4 horas

---

## 7) Matriz de Dependências

| Microsserviço | Depende de | Consumido por |
|---------------|-----------|---------------|
| **Core Service** | Auth, RNDS Integration | Web Médico, Web Admin, App Gestante |
| **RNDS Integration** | Core Service | Core Service |
| **Scheduling** | Core Service, Auth | Web Médico, App Gestante |
| **Notification** | Core Service, Scheduling | - |
| **Auth** | - | Todos |

---

## 8) Critérios de Aceite por Fase

| Fase | Critérios de Aceite | Status |
|------|---------------------|--------|
| **Fase 1** | Monorepo, Docker Compose, TypeORM configurado | ⬜ |
| **Fase 2** | Core Service completo, API documentada, testes > 80% | ⬜ |
| **Fase 3** | Integração RNDS funcional (read + write), validação FHIR | ⬜ |
| **Fase 4** | Scheduling Service completo, agendamento funcional | ⬜ |
| **Fase 5** | Notification Service, push/email/SMS funcionando | ⬜ |
| **Fase 6** | Auth Service, JWT, RBAC implementado | ⬜ |
| **Fase 7** | Web Médico completo, testes E2E | ⬜ |
| **Fase 8** | Web Admin completo, dashboards funcionais | ⬜ |
| **Fase 9** | App Mobile completo, build Android | ⬜ |
| **Fase 10** | Testes, segurança, observabilidade, deploy produção | ⬜ |

---

## 📚 Referências e Recursos

### Documentação Oficial

- [RNDS FHIR Implementation Guide](https://rnds-fhir.saude.gov.br/ImplementationGuide/rnds)
- [Portal RNDS](https://rnds.saude.gov.br/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [TypeORM Documentation](https://typeorm.io/)

### Ferramentas Recomendadas

- [Bruno](https://www.usebruno.com/) - API testing (alternativa ao Postman)
- [TablePlus](https://tableplus.com/) - Database GUI
- [k9s](https://k9scli.io/) - Kubernetes CLI
- [Lens](https://k8slens.dev/) - Kubernetes IDE

---

## 🎯 Próximos Passos (Pós-MVP)

1. **Analytics avançado**: dashboard de métricas de saúde populacional
2. **Telemedicina**: consultas por vídeo integradas
3. **IA/ML**: predição de riscos, recomendações personalizadas
4. **Integração com wearables**: Apple Health, Google Fit
5. **Multi-idioma**: suporte a português, espanhol, inglês
6. **Versão iOS**: build para App Store
7. **Módulo de educação**: conteúdo educativo sobre gestação

---

## 📝 Notas Finais

**Estimativa de tempo**: 24 semanas (6 meses)

**Equipe sugerida**:
- 2 Backend Developers (Node.js/NestJS)
- 1 Frontend Developer (React/Next.js)
- 1 Mobile Developer (React Native)
- 1 DevOps Engineer (part-time)
- 1 QA Engineer (part-time)
- 1 Product Owner (part-time)

**Custos estimados** (infraestrutura mensal em produção):
- Cloud hosting (AWS/GCP/Azure): R$ 1.500 - 3.000
- Database (PostgreSQL gerenciado): R$ 500 - 1.000
- Redis/Cache: R$ 200 - 500
- Firebase (push notifications): R$ 100 - 300
- Monitoramento (Datadog/New Relic): R$ 500 - 1.000
- **Total**: R$ 2.800 - 5.800/mês

---

**Documento preparado para uso com Claude Code**
**Última atualização**: 18/11/2025 - Versão TypeORM
