import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { Appointment, AppointmentStatus } from '../entities/appointment.entity';
import { AppointmentSyncLog, SyncOperation } from '../entities/appointment-sync-log.entity';
import { ISchedulingAdapter } from '../adapters/scheduling-adapter.interface';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let appointmentRepository: jest.Mocked<Repository<Appointment>>;
  let syncLogRepository: jest.Mocked<Repository<AppointmentSyncLog>>;
  let mockAdapter: jest.Mocked<ISchedulingAdapter>;

  beforeEach(async () => {
    // Mock adapter
    mockAdapter = {
      name: 'MockAdapter',
      createAppointment: jest.fn(),
      updateAppointment: jest.fn(),
      cancelAppointment: jest.fn(),
      getAppointment: jest.fn(),
      checkAvailability: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: 'SCHEDULING_ADAPTER',
          useValue: mockAdapter,
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AppointmentSyncLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    appointmentRepository = module.get(getRepositoryToken(Appointment));
    syncLogRepository = module.get(getRepositoryToken(AppointmentSyncLog));
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      const dto = {
        patientId: 'patient-123',
        professionalId: 'doctor-456',
        scheduledAt: '2025-11-20T14:00:00Z',
        notes: 'Test',
      };

      const adapterResult = {
        success: true,
        externalId: 'MOCK-123',
        appointment: {
          id: 'app-123',
          externalId: 'MOCK-123',
          patientId: dto.patientId,
          professionalId: dto.professionalId,
          scheduledAt: new Date(dto.scheduledAt),
          status: AppointmentStatus.CONFIRMED,
          notes: dto.notes,
        },
      };

      mockAdapter.createAppointment.mockResolvedValue(adapterResult);

      const createdAppointment = {
        id: 'app-123',
        externalId: 'MOCK-123',
        adapterType: 'MockAdapter',
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
        status: AppointmentStatus.CONFIRMED,
      };

      appointmentRepository.create.mockReturnValue(createdAppointment as any);
      appointmentRepository.save.mockResolvedValue(createdAppointment as any);
      syncLogRepository.create.mockReturnValue({} as any);
      syncLogRepository.save.mockResolvedValue({} as any);

      const result = await service.createAppointment(dto);

      expect(mockAdapter.createAppointment).toHaveBeenCalledWith(dto);
      expect(appointmentRepository.create).toHaveBeenCalled();
      expect(appointmentRepository.save).toHaveBeenCalled();
      expect(syncLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SyncOperation.CREATE,
          success: true,
        }),
      );
      expect(result.externalId).toBe('MOCK-123');
    });

    it('should handle adapter failure', async () => {
      const dto = {
        patientId: 'patient-123',
        scheduledAt: '2025-11-20T14:00:00Z',
      };

      mockAdapter.createAppointment.mockResolvedValue({
        success: false,
        error: 'External system error',
      });

      await expect(service.createAppointment(dto)).rejects.toThrow(
        'External system error',
      );

      expect(mockAdapter.createAppointment).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      const id = 'app-123';
      const dto = {
        scheduledAt: '2025-11-21T10:00:00Z',
        notes: 'Updated',
      };

      const existingAppointment = {
        id,
        externalId: 'MOCK-123',
        adapterType: 'MockAdapter',
        patientId: 'patient-123',
        scheduledAt: new Date('2025-11-20T14:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
      };

      appointmentRepository.findOne.mockResolvedValue(existingAppointment as any);

      mockAdapter.updateAppointment.mockResolvedValue({
        success: true,
        appointment: { ...existingAppointment, ...dto },
      });

      appointmentRepository.save.mockResolvedValue({
        ...existingAppointment,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
      } as any);

      syncLogRepository.create.mockReturnValue({} as any);
      syncLogRepository.save.mockResolvedValue({} as any);

      const result = await service.updateAppointment(id, dto);

      expect(appointmentRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(mockAdapter.updateAppointment).toHaveBeenCalledWith('MOCK-123', dto);
      expect(appointmentRepository.save).toHaveBeenCalled();
      expect(syncLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SyncOperation.UPDATE,
          success: true,
        }),
      );
    });

    it('should throw NotFoundException if appointment not found', async () => {
      appointmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAppointment('fake-id', { notes: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if appointment has no external ID', async () => {
      appointmentRepository.findOne.mockResolvedValue({
        id: 'app-123',
        externalId: null,
      } as any);

      await expect(
        service.updateAppointment('app-123', { notes: 'Test' }),
      ).rejects.toThrow('does not have an external ID');
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      const id = 'app-123';
      const reason = 'Patient request';

      const existingAppointment = {
        id,
        externalId: 'MOCK-123',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Original notes',
      };

      appointmentRepository.findOne.mockResolvedValue(existingAppointment as any);
      mockAdapter.cancelAppointment.mockResolvedValue(undefined);
      appointmentRepository.save.mockResolvedValue({
        ...existingAppointment,
        status: AppointmentStatus.CANCELLED,
      } as any);
      syncLogRepository.create.mockReturnValue({} as any);
      syncLogRepository.save.mockResolvedValue({} as any);

      await service.cancelAppointment(id, reason);

      expect(mockAdapter.cancelAppointment).toHaveBeenCalledWith('MOCK-123', reason);
      expect(appointmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
        }),
      );
      expect(syncLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SyncOperation.CANCEL,
          success: true,
        }),
      );
    });

    it('should throw NotFoundException if appointment not found', async () => {
      appointmentRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelAppointment('fake-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAppointment', () => {
    it('should return appointment by ID', async () => {
      const appointment = {
        id: 'app-123',
        patientId: 'patient-123',
      };

      appointmentRepository.findOne.mockResolvedValue(appointment as any);

      const result = await service.getAppointment('app-123');

      expect(result).toEqual(appointment);
      expect(appointmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-123' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      appointmentRepository.findOne.mockResolvedValue(null);

      await expect(service.getAppointment('fake-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAppointmentsByPatient', () => {
    it('should return appointments for a patient', async () => {
      const appointments = [
        { id: 'app-1', patientId: 'patient-123' },
        { id: 'app-2', patientId: 'patient-123' },
      ];

      appointmentRepository.find.mockResolvedValue(appointments as any);

      const result = await service.getAppointmentsByPatient('patient-123');

      expect(result).toEqual(appointments);
      expect(appointmentRepository.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-123' },
        order: { scheduledAt: 'DESC' },
      });
    });
  });

  describe('checkAvailability', () => {
    it('should return available slots from adapter', async () => {
      const filters = {
        startDate: '2025-11-20',
        endDate: '2025-11-22',
      };

      const slots = [
        { date: '2025-11-20', time: '10:00', available: true },
        { date: '2025-11-20', time: '11:00', available: true },
      ];

      mockAdapter.checkAvailability.mockResolvedValue(slots);

      const result = await service.checkAvailability(filters);

      expect(result).toEqual(slots);
      expect(mockAdapter.checkAvailability).toHaveBeenCalledWith(filters);
    });
  });

  describe('healthCheck', () => {
    it('should return adapter health status', async () => {
      mockAdapter.healthCheck.mockResolvedValue(true);

      const result = await service.healthCheck();

      expect(result).toEqual({
        adapter: 'MockAdapter',
        healthy: true,
      });
    });

    it('should return unhealthy status', async () => {
      mockAdapter.healthCheck.mockResolvedValue(false);

      const result = await service.healthCheck();

      expect(result).toEqual({
        adapter: 'MockAdapter',
        healthy: false,
      });
    });
  });
});
