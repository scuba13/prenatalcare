import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalObservation } from '../../entities/clinical-observation.entity';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';

@Injectable()
export class ObservationsService {
  constructor(
    @InjectRepository(ClinicalObservation)
    private readonly observationRepository: Repository<ClinicalObservation>,
  ) {}

  async create(createObservationDto: CreateObservationDto): Promise<ClinicalObservation> {
    const observation = this.observationRepository.create(createObservationDto);
    return this.observationRepository.save(observation);
  }

  async findAll(filters?: {
    citizenId?: string;
    pregnancyId?: string;
    loincCode?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ClinicalObservation[]> {
    const query = this.observationRepository.createQueryBuilder('observation');

    if (filters?.citizenId) {
      query.andWhere('observation.citizenId = :citizenId', { citizenId: filters.citizenId });
    }

    if (filters?.pregnancyId) {
      query.andWhere('observation.pregnancyId = :pregnancyId', { pregnancyId: filters.pregnancyId });
    }

    if (filters?.loincCode) {
      query.andWhere('observation.loincCode = :loincCode', { loincCode: filters.loincCode });
    }

    if (filters?.category) {
      query.andWhere('observation.category = :category', { category: filters.category });
    }

    if (filters?.startDate) {
      query.andWhere('observation.effectiveDateTime >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('observation.effectiveDateTime <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('observation.effectiveDateTime', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<ClinicalObservation> {
    const observation = await this.observationRepository.findOne({
      where: { id },
      relations: ['citizen', 'pregnancy'],
    });

    if (!observation) {
      throw new NotFoundException(`Observation with ID "${id}" not found`);
    }

    return observation;
  }

  async update(id: string, updateObservationDto: UpdateObservationDto): Promise<ClinicalObservation> {
    const observation = await this.findOne(id);
    Object.assign(observation, updateObservationDto);
    return this.observationRepository.save(observation);
  }

  async remove(id: string): Promise<void> {
    const observation = await this.findOne(id);
    await this.observationRepository.softRemove(observation);
  }

  // Métodos específicos para tipos de observações

  async getVitalSigns(citizenId: string, pregnancyId?: string): Promise<ClinicalObservation[]> {
    return this.findAll({
      citizenId,
      pregnancyId,
      category: 'vital-signs',
    });
  }

  async getLabResults(citizenId: string, pregnancyId?: string): Promise<ClinicalObservation[]> {
    return this.findAll({
      citizenId,
      pregnancyId,
      category: 'laboratory',
    });
  }

  async getLatestByLoincCode(citizenId: string, loincCode: string): Promise<ClinicalObservation | null> {
    return this.observationRepository.findOne({
      where: {
        citizenId,
        loincCode,
      },
      order: {
        effectiveDateTime: 'DESC',
      },
    });
  }

  async getObservationHistory(
    citizenId: string,
    loincCode: string,
    limit = 10,
  ): Promise<ClinicalObservation[]> {
    return this.observationRepository.find({
      where: {
        citizenId,
        loincCode,
      },
      order: {
        effectiveDateTime: 'DESC',
      },
      take: limit,
    });
  }

  async getAbnormalResults(citizenId: string, pregnancyId?: string): Promise<ClinicalObservation[]> {
    const query = this.observationRepository
      .createQueryBuilder('observation')
      .where('observation.citizenId = :citizenId', { citizenId })
      .andWhere('observation.interpretation IS NOT NULL')
      .andWhere('observation.interpretation != :normal', { normal: 'N' });

    if (pregnancyId) {
      query.andWhere('observation.pregnancyId = :pregnancyId', { pregnancyId });
    }

    query.orderBy('observation.effectiveDateTime', 'DESC');

    return query.getMany();
  }

  async getCriticalResults(citizenId: string, pregnancyId?: string): Promise<ClinicalObservation[]> {
    const query = this.observationRepository
      .createQueryBuilder('observation')
      .where('observation.citizenId = :citizenId', { citizenId })
      .andWhere('observation.interpretation IN (:...critical)', { critical: ['LL', 'HH', 'AA'] });

    if (pregnancyId) {
      query.andWhere('observation.pregnancyId = :pregnancyId', { pregnancyId });
    }

    query.orderBy('observation.effectiveDateTime', 'DESC');

    return query.getMany();
  }
}
