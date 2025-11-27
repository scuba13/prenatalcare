import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getTodayAppointments, getAlerts } from '../services/dashboard.service';
import { queryKeys } from '../lib/query-client';
import { getCurrentUser } from '../lib/auth';
import { getGreeting, formatDateLong, cn } from '../lib/utils';
import type { DashboardStats, Alert } from '../types';
import type { TodayAppointment } from '../services/dashboard.service';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const greeting = getGreeting();
  const today = formatDateLong(new Date());

  // Buscar estatísticas
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: getDashboardStats,
    // Fallback para dados mockados enquanto API não está disponível
    placeholderData: {
      totalPatients: 0,
      activePregnancies: 0,
      todayAppointments: 0,
      highRiskPatients: 0,
      pendingExams: 0,
      pendingTasks: 0,
    } as DashboardStats,
  });

  // Buscar consultas de hoje
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: queryKeys.todayAppointments,
    queryFn: getTodayAppointments,
    placeholderData: [] as TodayAppointment[],
  });

  // Buscar alertas
  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: queryKeys.alerts,
    queryFn: getAlerts,
    placeholderData: [] as Alert[],
  });

  const statCards = [
    {
      label: 'Gestantes Ativas',
      value: stats?.activePregnancies ?? stats?.totalPatients ?? 0,
      style: 'default' as const,
    },
    {
      label: 'Consultas Hoje',
      value: stats?.todayAppointments ?? appointments?.length ?? 0,
      style: 'default' as const,
    },
    {
      label: 'Alto Risco',
      value: stats?.highRiskPatients ?? 0,
      style: 'warning' as const,
    },
    {
      label: 'Exames Pendentes',
      value: stats?.pendingExams ?? 0,
      style: 'default' as const,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* PageHeading */}
      <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
        <div className="flex flex-col gap-1">
          <p className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
            {greeting}, {user?.name?.split(' ')[0] || 'Doutor'}!
          </p>
          <p className="text-[#9db8b5] text-base font-normal leading-normal capitalize">{today}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={cn(
              'flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border transition-all',
              stat.style === 'warning'
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-[#3c5350] bg-[#1c2625]',
              loadingStats && 'animate-pulse'
            )}
          >
            <p
              className={cn(
                'text-base font-medium leading-normal',
                stat.style === 'warning' ? 'text-amber-300' : 'text-white'
              )}
            >
              {stat.label}
            </p>
            <p className="text-white tracking-light text-4xl font-bold leading-tight">
              {loadingStats ? '-' : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          {/* SectionHeader for Table */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
              Consultas de Hoje
            </h2>
            <Link to="/schedule" className="text-primary text-sm font-medium hover:underline">
              Ver todas
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-[#3c5350] bg-[#1c2625]">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#293836]">
                      <th className="px-6 py-4 text-left text-white text-sm font-medium leading-normal">
                        Paciente
                      </th>
                      <th className="px-6 py-4 text-left text-white text-sm font-medium leading-normal">
                        Horário
                      </th>
                      <th className="px-6 py-4 text-left text-white text-sm font-medium leading-normal">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3c5350]">
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => navigate(`/patients/${appointment.patientId}`)}
                      >
                        <td className="px-6 py-4 text-white text-sm font-normal leading-normal">
                          {appointment.patientName || 'Paciente'}
                        </td>
                        <td className="px-6 py-4 text-[#9db8b5] text-sm font-normal leading-normal">
                          {formatTime(appointment.scheduledAt)}
                        </td>
                        <td className="px-6 py-4">
                          <AppointmentStatusBadge status={appointment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-[#9db8b5] mb-2">
                  event_available
                </span>
                <p className="text-[#9db8b5]">Nenhuma consulta agendada para hoje</p>
                <Link
                  to="/schedule"
                  className="mt-4 text-primary text-sm font-medium hover:underline"
                >
                  Ver agenda completa
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Urgent Alerts Section */}
        <div className="flex flex-col gap-4">
          <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Alertas Urgentes
          </h2>

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-12 rounded-xl border border-[#3c5350] bg-[#1c2625]">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="flex flex-col gap-4 p-6 rounded-xl border border-red-500/50 bg-red-500/10">
              {alerts.map((alert, idx) => (
                <React.Fragment key={alert.id}>
                  {idx > 0 && <div className="w-full border-t border-red-500/20"></div>}
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        'material-symbols-outlined mt-1',
                        alert.type === 'critical'
                          ? 'text-red-400'
                          : alert.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      )}
                    >
                      {alert.type === 'critical'
                        ? 'error'
                        : alert.type === 'warning'
                        ? 'warning'
                        : 'info'}
                    </span>
                    <div className="flex flex-col">
                      <p className="text-white text-sm font-medium">{alert.title}</p>
                      <p
                        className={cn(
                          'text-sm',
                          alert.type === 'critical'
                            ? 'text-red-300'
                            : alert.type === 'warning'
                            ? 'text-amber-300'
                            : 'text-blue-300'
                        )}
                      >
                        {alert.message}
                        {alert.patientName && (
                          <>
                            {' '}
                            - <span className="font-semibold">{alert.patientName}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-[#3c5350] bg-[#1c2625] text-center">
              <span className="material-symbols-outlined text-4xl text-green-400 mb-2">
                check_circle
              </span>
              <p className="text-[#9db8b5]">Nenhum alerta urgente</p>
              <p className="text-[#9db8b5] text-sm mt-1">Tudo sob controle!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] mb-4">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/patients/new"
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-[#3c5350] bg-[#1c2625] hover:bg-[#293836] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl text-primary">person_add</span>
            <span className="text-white text-sm font-medium text-center">Nova Gestante</span>
          </Link>
          <Link
            to="/schedule"
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-[#3c5350] bg-[#1c2625] hover:bg-[#293836] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl text-primary">calendar_month</span>
            <span className="text-white text-sm font-medium text-center">Ver Agenda</span>
          </Link>
          <Link
            to="/patients"
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-[#3c5350] bg-[#1c2625] hover:bg-[#293836] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl text-primary">groups</span>
            <span className="text-white text-sm font-medium text-center">Listar Gestantes</span>
          </Link>
          <button
            onClick={() => {
              /* TODO: Abrir modal de busca */
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-[#3c5350] bg-[#1c2625] hover:bg-[#293836] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl text-primary">search</span>
            <span className="text-white text-sm font-medium text-center">Buscar Paciente</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const AppointmentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-300 border-green-500/20';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/20';
      case 'CONFIRMED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/20';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
      case 'CANCELLED':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/20';
      case 'NO_SHOW':
        return 'bg-red-500/20 text-red-300 border-red-500/20';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/20';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluída';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'PENDING':
        return 'Agendada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'NO_SHOW':
        return 'Não Compareceu';
      default:
        return status;
    }
  };

  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', getStyle())}
    >
      {getLabel()}
    </span>
  );
};

// Helper Functions
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default DashboardPage;
