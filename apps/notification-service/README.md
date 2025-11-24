# Notification Service

Serviço de notificações multi-canal para o sistema de Pré-Natal. Suporta push notifications (Firebase), email (SendGrid) e SMS (Twilio).

## Características

- **Multi-canal**: Push, Email, SMS
- **Firebase Cloud Messaging**: Push notifications para Android/iOS
- **RabbitMQ**: Consumo de eventos dos outros serviços
- **Workers**: Lembretes automáticos de consultas e tarefas
- **Preferências**: Controle granular de canais por usuário
- **Quiet Hours**: Respeita horários de silêncio configurados
- **Modo Mock**: Firebase em modo simulação para desenvolvimento

## Tecnologias

- **NestJS**: Framework backend
- **TypeORM**: ORM para PostgreSQL
- **Firebase Admin SDK**: Push notifications
- **RabbitMQ**: Mensageria assíncrona
- **Cron Jobs**: Scheduled tasks para lembretes

## Estrutura

```
src/
├── controllers/       # REST API endpoints
│   ├── notifications.controller.ts
│   └── preferences.controller.ts
├── entities/          # TypeORM entities
│   ├── notification.entity.ts
│   └── user-preference.entity.ts
├── services/          # Business logic
│   └── notifications.service.ts
├── providers/         # External providers
│   └── firebase.provider.ts
├── messaging/         # RabbitMQ
│   ├── rabbitmq.service.ts
│   └── event.listener.ts
├── workers/           # Cron jobs
│   └── reminder.worker.ts
├── dto/               # Data Transfer Objects
└── migrations/        # Database migrations
```

## API Endpoints

### Notificações

- `POST /notifications/send` - Enviar notificação
- `GET /notifications/history/:citizenId` - Histórico de notificações
- `GET /notifications/:id` - Buscar notificação por ID

### Preferências

- `GET /preferences/:citizenId` - Buscar preferências
- `PUT /preferences/:citizenId` - Atualizar preferências

## Variáveis de Ambiente

```bash
# Application
NODE_ENV=development
PORT=3004

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=prenatal
DATABASE_PASSWORD=prenatal123
DATABASE_NAME=prenatal_notifications

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin@localhost:5672

# Firebase (deixar vazio para modo MOCK)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Services
CORE_SERVICE_URL=http://localhost:3001
SCHEDULING_SERVICE_URL=http://localhost:3003
```

## Executar Localmente

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run start:dev

# Build
npm run build

# Produção
npm run start:prod
```

## Docker

```bash
# Build
docker-compose build notification-service

# Run
docker-compose up notification-service
```

## Eventos RabbitMQ

### Consumidos (Inbound)

- `scheduling.appointment.created` - Nova consulta agendada
- `scheduling.appointment.cancelled` - Consulta cancelada
- `scheduling.appointment.rescheduled` - Consulta reagendada
- `core.task.created` - Nova tarefa criada
- `core.task.overdue` - Tarefa atrasada
- `core.pregnancy.milestone` - Marco da gravidez atingido

### Publicados (Outbound)

- `notifications.status.sent` - Notificação enviada
- `notifications.status.failed` - Notificação falhou
- `notifications.status.delivered` - Notificação entregue

## Workers

### Reminder Worker

- **Frequência**: A cada hora
- **Função**: Envia lembretes de consultas do dia seguinte

- **Frequência**: A cada 6 horas
- **Função**: Envia lembretes de tarefas pendentes

## Modo Mock (Desenvolvimento)

Quando as credenciais do Firebase não são fornecidas, o serviço opera em modo MOCK:
- Simula envio de push notifications (95% de sucesso)
- Logs detalhados no console
- Não requer configuração do Firebase
- Ideal para desenvolvimento e testes

## Swagger

Documentação interativa disponível em:
```
http://localhost:3004/api
```

## Licença

Proprietary - Prenatal Care Team
