# 📅 Scheduling Service - Arquitetura com Adapters

## Visão Geral

O **Scheduling Service** é responsável por gerenciar agendamentos de consultas pré-natais, integrando-se com diferentes sistemas hospitalares através de **adapters modulares**.

## 🏗️ Arquitetura

```
┌─────────────────┐
│  Core Service   │
│   (porta 3001)  │
└────────┬────────┘
         │ HTTP/RabbitMQ
         ▼
┌─────────────────────┐
│ Scheduling Service  │
│   (porta 3003)      │
│                     │
│  ┌──────────────┐   │
│  │   Business   │   │
│  │    Logic     │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   Adapter    │   │
│  │  Interface   │   │
│  └──────┬───────┘   │
└─────────┼───────────┘
          │
    ┌─────┴─────┬─────────────┬──────────────┐
    ▼           ▼             ▼              ▼
┌────────┐  ┌────────┐  ┌──────────┐  ┌──────────┐
│ Mock   │  │Hospital│  │Hospital  │  │ Future   │
│Adapter │  │   A    │  │    B     │  │ Adapters │
└────────┘  │Adapter │  │ Adapter  │  └──────────┘
            └────────┘  └──────────┘
```

## 🎯 Fluxo de Dados

1. **Core Service** → Solicita agendamento via RabbitMQ ou HTTP
2. **Scheduling Service** → Recebe solicitação e valida
3. **Adapter Interface** → Roteia para o adapter apropriado
4. **Adapter** → Comunica com sistema externo (ou mock)
5. **Retorno** → Adapter retorna resultado para Scheduling Service
6. **Core Service** → Recebe confirmação/falha do agendamento

## 📦 Componentes Principais

### 1. Scheduling Service Core

**Responsabilidades:**
- Validação de solicitações de agendamento
- Gerenciamento de estado de agendamentos
- Regras de negócio (conflitos, disponibilidade)
- Logging e auditoria
- Retry e tratamento de erros

**Endpoints:**
```typescript
POST   /scheduling/appointments          # Criar agendamento
GET    /scheduling/appointments/:id      # Buscar agendamento
PUT    /scheduling/appointments/:id      # Atualizar agendamento
DELETE /scheduling/appointments/:id      # Cancelar agendamento
GET    /scheduling/availability          # Verificar disponibilidade
GET    /scheduling/appointments/patient/:id  # Agendamentos de uma gestante
```

### 2. Adapter Interface

**Interface padrão que todos os adapters devem implementar:**

```typescript
interface ISchedulingAdapter {
  // Criar agendamento no sistema externo
  createAppointment(data: CreateAppointmentDto): Promise<AppointmentResult>;

  // Atualizar agendamento existente
  updateAppointment(id: string, data: UpdateAppointmentDto): Promise<AppointmentResult>;

  // Cancelar agendamento
  cancelAppointment(id: string, reason?: string): Promise<void>;

  // Buscar agendamento por ID externo
  getAppointment(externalId: string): Promise<AppointmentResult>;

  // Verificar disponibilidade de horários
  checkAvailability(filters: AvailabilityFilters): Promise<AvailableSlot[]>;

  // Health check do sistema externo
  healthCheck(): Promise<boolean>;
}
```

### 3. Mock Adapter (Fase 4)

**Implementação inicial para desenvolvimento:**

```typescript
@Injectable()
export class MockSchedulingAdapter implements ISchedulingAdapter {
  private appointments: Map<string, Appointment> = new Map();

  async createAppointment(data: CreateAppointmentDto): Promise<AppointmentResult> {
    // Simula criação de agendamento com delay
    await this.simulateDelay();

    const appointment = {
      id: uuidv4(),
      externalId: `MOCK-${Date.now()}`,
      ...data,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };

    this.appointments.set(appointment.id, appointment);

    return {
      success: true,
      appointment,
      externalId: appointment.externalId,
    };
  }

  async checkAvailability(filters: AvailabilityFilters): Promise<AvailableSlot[]> {
    // Simula horários disponíveis
    const slots: AvailableSlot[] = [];
    const startDate = new Date(filters.startDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Horários das 8h às 17h
      for (let hour = 8; hour < 17; hour++) {
        slots.push({
          date: date.toISOString().split('T')[0],
          time: `${hour.toString().padStart(2, '0')}:00`,
          available: Math.random() > 0.3, // 70% de disponibilidade
          professional: filters.professionalId || 'mock-professional',
        });
      }
    }

    return slots.filter(s => s.available);
  }

  private async simulateDelay(): Promise<void> {
    // Simula latência de sistema externo (100-500ms)
    const delay = Math.random() * 400 + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 4. Future Hospital Adapters

**Exemplos de adapters futuros:**

```typescript
// Adapter para sistema específico do Hospital A
@Injectable()
export class HospitalAAdapter implements ISchedulingAdapter {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: HospitalAConfig,
  ) {}

  async createAppointment(data: CreateAppointmentDto): Promise<AppointmentResult> {
    // Implementação específica para API do Hospital A
    const response = await this.httpService.post(
      `${this.config.baseUrl}/api/v1/appointments`,
      this.transformToHospitalAFormat(data),
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Hospital-ID': this.config.hospitalId,
        },
      },
    );

    return this.transformFromHospitalAFormat(response.data);
  }

  private transformToHospitalAFormat(data: CreateAppointmentDto): any {
    // Conversão de formato padrão para formato do Hospital A
    // ...
  }
}

