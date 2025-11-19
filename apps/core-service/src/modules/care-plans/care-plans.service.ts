import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarePlan } from '../../entities/care-plan.entity';

@Injectable()
export class CarePlansService {
  constructor(
    @InjectRepository(CarePlan)
    private readonly carePlanRepository: Repository<CarePlan>,
  ) {}

  async create(carePlanData: Partial<CarePlan>): Promise<CarePlan> {
    const carePlan = this.carePlanRepository.create(carePlanData);
    return await this.carePlanRepository.save(carePlan);
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.carePlanRepository.findAndCount({
      skip,
      take: limit,
      relations: ['pregnancy', 'pregnancy.citizen'],
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<CarePlan> {
    const carePlan = await this.carePlanRepository.findOne({
      where: { id },
      relations: ['pregnancy', 'pregnancy.citizen'],
    });

    if (!carePlan) {
      throw new NotFoundException(`Plano de Cuidado com ID ${id} não encontrado`);
    }

    return carePlan;
  }

  async findByPregnancy(pregnancyId: string): Promise<CarePlan[]> {
    return await this.carePlanRepository.find({
      where: { pregnancyId },
      order: { startDate: 'DESC' },
    });
  }

  async findActive(pregnancyId: string): Promise<CarePlan | null> {
    const today = new Date();
    return await this.carePlanRepository
      .createQueryBuilder('carePlan')
      .where('carePlan.pregnancyId = :pregnancyId', { pregnancyId })
      .andWhere('carePlan.status = :status', { status: 'active' })
      .andWhere('carePlan.startDate <= :today', { today })
      .andWhere('carePlan.endDate >= :today', { today })
      .getOne();
  }

  async update(id: string, updateData: Partial<CarePlan>): Promise<CarePlan> {
    const carePlan = await this.findById(id);
    Object.assign(carePlan, updateData);
    return await this.carePlanRepository.save(carePlan);
  }

  async addActivity(id: string, activity: any): Promise<CarePlan> {
    const carePlan = await this.findById(id);
    carePlan.activities.push({ id: crypto.randomUUID(), ...activity });
    return await this.carePlanRepository.save(carePlan);
  }

  async updateActivity(id: string, activityId: string, updates: any): Promise<CarePlan> {
    const carePlan = await this.findById(id);
    const activityIndex = carePlan.activities.findIndex((a) => a.id === activityId);

    if (activityIndex === -1) {
      throw new NotFoundException(`Atividade ${activityId} não encontrada`);
    }

    carePlan.activities[activityIndex] = {
      ...carePlan.activities[activityIndex],
      ...updates,
    };

    return await this.carePlanRepository.save(carePlan);
  }

  async completeActivity(id: string, activityId: string): Promise<CarePlan> {
    return await this.updateActivity(id, activityId, {
      status: 'completed',
      completedDate: new Date().toISOString(),
    });
  }

  async addGoal(id: string, goal: any): Promise<CarePlan> {
    const carePlan = await this.findById(id);
    carePlan.goals.push({ id: crypto.randomUUID(), ...goal });
    return await this.carePlanRepository.save(carePlan);
  }

  async activate(id: string): Promise<CarePlan> {
    return await this.update(id, { status: 'active' });
  }

  async complete(id: string): Promise<CarePlan> {
    return await this.update(id, { status: 'completed' });
  }

  async cancel(id: string): Promise<CarePlan> {
    return await this.update(id, { status: 'cancelled' });
  }

  async softDelete(id: string): Promise<void> {
    const carePlan = await this.findById(id);
    await this.carePlanRepository.softRemove(carePlan);
  }
}
