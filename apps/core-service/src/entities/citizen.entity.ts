import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Pregnancy } from './pregnancy.entity';
import { Consent } from './consent.entity';

@Entity('citizens')
export class Citizen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificação
  @Column({ length: 11, unique: true })
  cpf: string; // CPF sem formatação (apenas números)

  @Column({ length: 15, nullable: true, unique: true })
  cns: string | null; // Cartão Nacional de Saúde

  @Column({ length: 255 })
  fullName: string;

  @Column({ length: 100, nullable: true })
  familyName: string | null; // Sobrenome (para FHIR name.family)

  @Column({ type: 'jsonb', nullable: true })
  givenNames: string[] | null; // Nomes próprios (para FHIR name.given[])

  @Column({ length: 100, nullable: true })
  socialName: string | null; // Nome social (LGPD)

  @Column({ type: 'date' })
  birthDate: Date;

  // Dados Demográficos
  @Column({
    type: 'enum',
    enum: ['female', 'male', 'other', 'unknown'],
    default: 'female',
  })
  gender: 'female' | 'male' | 'other' | 'unknown'; // Pré-natal: sempre 'female' por padrão

  @Column({ length: 100, nullable: true })
  motherName: string | null; // Nome da mãe (identificação)

  @Column({ length: 100, nullable: true })
  fatherName: string | null;

  // Contato
  @Column({ length: 11 })
  mobilePhone: string; // Celular obrigatório (apenas números)

  @Column({ length: 11, nullable: true })
  homePhone: string | null;

  @Column({ length: 255, nullable: true })
  email: string | null;

  // Endereço (conforme FHIR Address e BREndereco RNDS)
  @Column({ type: 'jsonb', nullable: true })
  address: {
    use?: 'home' | 'work' | 'temp' | 'old';
    type?: 'physical' | 'postal' | 'both';
    // line[0] = nome da rua (street)
    // line[1] = número (number)
    // line[2] = complemento (complement) - pode ser vazio ""
    // line[3] = bairro (neighborhood)
    line: [string, string, string, string]; // ["Rua das Flores", "123", "Apto 45", "Centro"]
    city: string; // Município
    state: string; // UF (2 letras)
    postalCode: string; // CEP (8 dígitos)
    country?: string; // BRA
  } | null;

  // Dados Clínicos Básicos
  @Column({ type: 'enum', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], nullable: true })
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;

  @Column({ type: 'jsonb', default: [] })
  allergies: string[]; // ["Penicilina", "Látex"]

  @Column({ type: 'jsonb', default: [] })
  chronicConditions: string[]; // ["Diabetes", "Hipertensão"]

  // Metadados LGPD
  @Column({ default: true })
  active: boolean; // Cidadão ativo no sistema

  @Column({ type: 'timestamp', nullable: true })
  lastAccessAt: Date | null; // Última vez que acessou o sistema

  @Column({ type: 'text', nullable: true })
  dataAnonymizationReason: string | null; // Motivo da anonimização

  // Auditoria
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null; // Soft delete

  // Relações
  @OneToMany(() => Pregnancy, (pregnancy) => pregnancy.citizen)
  pregnancies: Pregnancy[];

  @OneToMany(() => Consent, (consent) => consent.citizen)
  consents: Consent[];

  // Métodos auxiliares
  getAge(): number {
    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  getDisplayName(): string {
    return this.socialName || this.fullName;
  }

  isAnonymized(): boolean {
    return this.dataAnonymizationReason !== null;
  }
}
