import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { CitizensService } from '../citizens/citizens.service';

@Injectable()
export class PregnanciesService {
  constructor(
    @InjectRepository(Pregnancy)
    private readonly pregnancyRepository: Repository<Pregnancy>,
    private readonly citizensService: CitizensService,
  ) {}

  /**
   * Criar nova gravidez
   */
  async create(pregnancyData: Partial<Pregnancy>): Promise<Pregnancy> {
    // Verificar se cidadã existe
    if (pregnancyData.citizenId) {
      await this.citizensService.findById(pregnancyData.citizenId);
    }

    // Verificar se já existe gravidez ativa para essa cidadã
    if (pregnancyData.citizenId) {
      const activePregnancy = await this.findActiveByCitizen(pregnancyData.citizenId);
      if (activePregnancy) {
        throw new ConflictException(
          `Cidadã já possui uma gravidez ativa (ID: ${activePregnancy.id})`,
        );
      }
    }

    // Calcular DPP se tiver DUM
    if (pregnancyData.lastMenstrualPeriod && !pregnancyData.estimatedDueDate) {
      pregnancyData.estimatedDueDate = this.calculateDueDate(
        pregnancyData.lastMenstrualPeriod,
      );
    }

    const pregnancy = this.pregnancyRepository.create(pregnancyData);

    // Calcular idade gestacional inicial
    pregnancy.updateGestationalAge();

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Buscar todas as gravidezes (com paginação)
   */
  async findAll(
    page: number | string = 1,
    limit: number | string = 20,
    status?: 'active' | 'completed' | 'terminated',
  ): Promise<{
    data: Pregnancy[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Garantir que page e limit são números válidos
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = this.pregnancyRepository
      .createQueryBuilder('pregnancy')
      .leftJoinAndSelect('pregnancy.citizen', 'citizen')
      .skip(skip)
      .take(limitNum)
      .orderBy('pregnancy.createdAt', 'DESC');

    if (status) {
      query.where('pregnancy.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Buscar gravidez por ID
   */
  async findById(id: string, includeRelations: boolean = true): Promise<Pregnancy> {
    const relations = includeRelations
      ? ['citizen', 'carePlans', 'tasks']
      : [];

    const pregnancy = await this.pregnancyRepository.findOne({
      where: { id },
      relations,
    });

    if (!pregnancy) {
      throw new NotFoundException(`Gravidez com ID ${id} não encontrada`);
    }

    return pregnancy;
  }

  /**
   * Buscar gravidezes de uma cidadã
   */
  async findByCitizen(
    citizenId: string,
    includeInactive: boolean = true,
  ): Promise<Pregnancy[]> {
    const query = this.pregnancyRepository
      .createQueryBuilder('pregnancy')
      .where('pregnancy.citizenId = :citizenId', { citizenId })
      .orderBy('pregnancy.createdAt', 'DESC');

    if (!includeInactive) {
      query.andWhere('pregnancy.status = :status', { status: 'active' });
    }

    return await query.getMany();
  }

  /**
   * Buscar gravidez ativa de uma cidadã
   */
  async findActiveByCitizen(citizenId: string): Promise<Pregnancy | null> {
    return await this.pregnancyRepository.findOne({
      where: { citizenId, status: 'active' },
      relations: ['citizen'],
    });
  }

  /**
   * Buscar gravidezes por risco
   */
  async findByRiskLevel(
    riskLevel: 'habitual' | 'intermediario' | 'alto',
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Pregnancy[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.pregnancyRepository.findAndCount({
      where: { riskLevel, status: 'active' },
      relations: ['citizen'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  /**
   * Buscar gravidezes com vencimento próximo
   */
  async findDueSoon(daysAhead: number = 30): Promise<Pregnancy[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.pregnancyRepository
      .createQueryBuilder('pregnancy')
      .leftJoinAndSelect('pregnancy.citizen', 'citizen')
      .where('pregnancy.status = :status', { status: 'active' })
      .andWhere('pregnancy.estimatedDueDate BETWEEN :today AND :futureDate', {
        today,
        futureDate,
      })
      .orderBy('pregnancy.estimatedDueDate', 'ASC')
      .getMany();
  }

  /**
   * Atualizar gravidez
   */
  async update(id: string, updateData: Partial<Pregnancy>): Promise<Pregnancy> {
    const pregnancy = await this.findById(id);

    // Recalcular DPP se DUM mudou
    if (
      updateData.lastMenstrualPeriod &&
      updateData.lastMenstrualPeriod !== pregnancy.lastMenstrualPeriod
    ) {
      updateData.estimatedDueDate = this.calculateDueDate(
        updateData.lastMenstrualPeriod,
      );
    }

    Object.assign(pregnancy, updateData);

    // Atualizar idade gestacional
    pregnancy.updateGestationalAge();

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Atualizar idade gestacional de todas as gravidezes ativas
   */
  async updateAllGestationalAges(): Promise<number> {
    const activePregnancies = await this.pregnancyRepository.find({
      where: { status: 'active' },
    });

    for (const pregnancy of activePregnancies) {
      pregnancy.updateGestationalAge();
      await this.pregnancyRepository.save(pregnancy);
    }

    return activePregnancies.length;
  }

  /**
   * Adicionar fator de risco
   */
  async addRiskFactor(
    id: string,
    riskFactor: {
      code: string;
      display: string;
      severity?: 'low' | 'moderate' | 'high';
    },
  ): Promise<Pregnancy> {
    const pregnancy = await this.findById(id);

    pregnancy.riskFactors.push({
      ...riskFactor,
      detectedAt: new Date().toISOString(),
    });

    // Atualizar nível de risco se necessário
    if (
      riskFactor.severity === 'high' ||
      pregnancy.riskFactors.length >= 3
    ) {
      pregnancy.riskLevel = 'alto';
    } else if (pregnancy.riskFactors.length > 0) {
      pregnancy.riskLevel = 'intermediario';
    }

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Remover fator de risco
   */
  async removeRiskFactor(id: string, code: string): Promise<Pregnancy> {
    const pregnancy = await this.findById(id);

    pregnancy.riskFactors = pregnancy.riskFactors.filter(
      (rf) => rf.code !== code,
    );

    // Recalcular nível de risco
    if (pregnancy.riskFactors.length === 0) {
      pregnancy.riskLevel = 'habitual';
    } else if (
      pregnancy.riskFactors.some((rf) => rf.severity === 'high')
    ) {
      pregnancy.riskLevel = 'alto';
    } else {
      pregnancy.riskLevel = 'intermediario';
    }

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Completar gravidez (parto)
   */
  async complete(
    id: string,
    outcomeData: {
      outcomeDate: Date;
      deliveryMethod: 'vaginal' | 'cesarean' | 'forceps' | 'vacuum';
      outcomeNotes?: string;
    },
  ): Promise<Pregnancy> {
    const pregnancy = await this.findById(id);

    if (pregnancy.status !== 'active') {
      throw new BadRequestException('Apenas gravidezes ativas podem ser completadas');
    }

    pregnancy.status = 'completed';
    pregnancy.outcomeDate = outcomeData.outcomeDate;
    pregnancy.deliveryMethod = outcomeData.deliveryMethod;
    pregnancy.outcomeNotes = outcomeData.outcomeNotes || null;

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Terminar gravidez (aborto, perda)
   */
  async terminate(
    id: string,
    terminationData: {
      outcomeDate: Date;
      outcomeNotes: string;
    },
  ): Promise<Pregnancy> {
    const pregnancy = await this.findById(id);

    if (pregnancy.status !== 'active') {
      throw new BadRequestException('Apenas gravidezes ativas podem ser terminadas');
    }

    pregnancy.status = 'terminated';
    pregnancy.outcomeDate = terminationData.outcomeDate;
    pregnancy.outcomeNotes = terminationData.outcomeNotes;

    return await this.pregnancyRepository.save(pregnancy);
  }

  /**
   * Soft delete
   */
  async softDelete(id: string): Promise<void> {
    const pregnancy = await this.findById(id);
    await this.pregnancyRepository.softRemove(pregnancy);
  }

  /**
   * Estatísticas
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    terminated: number;
    byRisk: { habitual: number; intermediario: number; alto: number };
    byTrimester: { first: number; second: number; third: number };
  }> {
    const [total, active, completed, terminated] = await Promise.all([
      this.pregnancyRepository.count(),
      this.pregnancyRepository.count({ where: { status: 'active' } }),
      this.pregnancyRepository.count({ where: { status: 'completed' } }),
      this.pregnancyRepository.count({ where: { status: 'terminated' } }),
    ]);

    const [habitual, intermediario, alto] = await Promise.all([
      this.pregnancyRepository.count({
        where: { status: 'active', riskLevel: 'habitual' },
      }),
      this.pregnancyRepository.count({
        where: { status: 'active', riskLevel: 'intermediario' },
      }),
      this.pregnancyRepository.count({
        where: { status: 'active', riskLevel: 'alto' },
      }),
    ]);

    const activePregnancies = await this.pregnancyRepository.find({
      where: { status: 'active' },
    });

    const byTrimester = activePregnancies.reduce(
      (acc, p) => {
        const trimester = p.getTrimester();
        if (trimester === 1) acc.first++;
        else if (trimester === 2) acc.second++;
        else if (trimester === 3) acc.third++;
        return acc;
      },
      { first: 0, second: 0, third: 0 },
    );

    return {
      total,
      active,
      completed,
      terminated,
      byRisk: { habitual, intermediario, alto },
      byTrimester,
    };
  }

  /**
   * Calcular DPP a partir da DUM (Regra de Naegele)
   * DPP = DUM + 280 dias
   */
  private calculateDueDate(lastMenstrualPeriod: Date): Date {
    const dueDate = new Date(lastMenstrualPeriod);
    dueDate.setDate(dueDate.getDate() + 280);
    return dueDate;
  }
}
