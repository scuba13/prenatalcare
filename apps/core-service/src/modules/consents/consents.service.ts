import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consent } from '../../entities/consent.entity';

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentRepository: Repository<Consent>,
  ) {}

  async create(consentData: Partial<Consent>): Promise<Consent> {
    const consent = this.consentRepository.create({
      ...consentData,
      grantedAt: consentData.granted ? new Date() : null,
    });

    return await this.consentRepository.save(consent);
  }

  async findAll(page: number | string = 1, limit: number | string = 20) {
    // Garantir que page e limit são números válidos
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.consentRepository.findAndCount({
      skip,
      take: limitNum,
      relations: ['citizen'],
      order: { createdAt: 'DESC' },
    });

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  async findById(id: string): Promise<Consent> {
    const consent = await this.consentRepository.findOne({
      where: { id },
      relations: ['citizen'],
    });

    if (!consent) {
      throw new NotFoundException(`Consentimento com ID ${id} não encontrado`);
    }

    return consent;
  }

  async findByCitizen(citizenId: string): Promise<Consent[]> {
    return await this.consentRepository.find({
      where: { citizenId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByPurpose(citizenId: string, purpose: string): Promise<Consent | null> {
    return await this.consentRepository
      .createQueryBuilder('consent')
      .where('consent.citizenId = :citizenId', { citizenId })
      .andWhere('consent.purpose = :purpose', { purpose })
      .andWhere('consent.granted = :granted', { granted: true })
      .andWhere('consent.revokedAt IS NULL')
      .andWhere('(consent.expiresAt IS NULL OR consent.expiresAt > :now)', { now: new Date() })
      .getOne();
  }

  async hasActiveConsent(citizenId: string, purpose: string): Promise<boolean> {
    const consent = await this.findActiveByPurpose(citizenId, purpose);
    return consent !== null && consent.isActive();
  }

  async grant(citizenId: string, purpose: string, data: Partial<Consent>): Promise<Consent> {
    const consentData: Partial<Consent> = {
      citizenId,
      purpose: purpose as any,
      ...data,
      granted: true,
      grantedAt: new Date(),
    };

    return await this.create(consentData);
  }

  async revoke(id: string, reason?: string, revokedBy?: string): Promise<Consent> {
    const consent = await this.findById(id);

    if (!consent.granted) {
      throw new BadRequestException('Consentimento já foi revogado');
    }

    consent.revoke(reason, revokedBy);
    return await this.consentRepository.save(consent);
  }

  async renew(id: string, grantedBy?: string): Promise<Consent> {
    const consent = await this.findById(id);
    consent.renew(grantedBy);
    return await this.consentRepository.save(consent);
  }

  async findExpiring(daysAhead: number = 30): Promise<Consent[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.consentRepository
      .createQueryBuilder('consent')
      .leftJoinAndSelect('consent.citizen', 'citizen')
      .where('consent.granted = :granted', { granted: true })
      .andWhere('consent.expiresAt BETWEEN :today AND :futureDate', { today, futureDate })
      .orderBy('consent.expiresAt', 'ASC')
      .getMany();
  }

  async findNeedingRenewal(): Promise<Consent[]> {
    const consents = await this.consentRepository.find({
      where: { granted: true, requiresRenewal: true },
      relations: ['citizen'],
    });

    return consents.filter((c) => c.needsRenewal());
  }

  async getStatistics() {
    const [total, granted, revoked, expired] = await Promise.all([
      this.consentRepository.count(),
      this.consentRepository.count({ where: { granted: true } }),
      this.consentRepository
        .createQueryBuilder('consent')
        .where('consent.revokedAt IS NOT NULL')
        .getCount(),
      this.consentRepository
        .createQueryBuilder('consent')
        .where('consent.expiresAt < :now', { now: new Date() })
        .getCount(),
    ]);

    return { total, granted, revoked, expired };
  }

  async softDelete(id: string): Promise<void> {
    const consent = await this.findById(id);
    await this.consentRepository.softRemove(consent);
  }
}