// Adapter para sistema do Hospital B (com protocolo diferente)
@Injectable()
export class HospitalBAdapter implements ISchedulingAdapter {
  constructor(
    private readonly soapClient: SOAPClient,
    private readonly config: HospitalBConfig,
  ) {}

  async createAppointment(data: CreateAppointmentDto): Promise<AppointmentResult> {
    // Implementação usando SOAP para Hospital B
    const soapRequest = this.buildSOAPRequest(data);
    const response = await this.soapClient.call('CreateAppointment', soapRequest);
    return this.parseSOAPResponse(response);
  }
}
```

## 🗄️ Modelo de Dados

### Appointment Entity

```typescript
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string; // ID no sistema externo

  @Column({ name: 'adapter_type' })
  adapterType: string; // 'mock', 'hospital-a', 'hospital-b', etc.

  @Column({ name: 'patient_id' })
  patientId: string; // ID da gestante no Core Service

  @Column({ name: 'professional_id', nullable: true })
  professionalId?: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Dados específicos do adapter

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### SyncLog Entity (rastreamento de sincronização)

```typescript
@Entity('appointment_sync_log')
export class AppointmentSyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  @Column({ name: 'adapter_type' })
  adapterType: string;

  @Column({ name: 'operation' })
  operation: 'CREATE' | 'UPDATE' | 'CANCEL' | 'SYNC';

  @Column({ type: 'jsonb' })
  request: any;

  @Column({ type: 'jsonb', nullable: true })
  response?: any;

  @Column()
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

## 🔄 Integração com Core Service

### Via RabbitMQ (Assíncrono)

**Filas:**
```typescript
// Core Service → Scheduling Service
QUEUE: 'scheduling.create_appointment'
QUEUE: 'scheduling.cancel_appointment'

// Scheduling Service → Core Service
QUEUE: 'core.appointment_confirmed'
QUEUE: 'core.appointment_failed'
QUEUE: 'core.appointment_updated'
```

**Exemplo de mensagem:**
```typescript
// Core Service publica
{
  "type": "CREATE_APPOINTMENT",
  "data": {
    "patientId": "uuid",
    "scheduledAt": "2025-11-20T14:00:00Z",
    "professionalId": "uuid",
    "notes": "Consulta pré-natal de rotina"
  }
}

// Scheduling Service responde
{
  "type": "APPOINTMENT_CONFIRMED",
  "data": {
    "appointmentId": "uuid",
    "externalId": "HOSP-A-12345",
    "status": "CONFIRMED",
    "scheduledAt": "2025-11-20T14:00:00Z"
  }
}
```

### Via HTTP (Síncrono)

**Usado para consultas rápidas:**
```bash
# Core Service chama Scheduling Service
GET /scheduling/availability?date=2025-11-20&professionalId=uuid

# Scheduling Service retorna
{
  "slots": [
    { "time": "08:00", "available": true },
    { "time": "09:00", "available": false },
    { "time": "10:00", "available": true }
  ]
}
```

## ⚙️ Configuração de Adapters

### Registro dinâmico de adapters

```typescript
@Module({
  providers: [
    SchedulingService,
    {
      provide: 'SCHEDULING_ADAPTER',
      useFactory: (config: ConfigService) => {
        const adapterType = config.get('ADAPTER_TYPE', 'mock');

        switch (adapterType) {
          case 'mock':
            return new MockSchedulingAdapter();
          case 'hospital-a':
            return new HospitalAAdapter(/* dependencies */);
          case 'hospital-b':
            return new HospitalBAdapter(/* dependencies */);
          default:
            throw new Error(`Unknown adapter type: ${adapterType}`);
        }
      },
      inject: [ConfigService],
    },
  ],
})
export class SchedulingModule {}
```

### Variáveis de ambiente

```env
# Scheduling Service
ADAPTER_TYPE=mock           # mock, hospital-a, hospital-b
ADAPTER_TIMEOUT=30000       # 30s timeout
ADAPTER_RETRY_ATTEMPTS=3    # 3 tentativas

