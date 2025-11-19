# 🚂 Deploy no Railway

## Configuração para Produção

### 1. Preparação dos Serviços

Cada serviço (core-service e rnds-service) deve ser deployado como um **serviço separado** no Railway.

### 2. Dockerfile já está pronto para produção

Os Dockerfiles foram configurados para:
- ✅ Compilar `@prenatal/common` durante o build no stage `deps`
- ✅ Copiar a biblioteca compilada para `node_modules/@prenatal/common` no stage `builder`
- ✅ Incluir a biblioteca no stage `production` sem volumes externos
- ✅ Usar multi-stage build para otimizar tamanho da imagem
- ✅ Funcionar identicamente ao ambiente de produção do Railway

**IMPORTANTE**: Os Dockerfiles já compilam a biblioteca `@prenatal/common` internamente durante o build Docker, então NÃO é necessário compilar localmente antes do deploy.

**Arquitetura dos Stages**:
1. **deps**: Compila `@prenatal/common` e instala dependências do serviço
2. **dev**: Stage de desenvolvimento com hot reload (deprecated - não usar)
3. **builder**: Copia `@prenatal/common` para `node_modules/@prenatal/common` e faz build da aplicação
4. **production**: Copia dist, node_modules e `@prenatal/common` do builder

**IMPORTANTE**: O `docker-compose.yml` local usa o mesmo target `production` que o Railway para garantir paridade entre ambientes. Se funciona local, funcionará no Railway.

### 3. Configuração no Railway

#### Para o Core Service:

1. **Criar novo serviço no Railway**
2. **Dockerfile Path**: `apps/core-service/Dockerfile`
3. **Docker Build Context**: `.` (raiz do projeto)
4. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3001
   DB_HOST=<railway-postgres-host>
   DB_PORT=5432
   DB_USER=<db-user>
   DB_PASSWORD=<db-password>
   DB_NAME=prenatal_core
   REDIS_HOST=<railway-redis-host>
   REDIS_PORT=6379
   RABBITMQ_HOST=<railway-rabbitmq-host>
   RABBITMQ_PORT=5672
   RABBITMQ_USER=<rabbitmq-user>
   RABBITMQ_PASS=<rabbitmq-password>
   ```

#### Para o RNDS Service:

1. **Criar novo serviço no Railway**
2. **Dockerfile Path**: `apps/rnds-service/Dockerfile`
3. **Docker Build Context**: `.` (raiz do projeto)
4. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3002
   DB_HOST=<railway-postgres-host>
   DB_PORT=5432
   DB_USER=<db-user>
   DB_PASSWORD=<db-password>
   DB_NAME=rnds_sync
   RABBITMQ_URL=amqp://<user>:<pass>@<host>:5672
   RNDS_BASE_URL=<rnds-production-url>
   RNDS_AUTH_URL=<rnds-auth-url>
   RNDS_CLIENT_ID=<client-id>
   RNDS_CLIENT_SECRET=<client-secret>
   RNDS_USE_MTLS=true
   ```

### 4. Serviços de Infraestrutura

Adicionar no Railway:
- **PostgreSQL** (banco de dados)
- **Redis** (cache e sessões)
- **RabbitMQ** (mensageria) - usar template do Railway Marketplace

### 5. Build Command (Opcional)

Se o Railway não detectar automaticamente, configurar:

**Build Command**:
```bash
# Railway executa docker build automaticamente
# Não precisa de comando adicional
```

**Start Command**:
```bash
# Já definido no Dockerfile
npm run start:prod
```

### 6. Healthcheck

Adicionar endpoint de healthcheck em cada serviço:

**URL**: `http://<service-url>/health`

### 7. Logs

Os logs estruturados em JSON estarão disponíveis automaticamente nos logs do Railway.

Para visualizar:
```bash
railway logs
```

### 8. Certificados mTLS (RNDS Service)

Para produção com RNDS real:

1. Adicionar certificados como **secrets** ou via volume mount
2. Configurar path: `/certs/certificate.pem` e `/certs/key.pem`
3. Definir `RNDS_USE_MTLS=true`

## 📋 Checklist de Deploy

- [ ] PostgreSQL configurado e rodando
- [ ] Redis configurado e rodando
- [ ] RabbitMQ configurado e rodando
- [ ] Core Service deployado e conectado ao banco
- [ ] RNDS Service deployado
- [ ] Variáveis de ambiente configuradas
- [ ] Healthcheck funcionando
- [ ] Logs estruturados visíveis
- [ ] Certificados mTLS configurados (se necessário)

## 🔍 Troubleshooting

### Erro: "Cannot find module '@prenatal/common'" durante o build (TypeScript)

**Causa**: Docker Build Context incorreto ou biblioteca não copiada no stage builder

**Solução**:
1. Verificar que o Docker Build Context está na raiz (`.`) e não em `./apps/xxx`
2. Confirmar que o Dockerfile tem no stage builder:
   ```dockerfile
   COPY --from=deps /app/libs/common ./node_modules/@prenatal/common
   ```

### Erro: "Cannot find module '@prenatal/common'" em runtime (Node.js)

**Causa**: Biblioteca common não está presente em `node_modules/@prenatal/common` no container de produção

**Solução**: Verificar se o stage production tem:
```dockerfile
# Copy common library into node_modules (must be separate to preserve structure)
COPY --from=deps /app/libs/common ./node_modules/@prenatal/common
```

### Erro: "Connection refused" para PostgreSQL/Redis/RabbitMQ

**Solução**: Verificar se os serviços estão no mesmo projeto Railway e usar as variáveis de ambiente internas do Railway

### Logs não aparecem estruturados

**Solução**: Verificar que `NODE_ENV=production` está definido

## 📚 Documentação

- [Railway Docs](https://docs.railway.app/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [NestJS Production](https://docs.nestjs.com/first-steps#running-the-application)

## 🎯 Ambiente Local vs Railway

**IMPORTANTE**: O ambiente local agora usa a **MESMA configuração** do Railway para garantir paridade 100%.

| Aspecto | Local & Railway (Idênticos) |
|---------|---------------------------|
| Build | Docker multi-stage |
| Target | `production` (otimizado) |
| Volumes | ❌ Não (tudo na imagem) |
| `@prenatal/common` | Compilada no Dockerfile |
| Logs | Pretty print com cores |
| NODE_ENV | production |
| Hot-reload | ❌ Não (rebuild necessário) |
| Startup | `node dist/main` |
| Logger Init | Antes do bootstrap |

**Vantagens dessa abordagem**:
- ✅ **Paridade total**: Se funciona local, funcionará no Railway
- ✅ **Mesmos logs**: Formato idêntico em ambos ambientes
- ✅ **Sem surpresas**: Não há diferenças de comportamento
- ✅ **Debug facilitado**: Logs sempre formatados e coloridos

**Trade-off**:
- ❌ Sem hot-reload local (necessário `docker-compose up -d --build` após mudanças)

**Logger**: Criado ANTES do `NestFactory.create()` para garantir que o Winston controle completamente a saída, evitando que o NestJS serialize os logs em JSON.
