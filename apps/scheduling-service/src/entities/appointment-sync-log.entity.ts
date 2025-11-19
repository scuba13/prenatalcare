import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  CANCEL = 'CANCEL',
  SYNC = 'SYNC',
}

@Entity('appointment_sync_log')
export class AppointmentSyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string; // ID do appointment interno

  @Column({ name: 'adapter_type' })
  adapterType: string; // Qual adapter foi usado

  @Column({
    type: 'enum',
    enum: SyncOperation,
  })
  operation: SyncOperation; // Tipo de operação

  @Column({ type: 'jsonb' })
  request: any; // Payload enviado ao adapter

  @Column({ type: 'jsonb', nullable: true })
  response?: any; // Resposta do adapter

  @Column()
  success: boolean; // Se a operação foi bem-sucedida

  @Column({ type: 'text', nullable: true })
  error?: string; // Mensagem de erro, se houver

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
