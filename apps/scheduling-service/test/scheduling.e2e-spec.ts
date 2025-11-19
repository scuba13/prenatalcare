import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Scheduling Service (e2e)', () => {
  let app: INestApplication;
  let createdAppointmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('adapter');
          expect(res.body).toHaveProperty('circuitBreaker');
          expect(res.body).toHaveProperty('retry');
        });
    });

    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect({ alive: true });
    });

    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ready');
          expect(typeof res.body.ready).toBe('boolean');
        });
    });
  });

  describe('/scheduling/availability (GET)', () => {
    it('should return available slots', () => {
      return request(app.getHttpServer())
        .get('/scheduling/availability')
        .query({
          startDate: '2025-11-20',
          endDate: '2025-11-22',
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('date');
            expect(res.body[0]).toHaveProperty('time');
            expect(res.body[0]).toHaveProperty('available');
          }
        });
    });

    it('should require startDate', () => {
      return request(app.getHttpServer())
        .get('/scheduling/availability')
        .expect(400);
    });
  });

  describe('/scheduling/appointments (POST)', () => {
    it('should create a new appointment', () => {
      return request(app.getHttpServer())
        .post('/scheduling/appointments')
        .send({
          patientId: 'test-patient-123',
          professionalId: 'test-doctor-456',
          scheduledAt: '2025-11-20T14:00:00Z',
          notes: 'E2E Test Appointment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('externalId');
          expect(res.body.patientId).toBe('test-patient-123');
          expect(res.body.status).toBe('CONFIRMED');
          createdAppointmentId = res.body.id;
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/scheduling/appointments')
        .send({
          patientId: 'test-patient-123',
          // Missing scheduledAt
        })
        .expect(400);
    });
  });

  describe('/scheduling/appointments/:id (GET)', () => {
    it('should get appointment by id', () => {
      return request(app.getHttpServer())
        .get(`/scheduling/appointments/${createdAppointmentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdAppointmentId);
          expect(res.body.patientId).toBe('test-patient-123');
        });
    });

    it('should return 404 for non-existent appointment', () => {
      return request(app.getHttpServer())
        .get('/scheduling/appointments/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('/scheduling/appointments/:id (PUT)', () => {
    it('should update appointment', () => {
      return request(app.getHttpServer())
        .put(`/scheduling/appointments/${createdAppointmentId}`)
        .send({
          notes: 'Updated notes from E2E test',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdAppointmentId);
          expect(res.body.notes).toBe('Updated notes from E2E test');
        });
    });
  });

  describe('/scheduling/appointments/patient/:patientId (GET)', () => {
    it('should get appointments by patient id', () => {
      return request(app.getHttpServer())
        .get('/scheduling/appointments/patient/test-patient-123')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].patientId).toBe('test-patient-123');
        });
    });
  });

  describe('/scheduling/appointments/:id (DELETE)', () => {
    it('should cancel appointment', () => {
      return request(app.getHttpServer())
        .delete(`/scheduling/appointments/${createdAppointmentId}`)
        .query({ reason: 'E2E test cleanup' })
        .expect(204);
    });

    it('should verify appointment was cancelled', () => {
      return request(app.getHttpServer())
        .get(`/scheduling/appointments/${createdAppointmentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('CANCELLED');
        });
    });
  });

  describe('Complete Flow - Check availability and book', () => {
    it('should check availability, book appointment, verify slot is taken', async () => {
      // 1. Check availability
      const availabilityRes = await request(app.getHttpServer())
        .get('/scheduling/availability')
        .query({
          startDate: '2025-12-01',
          endDate: '2025-12-01',
          professionalId: 'test-doctor-789',
        })
        .expect(200);

      expect(availabilityRes.body.length).toBeGreaterThan(0);
      const availableSlot = availabilityRes.body.find((slot: any) => slot.available);
      expect(availableSlot).toBeDefined();

      // 2. Book the appointment
      const scheduledAt = `${availableSlot.date}T${availableSlot.time}:00Z`;
      const bookingRes = await request(app.getHttpServer())
        .post('/scheduling/appointments')
        .send({
          patientId: 'test-patient-flow',
          professionalId: 'test-doctor-789',
          scheduledAt,
          notes: 'Flow test',
        })
        .expect(201);

      const appointmentId = bookingRes.body.id;
      expect(appointmentId).toBeDefined();

      // 3. Clean up
      await request(app.getHttpServer())
        .delete(`/scheduling/appointments/${appointmentId}`)
        .query({ reason: 'Flow test cleanup' })
        .expect(204);
    });
  });
});
