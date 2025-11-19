import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citizen } from '../../entities/citizen.entity';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { Task } from '../../entities/task.entity';
import { CarePlan } from '../../entities/care-plan.entity';
import { Consent } from '../../entities/consent.entity';

export interface TimelineEvent {
  id: string;
  type: 'citizen' | 'pregnancy' | 'task' | 'care_plan' | 'consent';
  action: string; // 'created', 'updated', 'completed', 'cancelled', etc.
  timestamp: Date;
  description: string;
  entityId: string;
  metadata?: any;
}

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(Citizen)
    private readonly citizenRepository: Repository<Citizen>,
    @InjectRepository(Pregnancy)
    private readonly pregnancyRepository: Repository<Pregnancy>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(CarePlan)
    private readonly carePlanRepository: Repository<CarePlan>,
    @InjectRepository(Consent)
    private readonly consentRepository: Repository<Consent>,
  ) {}

  /**
   * Gera timeline completa de um cidadão
   */
  async getCitizenTimeline(
    citizenId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      types?: Array<'citizen' | 'pregnancy' | 'task' | 'care_plan' | 'consent'>;
      limit?: number;
    }
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    const types = options?.types || ['citizen', 'pregnancy', 'task', 'care_plan', 'consent'];

    // Eventos do cidadão
    if (types.includes('citizen')) {
      const citizen = await this.citizenRepository.findOne({
        where: { id: citizenId },
      });

      if (citizen) {
        events.push({
          id: `citizen-created-${citizen.id}`,
          type: 'citizen',
          action: 'created',
          timestamp: citizen.createdAt,
          description: `Cadastro criado: ${citizen.getDisplayName()}`,
          entityId: citizen.id,
          metadata: { fullName: citizen.fullName, cpf: citizen.cpf },
        });

        if (citizen.updatedAt && citizen.updatedAt > citizen.createdAt) {
          events.push({
            id: `citizen-updated-${citizen.id}`,
            type: 'citizen',
            action: 'updated',
            timestamp: citizen.updatedAt,
            description: `Cadastro atualizado`,
            entityId: citizen.id,
          });
        }

        if (citizen.lastAccessAt) {
          events.push({
            id: `citizen-access-${citizen.id}`,
            type: 'citizen',
            action: 'accessed',
            timestamp: citizen.lastAccessAt,
            description: `Último acesso ao sistema`,
            entityId: citizen.id,
          });
        }

        if (citizen.isAnonymized()) {
          events.push({
            id: `citizen-anonymized-${citizen.id}`,
            type: 'citizen',
            action: 'anonymized',
            timestamp: citizen.updatedAt,
            description: `Dados anonimizados (LGPD): ${citizen.dataAnonymizationReason}`,
            entityId: citizen.id,
            metadata: { reason: citizen.dataAnonymizationReason },
          });
        }
      }
    }

    // Eventos de gestações
    if (types.includes('pregnancy')) {
      const pregnancies = await this.pregnancyRepository.find({
        where: { citizenId },
        order: { createdAt: 'DESC' },
      });

      for (const pregnancy of pregnancies) {
        events.push({
          id: `pregnancy-created-${pregnancy.id}`,
          type: 'pregnancy',
          action: 'created',
          timestamp: pregnancy.createdAt,
          description: `Nova gestação iniciada (DUM: ${pregnancy.lastMenstrualPeriod.toLocaleDateString('pt-BR')})`,
          entityId: pregnancy.id,
          metadata: {
            lastMenstrualPeriod: pregnancy.lastMenstrualPeriod,
            estimatedDueDate: pregnancy.estimatedDueDate,
            riskLevel: pregnancy.riskLevel,
          },
        });

        if (pregnancy.status === 'completed' && pregnancy.outcomeDate) {
          events.push({
            id: `pregnancy-completed-${pregnancy.id}`,
            type: 'pregnancy',
            action: 'completed',
            timestamp: pregnancy.outcomeDate,
            description: `Gestação finalizada (${pregnancy.deliveryMethod || 'parto'})`,
            entityId: pregnancy.id,
            metadata: {
              deliveryMethod: pregnancy.deliveryMethod,
              outcomeNotes: pregnancy.outcomeNotes,
            },
          });
        }

        if (pregnancy.status === 'terminated' && pregnancy.outcomeDate) {
          events.push({
            id: `pregnancy-terminated-${pregnancy.id}`,
            type: 'pregnancy',
            action: 'terminated',
            timestamp: pregnancy.outcomeDate,
            description: `Gestação encerrada: ${pregnancy.outcomeNotes || 'Sem detalhes'}`,
            entityId: pregnancy.id,
            metadata: { outcomeNotes: pregnancy.outcomeNotes },
          });
        }

        // Eventos de fatores de risco
        for (const riskFactor of pregnancy.riskFactors || []) {
          if (riskFactor.detectedAt) {
            events.push({
              id: `pregnancy-risk-${pregnancy.id}-${riskFactor.code}`,
              type: 'pregnancy',
              action: 'risk_added',
              timestamp: new Date(riskFactor.detectedAt),
              description: `Fator de risco detectado: ${riskFactor.display}`,
              entityId: pregnancy.id,
              metadata: riskFactor,
            });
          }
        }
      }
    }

    // Eventos de tarefas
    if (types.includes('task')) {
      const pregnancies = await this.pregnancyRepository.find({
        where: { citizenId },
        select: ['id'],
      });

      const pregnancyIds = pregnancies.map(p => p.id);

      if (pregnancyIds.length > 0) {
        const tasks = await this.taskRepository
          .createQueryBuilder('task')
          .where('task.pregnancyId IN (:...pregnancyIds)', { pregnancyIds })
          .orderBy('task.dueDate', 'DESC')
          .getMany();

        for (const task of tasks) {
          events.push({
            id: `task-created-${task.id}`,
            type: 'task',
            action: 'created',
            timestamp: task.createdAt,
            description: `Tarefa agendada: ${task.title}`,
            entityId: task.id,
            metadata: {
              type: task.type,
              dueDate: task.dueDate,
              priority: task.priorityLevel,
            },
          });

          if (task.status === 'completed' && task.completedDate) {
            events.push({
              id: `task-completed-${task.id}`,
              type: 'task',
              action: 'completed',
              timestamp: task.completedDate,
              description: `Tarefa concluída: ${task.title}`,
              entityId: task.id,
              metadata: {
                outcome: task.outcome,
                performedBy: task.performedBy,
              },
            });
          }

          if (task.status === 'cancelled') {
            events.push({
              id: `task-cancelled-${task.id}`,
              type: 'task',
              action: 'cancelled',
              timestamp: task.updatedAt,
              description: `Tarefa cancelada: ${task.title}`,
              entityId: task.id,
              metadata: { cancellationReason: task.cancellationReason },
            });
          }
        }
      }
    }

    // Eventos de planos de cuidado
    if (types.includes('care_plan')) {
      const pregnancies = await this.pregnancyRepository.find({
        where: { citizenId },
        select: ['id'],
      });

      const pregnancyIds = pregnancies.map(p => p.id);

      if (pregnancyIds.length > 0) {
        const carePlans = await this.carePlanRepository
          .createQueryBuilder('carePlan')
          .where('carePlan.pregnancyId IN (:...pregnancyIds)', { pregnancyIds })
          .orderBy('carePlan.startDate', 'DESC')
          .getMany();

        for (const carePlan of carePlans) {
          events.push({
            id: `careplan-created-${carePlan.id}`,
            type: 'care_plan',
            action: 'created',
            timestamp: carePlan.createdAt,
            description: `Plano de cuidado iniciado: ${carePlan.title}`,
            entityId: carePlan.id,
            metadata: {
              startDate: carePlan.startDate,
              endDate: carePlan.endDate,
              status: carePlan.status,
            },
          });

          if (carePlan.status === 'completed') {
            events.push({
              id: `careplan-completed-${carePlan.id}`,
              type: 'care_plan',
              action: 'completed',
              timestamp: carePlan.updatedAt,
              description: `Plano de cuidado finalizado: ${carePlan.title}`,
              entityId: carePlan.id,
            });
          }

          // Eventos de atividades do plano
          for (const activity of carePlan.activities || []) {
            if (activity.completedDate) {
              events.push({
                id: `careplan-activity-${carePlan.id}-${activity.id}`,
                type: 'care_plan',
                action: 'activity_completed',
                timestamp: new Date(activity.completedDate),
                description: `Atividade concluída: ${activity.title}`,
                entityId: carePlan.id,
                metadata: activity,
              });
            }
          }
        }
      }
    }

    // Eventos de consentimentos
    if (types.includes('consent')) {
      const consents = await this.consentRepository.find({
        where: { citizenId },
        order: { createdAt: 'DESC' },
      });

      for (const consent of consents) {
        if (consent.granted && consent.grantedAt) {
          events.push({
            id: `consent-granted-${consent.id}`,
            type: 'consent',
            action: 'granted',
            timestamp: consent.grantedAt,
            description: `Consentimento concedido: ${consent.description}`,
            entityId: consent.id,
            metadata: {
              purpose: consent.purpose,
              termsVersion: consent.termsVersion,
            },
          });
        }

        if (consent.revokedAt) {
          events.push({
            id: `consent-revoked-${consent.id}`,
            type: 'consent',
            action: 'revoked',
            timestamp: consent.revokedAt,
            description: `Consentimento revogado: ${consent.description}`,
            entityId: consent.id,
            metadata: {
              revocationReason: consent.revocationReason,
            },
          });
        }
      }
    }

    // Filtrar por data se especificado
    let filteredEvents = events;
    if (options?.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= options.startDate);
    }
    if (options?.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= options.endDate);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limitar resultados se especificado
    if (options?.limit) {
      filteredEvents = filteredEvents.slice(0, options.limit);
    }

    return filteredEvents;
  }

  /**
   * Gera timeline de uma gestação específica
   */
  async getPregnancyTimeline(pregnancyId: string): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    const pregnancy = await this.pregnancyRepository.findOne({
      where: { id: pregnancyId },
      relations: ['citizen'],
    });

    if (!pregnancy) {
      return [];
    }

    // Evento de criação da gestação
    events.push({
      id: `pregnancy-created-${pregnancy.id}`,
      type: 'pregnancy',
      action: 'created',
      timestamp: pregnancy.createdAt,
      description: `Gestação iniciada para ${pregnancy.citizen.getDisplayName()}`,
      entityId: pregnancy.id,
      metadata: {
        lastMenstrualPeriod: pregnancy.lastMenstrualPeriod,
        estimatedDueDate: pregnancy.estimatedDueDate,
      },
    });

    // Eventos de tarefas
    const tasks = await this.taskRepository.find({
      where: { pregnancyId },
      order: { dueDate: 'DESC' },
    });

    for (const task of tasks) {
      events.push({
        id: `task-${task.id}`,
        type: 'task',
        action: task.status === 'completed' ? 'completed' : 'scheduled',
        timestamp: task.status === 'completed' && task.completedDate ? task.completedDate : task.dueDate,
        description: `${task.status === 'completed' ? 'Concluído' : 'Agendado'}: ${task.title}`,
        entityId: task.id,
        metadata: {
          type: task.type,
          status: task.status,
          outcome: task.outcome,
        },
      });
    }

    // Eventos de planos de cuidado
    const carePlans = await this.carePlanRepository.find({
      where: { pregnancyId },
      order: { startDate: 'DESC' },
    });

    for (const carePlan of carePlans) {
      events.push({
        id: `careplan-${carePlan.id}`,
        type: 'care_plan',
        action: 'created',
        timestamp: carePlan.startDate || carePlan.createdAt,
        description: `Plano iniciado: ${carePlan.title}`,
        entityId: carePlan.id,
        metadata: {
          status: carePlan.status,
          activities: carePlan.activities?.length || 0,
        },
      });
    }

    // Evento de finalização
    if (pregnancy.status === 'completed' && pregnancy.outcomeDate) {
      events.push({
        id: `pregnancy-completed-${pregnancy.id}`,
        type: 'pregnancy',
        action: 'completed',
        timestamp: pregnancy.outcomeDate,
        description: `Parto realizado (${pregnancy.deliveryMethod})`,
        entityId: pregnancy.id,
        metadata: {
          deliveryMethod: pregnancy.deliveryMethod,
          outcomeNotes: pregnancy.outcomeNotes,
        },
      });
    }

    // Ordenar por timestamp
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }

  /**
   * Gera estatísticas da timeline
   */
  async getTimelineStats(citizenId: string) {
    const events = await this.getCitizenTimeline(citizenId);

    const stats = {
      totalEvents: events.length,
      byType: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      firstEvent: events[events.length - 1],
      lastEvent: events[0],
    };

    for (const event of events) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      stats.byAction[event.action] = (stats.byAction[event.action] || 0) + 1;
    }

    return stats;
  }
}
