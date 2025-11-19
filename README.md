# 🏥 Sistema de Acompanhamento Pré-Natal com RNDS

Sistema de acompanhamento pré-natal integrado com a RNDS (Rede Nacional de Dados em Saúde) do DATASUS, utilizando arquitetura de microsserviços baseada em FHIR R4 e TypeORM.

## 📋 Documentação

- **[CLAUDE.md](./CLAUDE.md)** - Guia técnico completo do projeto para Claude Code
- **[ROADMAP.md](./ROADMAP.md)** - Roadmap de implementação com controle de tarefas
- **[docs/](./docs/)** - Documentação detalhada de implementação e RNDS

## 🏗️ Arquitetura

Este projeto utiliza arquitetura de microsserviços:

- **Core Service** (porta 3001) - Lógica de negócio principal
- **RNDS Service** (porta 3002) - Integração FHIR com RNDS
- **Scheduling Service** (porta 3003) - Agendamento de consultas
- **Notification Service** (porta 3004) - Notificações push/email/SMS
- **Auth Service** (porta 3005) - Autenticação e autorização
- **Web Médico** - Interface para profissionais de saúde
- **Web Admin** - Dashboard administrativo
- **App Mobile** - Aplicativo para gestantes (React Native)

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+ LTS
- pnpm 8+
- Docker Desktop

### Instalação

```bash
# Iniciar toda a stack (infraestrutura + aplicações)
docker-compose up -d

# Primeira vez: Criar database
docker exec prenatal-postgres psql -U postgres -c "CREATE DATABASE prenatal_core;"
```

### Desenvolvimento

**IMPORTANTE**: O ambiente local usa **EXATAMENTE** a mesma configuração de produção (Railway) para garantir paridade total. Isso significa:
- ✅ Mesma imagem Docker (target `production`)
- ✅ Mesmos logs formatados e coloridos
- ✅ Mesmo comportamento em runtime
- ✅ Se funciona local, funcionará no Railway

**Trade-off**: Não há hot-reload. Para ver mudanças no código, é necessário rebuild.

**Comandos Docker:**
```bash
# Iniciar toda a stack
docker-compose up -d

# Rebuild após mudanças no código
docker-compose up -d --build

# Ver logs de um serviço específico
docker-compose logs -f core-service

# Rebuild de um serviço específico
docker-compose up -d --build core-service

# Parar tudo
docker-compose down
```

## 📊 Status do Projeto

Veja o **[ROADMAP.md](./ROADMAP.md)** para acompanhar o progresso detalhado de cada fase.

**Fase Atual:** Fase 1 - Setup e Fundações ✅

## 🛠️ Stack Tecnológica

### Backend
- Node.js 20+ LTS
- NestJS
- TypeORM
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.12

### Frontend
- Next.js 14 (Web)
- React Native + Expo (Mobile)
- TailwindCSS
- shadcn/ui

### Infraestrutura
- Docker
- Docker Compose
- MinIO (S3-compatible storage)

### Integração
- RNDS FHIR R4
- mTLS authentication

## 📝 Comandos Úteis

### Docker
```bash
# Desenvolvimento
docker-compose up -d              # Iniciar toda a stack
docker-compose up -d --build      # Rebuild todas as imagens
docker-compose logs -f            # Ver logs de todos os serviços
docker-compose logs -f core-service  # Logs de um serviço específico
docker-compose ps                 # Ver status dos containers
docker-compose restart core-service  # Restart de um serviço
docker-compose down               # Parar todos os serviços
docker-compose down -v            # Parar e limpar volumes

# Build de um serviço específico
docker-compose build core-service
docker-compose up -d --build core-service

# Shell
docker exec -it prenatal-core-service sh  # Acessar shell do container

# Limpeza
docker system prune -af --volumes # Limpar Docker (liberar espaço)
```

## 🔒 Conformidade LGPD

Este projeto implementa todos os requisitos da Lei Geral de Proteção de Dados:
- Sistema de consentimento granular
- Políticas de retenção de dados (5-20 anos)
- Anonimização automática
- Direitos dos titulares (acesso, correção, eliminação, portabilidade)
- Logs de auditoria completos

## 📚 Mais Informações

- **Portal RNDS**: https://rnds.saude.gov.br/
- **FHIR R4**: https://hl7.org/fhir/R4/
- **NestJS**: https://docs.nestjs.com/
- **TypeORM**: https://typeorm.io/

## 👥 Equipe

Este projeto está sendo desenvolvido com auxílio de Claude Code (Anthropic).

## 📄 Licença

Este projeto está sob licença proprietária. Entre em contato para mais informações.
