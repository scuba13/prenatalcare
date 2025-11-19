import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Appointment } from './src/entities/appointment.entity';
import { AppointmentSyncLog } from './src/entities/appointment-sync-log.entity';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'scheduling',
  entities: [Appointment, AppointmentSyncLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
