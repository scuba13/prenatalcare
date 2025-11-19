import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Task } from '../../entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async create(taskData: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(taskData);
    return await this.taskRepository.save(task);
  }

  async findAll(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.pregnancy', 'pregnancy')
      .leftJoinAndSelect('pregnancy.citizen', 'citizen')
      .skip(skip)
      .take(limit)
      .orderBy('task.dueDate', 'ASC');

    if (status) {
      query.where('task.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['pregnancy', 'pregnancy.citizen'],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${id} não encontrada`);
    }

    return task;
  }

  async findByPregnancy(pregnancyId: string, status?: string): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.pregnancyId = :pregnancyId', { pregnancyId })
      .orderBy('task.dueDate', 'ASC');

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    return await query.getMany();
  }

  async findPending(pregnancyId?: string): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: 'pending' })
      .orderBy('task.dueDate', 'ASC');

    if (pregnancyId) {
      query.andWhere('task.pregnancyId = :pregnancyId', { pregnancyId });
    }

    return await query.getMany();
  }

  async findOverdue(): Promise<Task[]> {
    const today = new Date();
    return await this.taskRepository.find({
      where: {
        status: 'pending',
        dueDate: LessThan(today),
      },
      relations: ['pregnancy', 'pregnancy.citizen'],
      order: { dueDate: 'ASC' },
    });
  }

  async findDueSoon(daysAhead: number = 7): Promise<Task[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.pregnancy', 'pregnancy')
      .leftJoinAndSelect('pregnancy.citizen', 'citizen')
      .where('task.status IN (:...statuses)', { statuses: ['pending', 'in-progress'] })
      .andWhere('task.dueDate BETWEEN :today AND :futureDate', { today, futureDate })
      .orderBy('task.dueDate', 'ASC')
      .getMany();
  }

  async update(id: string, updateData: Partial<Task>): Promise<Task> {
    const task = await this.findById(id);
    Object.assign(task, updateData);
    return await this.taskRepository.save(task);
  }

  async complete(id: string, data?: { performedBy?: string; outcome?: any; notes?: string }): Promise<Task> {
    const task = await this.findById(id);
    task.complete(data?.performedBy, data?.outcome, data?.notes);
    return await this.taskRepository.save(task);
  }

  async cancel(id: string, reason: string): Promise<Task> {
    const task = await this.findById(id);
    task.cancel(reason);
    return await this.taskRepository.save(task);
  }

  async markOverdue(id: string): Promise<Task> {
    const task = await this.findById(id);
    task.markAsOverdue();
    return await this.taskRepository.save(task);
  }

  async markAllOverdueAsOverdue(): Promise<number> {
    const overdueTasks = await this.findOverdue();
    for (const task of overdueTasks) {
      task.status = 'overdue';
      await this.taskRepository.save(task);
    }
    return overdueTasks.length;
  }

  async sendReminder(id: string): Promise<Task> {
    const task = await this.findById(id);
    task.reminderSent = true;
    task.reminderSentAt = new Date();
    return await this.taskRepository.save(task);
  }

  async softDelete(id: string): Promise<void> {
    const task = await this.findById(id);
    await this.taskRepository.softRemove(task);
  }

  async getStatistics() {
    const [total, pending, completed, cancelled, overdue] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { status: 'pending' } }),
      this.taskRepository.count({ where: { status: 'completed' } }),
      this.taskRepository.count({ where: { status: 'cancelled' } }),
      this.taskRepository.count({ where: { status: 'overdue' } }),
    ]);

    return { total, pending, completed, cancelled, overdue };
  }
}
