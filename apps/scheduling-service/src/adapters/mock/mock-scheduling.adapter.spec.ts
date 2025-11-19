import { Test, TestingModule } from '@nestjs/testing';
import { MockSchedulingAdapter } from './mock-scheduling.adapter';
import { AppointmentStatus } from '../../entities/appointment.entity';

describe('MockSchedulingAdapter', () => {
  let adapter: MockSchedulingAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockSchedulingAdapter],
    }).compile();

    adapter = module.get<MockSchedulingAdapter>(MockSchedulingAdapter);
    adapter.clearAppointments();
  });

  describe('createAppointment', () => {
    it('should create an appointment successfully', async () => {
      const dto = {
        patientId: 'patient-123',
        professionalId: 'doctor-456',
        scheduledAt: '2025-11-20T14:00:00Z',
        notes: 'Test appointment',
      };

      const result = await adapter.createAppointment(dto);

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.externalId).toMatch(/^MOCK-/);
      expect(result.appointment).toBeDefined();
      expect(result.appointment?.patientId).toBe(dto.patientId);
      expect(result.appointment?.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should store appointment in memory', async () => {
      const dto = {
        patientId: 'patient-123',
        scheduledAt: '2025-11-20T14:00:00Z',
      };

      expect(adapter.getAppointmentCount()).toBe(0);

      await adapter.createAppointment(dto);

      expect(adapter.getAppointmentCount()).toBe(1);
    });
  });

  describe('updateAppointment', () => {
    it('should update an existing appointment', async () => {
      // Create
      const createDto = {
        patientId: 'patient-123',
        scheduledAt: '2025-11-20T14:00:00Z',
        notes: 'Original notes',
      };

      const createResult = await adapter.createAppointment(createDto);
      const externalId = createResult.externalId!;

      // Update
      const updateDto = {
        scheduledAt: '2025-11-21T10:00:00Z',
        notes: 'Updated notes',
      };

      const updateResult = await adapter.updateAppointment(
        externalId,
        updateDto,
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.appointment?.notes).toBe('Updated notes');
      expect(
        new Date(updateResult.appointment!.scheduledAt).toISOString(),
      ).toBe('2025-11-21T10:00:00.000Z');
    });

    it('should return error for non-existent appointment', async () => {
      const result = await adapter.updateAppointment('fake-id', {
        notes: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an existing appointment', async () => {
      // Create
      const createDto = {
        patientId: 'patient-123',
        scheduledAt: '2025-11-20T14:00:00Z',
      };

      const createResult = await adapter.createAppointment(createDto);
      const externalId = createResult.externalId!;

      // Cancel
      await adapter.cancelAppointment(externalId, 'Patient request');

      // Verify
      const getResult = await adapter.getAppointment(externalId);
      expect(getResult.appointment?.status).toBe(AppointmentStatus.CANCELLED);
      expect(getResult.appointment?.notes).toContain('Patient request');
    });

    it('should throw error for non-existent appointment', async () => {
      await expect(adapter.cancelAppointment('fake-id')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('getAppointment', () => {
    it('should retrieve an existing appointment', async () => {
      // Create
      const createDto = {
        patientId: 'patient-123',
        scheduledAt: '2025-11-20T14:00:00Z',
      };

      const createResult = await adapter.createAppointment(createDto);
      const externalId = createResult.externalId!;

      // Get
      const result = await adapter.getAppointment(externalId);

      expect(result.success).toBe(true);
      expect(result.appointment?.patientId).toBe('patient-123');
    });

    it('should return error for non-existent appointment', async () => {
      const result = await adapter.getAppointment('fake-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('checkAvailability', () => {
    it('should return available slots', async () => {
      const filters = {
        startDate: '2025-11-20',
        endDate: '2025-11-22',
      };

      const slots = await adapter.checkAvailability(filters);

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('date');
      expect(slots[0]).toHaveProperty('time');
      expect(slots[0]).toHaveProperty('available');
      expect(slots[0]).toHaveProperty('professional');
      expect(slots[0]).toHaveProperty('location');

      // Todos os slots retornados devem estar disponíveis
      slots.forEach((slot) => {
        expect(slot.available).toBe(true);
      });
    });

    it('should not return slots for Sundays', async () => {
      const filters = {
        startDate: '2025-11-23', // Domingo
        endDate: '2025-11-23',
      };

      const slots = await adapter.checkAvailability(filters);

      // Não deve ter slots no domingo
      expect(slots.length).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const result = await adapter.healthCheck();

      expect(result).toBe(true);
    });
  });

  describe('adapter properties', () => {
    it('should have a name', () => {
      expect(adapter.name).toBe('MockSchedulingAdapter');
    });
  });
});