# Hospital A (exemplo)
HOSPITAL_A_BASE_URL=https://api.hospital-a.com
HOSPITAL_A_API_KEY=xxx
HOSPITAL_A_HOSPITAL_ID=123

# Hospital B (exemplo)
HOSPITAL_B_SOAP_URL=https://soap.hospital-b.com/wsdl
HOSPITAL_B_USERNAME=xxx
HOSPITAL_B_PASSWORD=xxx
```

## 🔒 Segurança e Resiliência

### Retry com Backoff Exponencial

```typescript
async createAppointmentWithRetry(data: CreateAppointmentDto): Promise<AppointmentResult> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.adapter.createAppointment(data);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new RetryExhaustedException(lastError);
}
```

### Circuit Breaker

```typescript
@Injectable()
export class CircuitBreakerService {
  private failures = 0;
  private lastFailureTime: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime.getTime() > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ServiceUnavailableException('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## 📊 Monitoramento e Observabilidade

### Métricas importantes

```typescript
// Latência de criação de agendamentos por adapter
scheduling.appointment.create.duration{adapter="mock"}

// Taxa de sucesso/falha
scheduling.appointment.create.success{adapter="mock"}
scheduling.appointment.create.failure{adapter="mock"}

// Circuit breaker
scheduling.circuit_breaker.state{adapter="mock"}

// Disponibilidade de slots
scheduling.availability.slots_available{adapter="mock"}
```

### Health checks

```typescript
@Controller('health')
export class HealthController {
  constructor(
    @Inject('SCHEDULING_ADAPTER') private readonly adapter: ISchedulingAdapter,
  ) {}

  @Get()
  async check() {
    const adapterHealthy = await this.adapter.healthCheck();

    return {
      status: adapterHealthy ? 'UP' : 'DOWN',
      adapter: {
        type: this.adapter.constructor.name,
        healthy: adapterHealthy,
      },
    };
  }
}
```

## 🚀 Roadmap de Implementação

### Fase 4.1 - Mock Adapter (Atual)
- [x] Definir arquitetura de adapters
- [ ] Implementar interface ISchedulingAdapter
- [ ] Criar MockSchedulingAdapter
- [ ] Implementar endpoints REST
- [ ] Adicionar validações de negócio
- [ ] Configurar RabbitMQ para mensageria
- [ ] Criar entidades e migrations
- [ ] Implementar retry e circuit breaker
- [ ] Adicionar logs estruturados
- [ ] Criar testes unitários e E2E

### Fase 4.2 - Integração com Core Service
- [ ] Configurar filas RabbitMQ
- [ ] Implementar listeners de mensagens
- [ ] Criar DTOs de comunicação
- [ ] Adicionar validação de eventos
- [ ] Implementar testes de integração

### Fase 4.3 - Adapters Reais (Futuro)
- [ ] Implementar HospitalAAdapter (quando disponível)
- [ ] Implementar HospitalBAdapter (quando disponível)
- [ ] Criar ferramenta de migração entre adapters
- [ ] Documentar processo de criação de novos adapters

## 📚 Benefícios da Arquitetura

1. **Modularidade**: Novos adapters podem ser adicionados sem modificar código existente
2. **Testabilidade**: Mock adapter permite desenvolvimento sem dependências externas
3. **Flexibilidade**: Suporte a diferentes protocolos (REST, SOAP, GraphQL, etc.)
4. **Resiliência**: Circuit breaker e retry protegem contra falhas de sistemas externos
5. **Observabilidade**: Logs e métricas por adapter facilitam troubleshooting
6. **Escalabilidade**: Cada adapter pode ter configurações específicas de timeout e retry
7. **Manutenibilidade**: Interface clara separa lógica de negócio da integração

## 🔗 Referências

- [FHIR Appointment Resource](https://hl7.org/fhir/R4/appointment.html)
- [NestJS Circuit Breaker Pattern](https://docs.nestjs.com/techniques/circuit-breaker)
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
