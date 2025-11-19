import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../../entities/citizen.entity';

@Injectable()
export class CitizensService {
  constructor(
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
  ) {}

  /**
   * Criar novo cidadão
   */
  async create(citizenData: Partial<Citizen>): Promise<Citizen> {
    // Validar CPF único
    if (citizenData.cpf) {
      const existingByCpf = await this.citizenRepository.findOne({
        where: { cpf: citizenData.cpf },
      });

      if (existingByCpf) {
        throw new ConflictException(`Cidadão com CPF ${citizenData.cpf} já existe`);
      }
    }

    // Validar CNS único (se fornecido)
    if (citizenData.cns) {
      const existingByCns = await this.citizenRepository.findOne({
        where: { cns: citizenData.cns },
      });

      if (existingByCns) {
        throw new ConflictException(`Cidadão com CNS ${citizenData.cns} já existe`);
      }
    }

    const citizen = this.citizenRepository.create(citizenData);
    return await this.citizenRepository.save(citizen);
  }

  /**
   * Buscar todos os cidadãos (com paginação)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    includeDeleted: boolean = false,
  ): Promise<{ data: Citizen[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.citizenRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      withDeleted: includeDeleted,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Buscar cidadão por ID
   */
  async findById(id: string, includeRelations: boolean = false): Promise<Citizen> {
    const citizen = await this.citizenRepository.findOne({
      where: { id },
      relations: includeRelations ? ['pregnancies', 'consents'] : [],
    });

    if (!citizen) {
      throw new NotFoundException(`Cidadão com ID ${id} não encontrado`);
    }

    return citizen;
  }

  /**
   * Buscar cidadão por CPF
   */
  async findByCpf(cpf: string, includeRelations: boolean = false): Promise<Citizen> {
    const citizen = await this.citizenRepository.findOne({
      where: { cpf },
      relations: includeRelations ? ['pregnancies', 'consents'] : [],
    });

    if (!citizen) {
      throw new NotFoundException(`Cidadão com CPF ${cpf} não encontrado`);
    }

    return citizen;
  }

  /**
   * Buscar cidadão por CNS
   */
  async findByCns(cns: string, includeRelations: boolean = false): Promise<Citizen> {
    const citizen = await this.citizenRepository.findOne({
      where: { cns },
      relations: includeRelations ? ['pregnancies', 'consents'] : [],
    });

    if (!citizen) {
      throw new NotFoundException(`Cidadão com CNS ${cns} não encontrado`);
    }

    return citizen;
  }

  /**
   * Buscar por nome (busca parcial)
   */
  async searchByName(name: string, limit: number = 20): Promise<Citizen[]> {
    return await this.citizenRepository
      .createQueryBuilder('citizen')
      .where('citizen.fullName ILIKE :name', { name: `%${name}%` })
      .orWhere('citizen.socialName ILIKE :name', { name: `%${name}%` })
      .take(limit)
      .getMany();
  }

  /**
   * Atualizar cidadão
   */
  async update(id: string, updateData: Partial<Citizen>): Promise<Citizen> {
    const citizen = await this.findById(id);

    // Validar unicidade de CPF se estiver mudando
    if (updateData.cpf && updateData.cpf !== citizen.cpf) {
      const existingByCpf = await this.citizenRepository.findOne({
        where: { cpf: updateData.cpf },
      });

      if (existingByCpf) {
        throw new ConflictException(`CPF ${updateData.cpf} já está em uso`);
      }
    }

    // Validar unicidade de CNS se estiver mudando
    if (updateData.cns && updateData.cns !== citizen.cns) {
      const existingByCns = await this.citizenRepository.findOne({
        where: { cns: updateData.cns },
      });

      if (existingByCns) {
        throw new ConflictException(`CNS ${updateData.cns} já está em uso`);
      }
    }

    Object.assign(citizen, updateData);
    return await this.citizenRepository.save(citizen);
  }

  /**
   * Atualizar último acesso
   */
  async updateLastAccess(id: string): Promise<void> {
    await this.citizenRepository.update(id, {
      lastAccessAt: new Date(),
    });
  }

  /**
   * Soft delete
   */
  async softDelete(id: string): Promise<void> {
    const citizen = await this.findById(id);
    await this.citizenRepository.softRemove(citizen);
  }

  /**
   * Restaurar cidadão deletado
   */
  async restore(id: string): Promise<Citizen> {
    await this.citizenRepository.restore(id);
    return await this.findById(id);
  }

  /**
   * Hard delete (permanente - usar com cautela!)
   */
  async hardDelete(id: string): Promise<void> {
    const citizen = await this.citizenRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!citizen) {
      throw new NotFoundException(`Cidadão com ID ${id} não encontrado`);
    }

    await this.citizenRepository.remove(citizen);
  }

  /**
   * Anonimizar dados do cidadão (LGPD)
   */
  async anonymize(id: string, reason: string): Promise<Citizen> {
    const citizen = await this.findById(id);

    // Anonimizar dados pessoais
    citizen.fullName = `ANÔNIMO-${citizen.id.substring(0, 8)}`;
    citizen.socialName = null;
    citizen.cpf = `***${citizen.cpf.substring(9)}`; // Manter últimos 2 dígitos
    citizen.cns = null;
    citizen.motherName = null;
    citizen.fatherName = null;
    citizen.mobilePhone = null;
    citizen.homePhone = null;
    citizen.email = null;
    citizen.address = null;
    citizen.dataAnonymizationReason = reason;

    return await this.citizenRepository.save(citizen);
  }

  /**
   * Buscar cidadãos inativos (LGPD - preparação para anonimização)
   */
  async findInactive(daysInactive: number = 1825): Promise<Citizen[]> {
    // 1825 dias = 5 anos (conforme política de retenção)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    return await this.citizenRepository
      .createQueryBuilder('citizen')
      .where('citizen.lastAccessAt < :cutoffDate', { cutoffDate })
      .orWhere('citizen.lastAccessAt IS NULL AND citizen.createdAt < :cutoffDate', {
        cutoffDate,
      })
      .andWhere('citizen.dataAnonymizationReason IS NULL')
      .getMany();
  }

  /**
   * Contar cidadãos por status
   */
  async countByStatus(): Promise<{
    active: number;
    inactive: number;
    anonymized: number;
    deleted: number;
  }> {
    const [active, inactive, anonymized, deleted] = await Promise.all([
      this.citizenRepository.count({ where: { active: true } }),
      this.citizenRepository.count({ where: { active: false } }),
      this.citizenRepository
        .createQueryBuilder('citizen')
        .where('citizen.dataAnonymizationReason IS NOT NULL')
        .getCount(),
      this.citizenRepository.count({ withDeleted: true, where: { deletedAt: null } }),
    ]);

    return { active, inactive, anonymized, deleted };
  }

  /**
   * Validar CPF (algoritmo básico)
   */
  private validateCpf(cpf: string): boolean {
    if (!cpf || cpf.length !== 11) return false;

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validar dígitos verificadores
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  /**
   * Normalizar CPF (remover formatação)
   */
  normalizeCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }
}
