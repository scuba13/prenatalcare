import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { Task } from '../../entities/task.entity';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  createdAt: string;
  read: boolean;
}

interface GetAlertsOptions {
  unread?: boolean;
  limit?: number;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Pregnancy)
    private readonly pregnancyRepository: Repository<Pregnancy>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async getAlerts(options: GetAlertsOptions = {}): Promise<Alert[]> {
    const { limit = 10 } = options;
    const alerts: Alert[] = [];

    // Buscar gestações de alto risco
    const highRiskPregnancies = await this.pregnancyRepository.find({
      where: {
        status: 'active',
        riskLevel: 'alto',
      },
      relations: ['citizen'],
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    for (const pregnancy of highRiskPregnancies) {
      alerts.push({
        id: `preg-${pregnancy.id}`,
        type: 'critical',
        title: 'Gestação de Alto Risco',
        message: `Paciente ${pregnancy.citizen?.fullName || 'Desconhecido'} requer atenção especial`,
        patientId: pregnancy.citizenId,
        patientName: pregnancy.citizen?.fullName,
        createdAt: pregnancy.updatedAt?.toISOString() || new Date().toISOString(),
        read: false,
      });
    }

    // Buscar tarefas atrasadas
    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.pregnancy', 'pregnancy')
      .leftJoinAndSelect('pregnancy.citizen', 'citizen')
      .where('task.status = :status', { status: 'pending' })
      .andWhere('task.dueDate < :now', { now: new Date() })
      .orderBy('task.dueDate', 'ASC')
      .take(limit)
      .getMany();

    for (const task of overdueTasks) {
      alerts.push({
        id: `task-${task.id}`,
        type: 'warning',
        title: `Tarefa Atrasada: ${task.title}`,
        message: task.description || 'Tarefa pendente com prazo vencido',
        patientId: task.pregnancy?.citizenId,
        patientName: task.pregnancy?.citizen?.fullName,
        createdAt: task.dueDate?.toISOString() || new Date().toISOString(),
        read: false,
      });
    }

    // Ordenar por data e limitar
    return alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async markAsRead(alertId: string): Promise<{ success: boolean }> {
    // Por enquanto, apenas retorna sucesso
    // Em uma implementação completa, teríamos uma tabela de alerts
    return { success: true };
  }
}
