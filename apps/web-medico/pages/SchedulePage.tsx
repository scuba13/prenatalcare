import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAppointments } from '../services/appointments.service';
import { queryKeys } from '../lib/query-client';
import { getAppointmentStatusColor, getAppointmentStatusLabel } from '../lib/utils';
import type { Appointment } from '../types';

type ViewMode = 'day' | 'week' | 'month';

const SchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Calcular range de datas baseado na view
  const getDateRange = () => {
    if (viewMode === 'day') {
      return {
        startDate: format(selectedDate, 'yyyy-MM-dd'),
        endDate: format(selectedDate, 'yyyy-MM-dd'),
      };
    }
    if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
      };
    }
    // Month
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    return {
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [...queryKeys.appointments, startDate, endDate],
    queryFn: () => getAppointments({ startDate, endDate }),
  });

  // Gerar dias da semana para a view semanal
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return addDays(weekStart, i);
  });

  // Horários de atendimento
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minutes = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  // Filtrar appointments por dia
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduledAt);
      return isSameDay(aptDate, date);
    });
  };

  // Navegar entre períodos
  const navigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1;
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, delta));
    } else if (viewMode === 'week') {
      setSelectedDate(addDays(selectedDate, delta * 7));
    } else {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1));
    }
  };

  // Renderizar appointment na grade
  const renderAppointment = (apt: Appointment) => {
    const statusColor = getAppointmentStatusColor(apt.status);
    const statusLabel = getAppointmentStatusLabel(apt.status);
    const time = format(parseISO(apt.scheduledAt), 'HH:mm');

    return (
      <div
        key={apt.id}
        className={`p-2 rounded-lg text-xs cursor-pointer transition-colors border border-${statusColor}-500/30 bg-${statusColor}-500/10 hover:bg-${statusColor}-500/20`}
      >
        <div className="font-medium text-white truncate">{time}</div>
        <div className="text-gray-300 truncate">{apt.notes || 'Consulta Pré-Natal'}</div>
        <span
          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-${statusColor}-500/20 text-${statusColor}-300`}
        >
          {statusLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Agenda</h1>

        {/* View Mode Toggles */}
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-primary text-[#111817]'
                  : 'bg-[#293836] text-white hover:bg-[#3c5350]'
              }`}
            >
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('prev')}
          className="p-2 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white transition-colors"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {viewMode === 'day' && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            {viewMode === 'week' &&
              `${format(weekDays[0], 'dd/MM')} - ${format(weekDays[6], 'dd/MM/yyyy')}`}
            {viewMode === 'month' && format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>

        <button
          onClick={() => navigate('next')}
          className="p-2 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white transition-colors"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Today Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setSelectedDate(new Date())}
          className="px-4 py-2 rounded-lg bg-[#293836] text-primary text-sm font-medium hover:bg-[#3c5350] transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Week View */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto rounded-xl border border-[#3c5350] bg-[#1c2625]">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-[#293836]">
                    <th className="p-3 text-left text-sm font-medium text-[#9db8b5] w-20 border-r border-[#3c5350]">
                      Hora
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`p-3 text-center text-sm font-medium border-r border-[#3c5350] last:border-r-0 ${
                          isSameDay(day, new Date()) ? 'bg-primary/10 text-primary' : 'text-white'
                        }`}
                      >
                        <div>{format(day, 'EEE', { locale: ptBR })}</div>
                        <div className="text-lg font-bold">{format(day, 'dd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3c5350]">
                  {timeSlots.map((time) => (
                    <tr key={time} className="hover:bg-white/5">
                      <td className="p-2 text-sm text-[#9db8b5] border-r border-[#3c5350] text-center">
                        {time}
                      </td>
                      {weekDays.map((day) => {
                        const dayAppointments = getAppointmentsForDay(day).filter((apt) => {
                          const aptTime = format(parseISO(apt.scheduledAt), 'HH:mm');
                          return aptTime === time;
                        });

                        return (
                          <td
                            key={day.toISOString()}
                            className={`p-1 border-r border-[#3c5350] last:border-r-0 min-h-[60px] align-top ${
                              isSameDay(day, new Date()) ? 'bg-primary/5' : ''
                            }`}
                          >
                            {dayAppointments.map(renderAppointment)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <div className="rounded-xl border border-[#3c5350] bg-[#1c2625] overflow-hidden">
              <div className="divide-y divide-[#3c5350]">
                {timeSlots.map((time) => {
                  const dayAppointments = getAppointmentsForDay(selectedDate).filter((apt) => {
                    const aptTime = format(parseISO(apt.scheduledAt), 'HH:mm');
                    return aptTime === time;
                  });

                  return (
                    <div key={time} className="flex hover:bg-white/5">
                      <div className="w-20 p-4 text-sm text-[#9db8b5] border-r border-[#3c5350] text-center flex-shrink-0">
                        {time}
                      </div>
                      <div className="flex-1 p-2 min-h-[60px]">
                        <div className="flex flex-wrap gap-2">
                          {dayAppointments.map(renderAppointment)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1 rounded-xl border border-[#3c5350] bg-[#1c2625] p-2">
              {/* Day headers */}
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-[#9db8b5]">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {(() => {
                const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                const startDay = (monthStart.getDay() + 6) % 7; // Adjust for Monday start

                const days = [];

                // Empty cells before month start
                for (let i = 0; i < startDay; i++) {
                  days.push(<div key={`empty-${i}`} className="p-2 min-h-[80px]"></div>);
                }

                // Days of the month
                for (let d = 1; d <= monthEnd.getDate(); d++) {
                  const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
                  const dayAppointments = getAppointmentsForDay(date);
                  const isToday = isSameDay(date, new Date());

                  days.push(
                    <div
                      key={d}
                      className={`p-2 min-h-[80px] rounded-lg border ${
                        isToday
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-white'}`}
                      >
                        {d}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className="text-[10px] p-1 rounded bg-primary/20 text-primary truncate"
                          >
                            {format(parseISO(apt.scheduledAt), 'HH:mm')}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-[10px] text-[#9db8b5]">
                            +{dayAppointments.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return days;
              })()}
            </div>
          )}
        </>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {[
          { status: 'PENDING', label: 'Pendente' },
          { status: 'CONFIRMED', label: 'Confirmada' },
          { status: 'IN_PROGRESS', label: 'Em Andamento' },
          { status: 'COMPLETED', label: 'Concluída' },
          { status: 'CANCELLED', label: 'Cancelada' },
        ].map(({ status, label }) => {
          const color = getAppointmentStatusColor(status as Appointment['status']);
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
              <span className="text-sm text-[#9db8b5]">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulePage;
