import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../../entities/citizen.entity';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { Task } from '../../entities/task.entity';

export interface DashboardStats {
  totalPatients: number;
  activePregnancies: number;
  todayAppointments: number;
  highRiskPatients: number;
  pendingExams: number;
  pendingTasks: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(Pregnancy)
    private readonly pregnancyRepository: Repository<Pregnancy>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    // Total de pacientes ativos
    const totalPatients = await this.citizenRepository.count({
      where: { active: true },
    });

    // Gestações ativas (não finalizadas)
    const activePregnancies = await this.pregnancyRepository.count({
      where: { status: 'active' },
    });

    // Pacientes de alto risco
    const highRiskPatients = await this.pregnancyRepository.count({
      where: {
        status: 'active',
        riskLevel: 'alto',
      },
    });

    // Tarefas pendentes
    const pendingTasks = await this.taskRepository.count({
      where: { status: 'pending' },
    });

    // Exames pendentes (tasks do tipo exam)
    const pendingExams = await this.taskRepository.count({
      where: {
        status: 'pending',
        type: 'exam',
      },
    });

    // Consultas de hoje - simplificado (pode ser expandido se houver tabela de appointments no core)
    const todayAppointments = 0; // Isso vem do scheduling-service

    return {
      totalPatients,
      activePregnancies,
      todayAppointments,
      highRiskPatients,
      pendingExams,
      pendingTasks,
    };
  }
}
