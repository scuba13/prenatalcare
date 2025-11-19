import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';
import { AvailabilityFiltersDto } from './dtos/availability-filters.dto';
import { AppointmentResult, AvailableSlot } from './types/appointment-result.type';

/**
 * Interface padrão que todos os adapters de agendamento devem implementar.
 *
 * Esta interface garante que qualquer sistema hospitalar possa ser integrado
 * de forma consistente, independente do protocolo usado (REST, SOAP, GraphQL, etc.)
 *
 * Implementações:
 * - MockSchedulingAdapter: Simulação para desenvolvimento/testes
 * - HospitalAAdapter: Integração com Hospital A (REST)
 * - HospitalBAdapter: Integração com Hospital B (SOAP)
 */
export interface ISchedulingAdapter {
  /**
   * Cria um novo agendamento no sistema externo
   * @param data Dados do agendamento
   * @returns Resultado da criação com ID externo
   */
  createAppointment(data: CreateAppointmentDto): Promise<AppointmentResult>;

  /**
   * Atualiza um agendamento existente
   * @param externalId ID do agendamento no sistema externo
   * @param data Dados a serem atualizados
   * @returns Resultado da atualização
   */
  updateAppointment(
    externalId: string,
    data: UpdateAppointmentDto,
  ): Promise<AppointmentResult>;

  /**
   * Cancela um agendamento
   * @param externalId ID do agendamento no sistema externo
   * @param reason Motivo do cancelamento (opcional)
   * @returns void em caso de sucesso, throw em caso de erro
   */
  cancelAppointment(externalId: string, reason?: string): Promise<void>;

  /**
   * Busca um agendamento por ID externo
   * @param externalId ID do agendamento no sistema externo
   * @returns Dados do agendamento
   */
  getAppointment(externalId: string): Promise<AppointmentResult>;

  /**
   * Verifica disponibilidade de horários
   * @param filters Filtros para busca (data, profissional, etc.)
   * @returns Lista de slots disponíveis
   */
  checkAvailability(filters: AvailabilityFiltersDto): Promise<AvailableSlot[]>;

  /**
   * Health check do sistema externo
   * @returns true se o sistema está acessível, false caso contrário
   */
  healthCheck(): Promise<boolean>;

  /**
   * Nome do adapter (usado para identificação e logs)
   */
  readonly name: string;
}
