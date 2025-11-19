import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAppointmentTables1732024800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create appointments table
    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'external_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'adapter_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'patient_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'professional_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'scheduled_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'PENDING',
              'CONFIRMED',
              'IN_PROGRESS',
              'COMPLETED',
              'CANCELLED',
              'NO_SHOW',
            ],
            default: "'PENDING'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for appointments
    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_patient_id',
        columnNames: ['patient_id'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_professional_id',
        columnNames: ['professional_id'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_scheduled_at',
        columnNames: ['scheduled_at'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'appointments',
      new TableIndex({
        name: 'IDX_appointments_external_id',
        columnNames: ['external_id'],
      }),
    );

    // Create appointment_sync_log table
    await queryRunner.createTable(
      new Table({
        name: 'appointment_sync_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'appointment_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'adapter_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'operation',
            type: 'enum',
            enum: ['CREATE', 'UPDATE', 'CANCEL', 'SYNC'],
            isNullable: false,
          },
          {
            name: 'request',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for appointment_sync_log
    await queryRunner.createIndex(
      'appointment_sync_log',
      new TableIndex({
        name: 'IDX_appointment_sync_log_appointment_id',
        columnNames: ['appointment_id'],
      }),
    );

    await queryRunner.createIndex(
      'appointment_sync_log',
      new TableIndex({
        name: 'IDX_appointment_sync_log_success',
        columnNames: ['success'],
      }),
    );

    await queryRunner.createIndex(
      'appointment_sync_log',
      new TableIndex({
        name: 'IDX_appointment_sync_log_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appointment_sync_log');
    await queryRunner.dropTable('appointments');
  }
}
