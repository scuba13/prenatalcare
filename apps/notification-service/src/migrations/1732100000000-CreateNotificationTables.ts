import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationTables1732100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'citizen_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'general'",
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'scheduled_for',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'external_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for notifications
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_citizen_id',
        columnNames: ['citizen_id'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_scheduled_for',
        columnNames: ['scheduled_for'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_external',
        columnNames: ['external_id', 'external_type'],
      }),
    );

    // Create user_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'citizen_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'push_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sms_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'fcm_token',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'language',
            type: 'varchar',
            length: '5',
            default: "'pt-BR'",
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: "'America/Sao_Paulo'",
          },
          {
            name: 'quiet_hours_start',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'quiet_hours_end',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'appointment_reminders_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'task_reminders_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'pregnancy_milestones_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'fcm_token_updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index for user_preferences
    await queryRunner.createIndex(
      'user_preferences',
      new TableIndex({
        name: 'IDX_user_preferences_citizen_id',
        columnNames: ['citizen_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_preferences');
    await queryRunner.dropTable('notifications');
  }
}
