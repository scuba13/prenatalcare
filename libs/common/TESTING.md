# 🧪 Testando o Sistema de Logging

## ⚠️ Importante: Ambiente de Execução

Os serviços **core-service** e **rnds-service** foram configurados para rodar **dentro do Docker**, onde o PostgreSQL está disponível via hostname `postgres`.

### Opções para Testar:

## 1️⃣ Opção 1: Rodar com Docker (Recomendado)

```bash
# No diretório raiz do projeto
cd "/Users/eduardonascimento/Github/prenatal care"

# Subir todos os serviços
docker-compose up -d

# Ver logs estruturados do core-service
docker-compose logs -f core-service

# Ver logs estruturados do rnds-service
docker-compose logs -f rnds-service
```

**Vantagens:**
- PostgreSQL e RabbitMQ disponíveis
- Ambiente completo funcionando
- Logs estruturados em ação

## 2️⃣ Opção 2: Rodar Localmente (Desenvolvimento)

Para rodar os serviços **fora do Docker**, você precisa:

### a) Atualizar o arquivo .env de cada serviço:

**`apps/core-service/.env`:**
```bash
DB_HOST=localhost  # ou 127.0.0.1
DB_PORT=5432
DB_USER=prenatal_user
DB_PASSWORD=prenatal_pass
DB_NAME=prenatal_core
```

**`apps/rnds-service/.env`:**
```bash
DB_HOST=localhost  # ou 127.0.0.1
DB_PORT=5432
DB_USER=prenatal_user
DB_PASSWORD=prenatal_pass
DB_NAME=rnds_sync

RABBITMQ_URL=amqp://admin:admin@localhost:5672
```

### b) Ter PostgreSQL e RabbitMQ rodando localmente:

```bash
# Opção 1: Rodar apenas banco e rabbit no Docker
docker-compose up -d postgres rabbitmq

# Opção 2: Ter instalado localmente
# PostgreSQL em localhost:5432
# RabbitMQ em localhost:5672
```

### c) Rodar os serviços:

```bash
# Terminal 1 - Core Service
cd apps/core-service
npm run start:dev

# Terminal 2 - RNDS Service
cd apps/rnds-service
npm run start:dev
```

## 📊 Verificando os Logs Estruturados

### Console (Pretty Print - Desenvolvimento)
Você verá logs formatados assim:

```
2025-11-19 00:00:00.000 INFO    [Bootstrap] 🚀 Core Service running on: http://localhost:3001
2025-11-19 00:00:01.123 DEBUG   [RequestLogger][req-abc-123] Incoming request: GET /api/citizens
2025-11-19 00:00:01.456 HTTP    [HTTP][req-abc-123] → GET /api/citizens
2025-11-19 00:00:01.789 HTTP    [HTTP][req-abc-123] ← GET /api/citizens 200 +333ms
```

### Arquivos de Log (JSON - Rotacionados Diariamente)

Os logs são salvos automaticamente em:

```
apps/core-service/logs/
├── combined-2025-11-19.log  # Todos os logs
└── error-2025-11-19.log     # Apenas erros
```

**Formato JSON:**
```json
{
  "timestamp": "2025-11-19T00:00:00.000Z",
  "level": "info",
  "context": "Bootstrap",
  "message": "🚀 Core Service running on: http://localhost:3001",
  "app": "core-service"
}
```

## 🎯 Testando Recursos Específicos

### 1. Teste de Request ID
```bash
# Fazer uma requisição
curl http://localhost:3001/api

# No log você verá o requestId único
# Todas as operações dessa requisição terão o mesmo ID
```

### 2. Teste de Error Handling
```bash
# Forçar um erro 404
curl http://localhost:3001/api/inexistente

# Forçar erro de validação
curl -X POST http://localhost:3001/api/citizens \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

Você verá logs estruturados de erro:
```
2025-11-19 00:00:00.000 ERROR   [AllExceptionsFilter] 💥 CRITICAL ERROR 404: NotFoundException
2025-11-19 00:00:00.000 WARN    [ValidationExceptionFilter] Validation Error on POST /api/citizens
```

### 3. Teste de Performance Tracking

Use os decorators nos seus services:

```typescript
import { TrackPerformance, Log } from '@prenatal/common';

@TrackPerformance(1000) // Avisa se demorar > 1s
async mySlowMethod() {
  // ...
}
```

### 4. Teste de Auditoria

```typescript
import { Audit } from '@prenatal/common';

@Audit('DELETE_PATIENT')
async deletePatient(id: string) {
  // Será logado automaticamente
}
```

## 🔍 Monitoramento em Produção

Com logs em JSON, você pode usar ferramentas como:

- **ELK Stack** (Elasticsearch + Logstash + Kibana)
- **Grafana Loki**
- **Datadog**
- **CloudWatch** (AWS)

Exemplo de query no Elasticsearch:
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

## 🐛 Troubleshooting

### Erro: "EADDRINUSE: address already in use"
```bash
# Matar processos nas portas
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### Erro: "getaddrinfo ENOTFOUND postgres"
- Você está rodando fora do Docker
- PostgreSQL não está acessível em `postgres`
- Solução: Mudar `DB_HOST=localhost` no .env

### Erro: "ACCESS_REFUSED - Login was refused"
- RabbitMQ precisa de credenciais
- Verificar RABBITMQ_URL no .env
- Usar: `amqp://admin:admin@localhost:5672`

## 📝 Próximos Passos

Agora que o logging está implementado:

1. ✅ Use `@Log()` nos métodos importantes
2. ✅ Use `@TrackPerformance()` em operações lentas
3. ✅ Use `@Audit()` em operações sensíveis
4. ✅ Monitore os arquivos de log em `logs/`
5. ✅ Configure alertas para erros críticos

## 🎓 Exemplos de Uso

Ver `libs/common/README.md` para mais exemplos e documentação completa.
