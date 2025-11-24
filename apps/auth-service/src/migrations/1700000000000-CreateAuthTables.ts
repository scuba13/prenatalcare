import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAuthTables1700000000000 implements MigrationInterface {
  name = 'CreateAuthTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tipo enum para roles
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('gestante', 'medico', 'admin')
    `);

    // Criar tabela users
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'user_role_enum',
            default: "'gestante'",
          },
          {
            name: 'citizen_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'doctor_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cpf',
            type: 'varchar',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failed_login_attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'locked_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'password_reset_token',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'password_reset_expires',
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

    // Criar índices para users
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_user_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_user_cpf',
        columnNames: ['cpf'],
      }),
    );

    // Criar tabela refresh_tokens
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'is_revoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar foreign key para refresh_tokens
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        name: 'fk_refresh_token_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Criar índice para refresh_tokens
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'idx_refresh_token_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'idx_refresh_token_token',
        columnNames: ['token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign keys
    await queryRunner.dropForeignKey('refresh_tokens', 'fk_refresh_token_user');

    // Remover índices de refresh_tokens
    await queryRunner.dropIndex('refresh_tokens', 'idx_refresh_token_token');
    await queryRunner.dropIndex('refresh_tokens', 'idx_refresh_token_user');

    // Remover tabela refresh_tokens
    await queryRunner.dropTable('refresh_tokens');

    // Remover índices de users
    await queryRunner.dropIndex('users', 'idx_user_cpf');
    await queryRunner.dropIndex('users', 'idx_user_email');

    // Remover tabela users
    await queryRunner.dropTable('users');

    // Remover tipo enum
    await queryRunner.query('DROP TYPE "user_role_enum"');
  }
}
