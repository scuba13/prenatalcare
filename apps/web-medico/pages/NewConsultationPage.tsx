import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCitizenById } from '../services/citizens.service';
import { getActivePregnancy } from '../services/pregnancies.service';
import { createTask, createBulkTasks, PRENATAL_EXAM_TEMPLATES } from '../services/tasks.service';
import { createConsultationVitalSigns } from '../services/clinical-observations.service';
import { queryKeys } from '../lib/query-client';
import {
  formatDate,
  formatGestationalAge,
  getTrimesterLabel,
  getTrimester,
  cn,
} from '../lib/utils';
import type { CreateTaskDto } from '../types';

// Schema de validação
const consultationSchema = z.object({
  // Sinais Vitais
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(40).max(150).optional(),
  weight: z.number().min(30).max(200).optional(),
  uterineHeight: z.number().min(5).max(50).optional(),
  fetalHeartRate: z.number().min(60).max(200).optional(),
  edema: z.enum(['absent', 'mild', 'moderate', 'severe']).default('absent'),

  // Exame Físico
  physicalExamNotes: z.string().optional(),

  // Condutas
  requestedExams: z.array(z.string()).default([]),
  prescriptions: z.string().optional(),
  referrals: z.string().optional(),
  orientations: z.string().optional(),

  // Próxima Consulta
  nextAppointmentDate: z.string().optional(),
  nextAppointmentType: z.enum(['routine', 'return', 'urgent']).default('routine'),
  nextAppointmentNotes: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

const NewConsultationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Buscar dados do paciente
  const { data: citizen } = useQuery({
    queryKey: queryKeys.citizen(patientId!),
    queryFn: () => getCitizenById(patientId!),
    enabled: !!patientId,
  });

  // Buscar gestação ativa
  const { data: pregnancy } = useQuery({
    queryKey: queryKeys.pregnancyCitizen(patientId!),
    queryFn: () => getActivePregnancy(patientId!),
    enabled: !!patientId,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      edema: 'absent',
      requestedExams: [],
      nextAppointmentType: 'routine',
    },
  });

  const selectedExams = watch('requestedExams');

  // Mutation para criar observações clínicas
  const createObservationsMutation = useMutation({
    mutationFn: (data: {
      pregnancyId: string;
      vitalSigns: Parameters<typeof createConsultationVitalSigns>[1];
    }) => createConsultationVitalSigns(data.pregnancyId, data.vitalSigns),
  });

  // Mutation para criar tarefas
  const createTasksMutation = useMutation({
    mutationFn: createBulkTasks,
  });

  // Mutation para criar consulta
  const createConsultationMutation = useMutation({
    mutationFn: createTask,
  });

  const handleExamToggle = (examCode: string) => {
    const current = selectedExams || [];
    if (current.includes(examCode)) {
      setValue(
        'requestedExams',
        current.filter((e) => e !== examCode)
      );
    } else {
      setValue('requestedExams', [...current, examCode]);
    }
  };

  const onSubmit = async (data: ConsultationFormData) => {
    if (!pregnancy?.id) {
      setSubmitError('Paciente não possui gestação ativa');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const now = new Date().toISOString();

      // 1. Registrar observações clínicas (sinais vitais)
      if (
        data.bloodPressureSystolic ||
        data.bloodPressureDiastolic ||
        data.weight ||
        data.uterineHeight ||
        data.fetalHeartRate
      ) {
        await createObservationsMutation.mutateAsync({
          pregnancyId: pregnancy.id,
          vitalSigns: {
            effectiveDateTime: now,
            bloodPressure:
              data.bloodPressureSystolic && data.bloodPressureDiastolic
                ? {
                    systolic: data.bloodPressureSystolic,
                    diastolic: data.bloodPressureDiastolic,
                  }
                : undefined,
            weight: data.weight,
            uterineHeight: data.uterineHeight,
            fetalHeartRate: data.fetalHeartRate,
            edema: data.edema,
          },
        });
      }

      // 2. Criar tarefa de consulta
      await createConsultationMutation.mutateAsync({
        pregnancyId: pregnancy.id,
        type: 'consultation',
        title: 'Consulta Pré-Natal',
        description: data.physicalExamNotes || undefined,
        status: 'completed',
        priorityLevel: 'medium',
        completedAt: now,
        gestationalWeekAtCreation: pregnancy.gestationalWeeks,
        metadata: {
          vitalSigns: {
            bloodPressure:
              data.bloodPressureSystolic && data.bloodPressureDiastolic
                ? `${data.bloodPressureSystolic}x${data.bloodPressureDiastolic}`
                : null,
            weight: data.weight,
            uterineHeight: data.uterineHeight,
            fetalHeartRate: data.fetalHeartRate,
            edema: data.edema,
          },
          prescriptions: data.prescriptions,
          referrals: data.referrals,
          orientations: data.orientations,
        },
      });

      // 3. Criar tarefas de exames solicitados
      if (data.requestedExams && data.requestedExams.length > 0) {
        const examTasks: CreateTaskDto[] = data.requestedExams.map((examCode) => {
          const template = PRENATAL_EXAM_TEMPLATES.find((t) => t.code === examCode);
          return {
            pregnancyId: pregnancy.id,
            type: template?.type || 'exam',
            title: template?.title || examCode,
            status: 'pending',
            priorityLevel: 'medium',
            gestationalWeekAtCreation: pregnancy.gestationalWeeks,
          };
        });

        await createTasksMutation.mutateAsync(examTasks);
      }

      // 4. Criar agendamento da próxima consulta se informado
      if (data.nextAppointmentDate) {
        await createConsultationMutation.mutateAsync({
          pregnancyId: pregnancy.id,
          type: 'consultation',
          title: `Consulta ${getAppointmentTypeLabel(data.nextAppointmentType)}`,
          description: data.nextAppointmentNotes || undefined,
          status: 'pending',
          priorityLevel: data.nextAppointmentType === 'urgent' ? 'high' : 'medium',
          dueDate: data.nextAppointmentDate,
          gestationalWeekAtCreation: pregnancy.gestationalWeeks,
        });
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.observations });
      queryClient.invalidateQueries({ queryKey: queryKeys.pregnancyTimeline(pregnancy.id) });

      // Navegar de volta para detalhes do paciente
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Erro ao salvar consulta:', error);
      setSubmitError('Erro ao salvar consulta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/patients')}
          className="text-[#9db8b5] hover:text-primary"
        >
          Pacientes
        </button>
        <span className="text-[#9db8b5]">/</span>
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="text-[#9db8b5] hover:text-primary"
        >
          {citizen?.socialName || citizen?.fullName || 'Carregando...'}
        </button>
        <span className="text-[#9db8b5]">/</span>
        <span className="font-medium text-white">Nova Consulta</span>
      </div>

      {/* Header */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-black tracking-tight text-white mb-1">
          Registrar Nova Consulta
        </h1>
        <p className="text-[#9db8b5]">
          Paciente: {citizen?.socialName || citizen?.fullName || 'Carregando...'}
          {pregnancy && (
            <>
              {' | '}IG: {formatGestationalAge(pregnancy.gestationalWeeks, pregnancy.gestationalDays)}
              {' | '}
              {getTrimesterLabel(getTrimester(pregnancy.gestationalWeeks))}
            </>
          )}
        </p>
      </div>

      {submitError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-400">error</span>
          <p className="text-red-400">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        {/* Sinais Vitais */}
        <section className="bg-[#1c2625] border border-[#3c5350] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Sinais Vitais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">
                Pressão Arterial Sistólica (mmHg)
              </span>
              <input
                type="number"
                placeholder="120"
                {...register('bloodPressureSystolic', { valueAsNumber: true })}
                className={cn(
                  'form-input bg-[#111817] border rounded-lg p-3 text-white placeholder-gray-500 focus:ring-1 outline-none transition-colors',
                  errors.bloodPressureSystolic
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[#3c5350] focus:border-primary focus:ring-primary'
                )}
              />
              {errors.bloodPressureSystolic && (
                <span className="text-red-400 text-xs">Valor inválido (60-250)</span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">
                Pressão Arterial Diastólica (mmHg)
              </span>
              <input
                type="number"
                placeholder="80"
                {...register('bloodPressureDiastolic', { valueAsNumber: true })}
                className={cn(
                  'form-input bg-[#111817] border rounded-lg p-3 text-white placeholder-gray-500 focus:ring-1 outline-none transition-colors',
                  errors.bloodPressureDiastolic
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[#3c5350] focus:border-primary focus:ring-primary'
                )}
              />
              {errors.bloodPressureDiastolic && (
                <span className="text-red-400 text-xs">Valor inválido (40-150)</span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Peso Atual (kg)</span>
              <input
                type="number"
                step="0.1"
                placeholder="68.5"
                {...register('weight', { valueAsNumber: true })}
                className={cn(
                  'form-input bg-[#111817] border rounded-lg p-3 text-white placeholder-gray-500 focus:ring-1 outline-none transition-colors',
                  errors.weight
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[#3c5350] focus:border-primary focus:ring-primary'
                )}
              />
              {errors.weight && (
                <span className="text-red-400 text-xs">Valor inválido (30-200)</span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Altura Uterina (cm)</span>
              <input
                type="number"
                placeholder="22"
                {...register('uterineHeight', { valueAsNumber: true })}
                className={cn(
                  'form-input bg-[#111817] border rounded-lg p-3 text-white placeholder-gray-500 focus:ring-1 outline-none transition-colors',
                  errors.uterineHeight
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[#3c5350] focus:border-primary focus:ring-primary'
                )}
              />
              {errors.uterineHeight && (
                <span className="text-red-400 text-xs">Valor inválido (5-50)</span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Batimentos Cardiofetais (BCF)</span>
              <input
                type="number"
                placeholder="140"
                {...register('fetalHeartRate', { valueAsNumber: true })}
                className={cn(
                  'form-input bg-[#111817] border rounded-lg p-3 text-white placeholder-gray-500 focus:ring-1 outline-none transition-colors',
                  errors.fetalHeartRate
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[#3c5350] focus:border-primary focus:ring-primary'
                )}
              />
              {errors.fetalHeartRate && (
                <span className="text-red-400 text-xs">Valor inválido (60-200)</span>
              )}
            </label>

            <div className="flex flex-col gap-2 sm:col-span-2 md:col-span-1">
              <span className="text-sm font-medium text-white">Edema</span>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { value: 'absent', label: 'Ausente' },
                  { value: 'mild', label: '+' },
                  { value: 'moderate', label: '++' },
                  { value: 'severe', label: '+++' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('edema')}
                      className="text-primary bg-[#111817] border-[#3c5350] focus:ring-primary"
                    />
                    <span className="text-sm text-gray-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Exame Físico */}
        <section className="bg-[#1c2625] border border-[#3c5350] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Exame Físico</h3>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white">Observações e achados</span>
            <textarea
              rows={4}
              {...register('physicalExamNotes')}
              className="form-textarea bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
              placeholder="Descreva aqui os achados do exame físico..."
            ></textarea>
          </label>
        </section>

        {/* Condutas */}
        <section className="bg-[#1c2625] border border-[#3c5350] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Condutas</h3>
          <div className="flex flex-col gap-6">
            {/* Solicitação de Exames */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Solicitação de Exames</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {PRENATAL_EXAM_TEMPLATES.map((exam) => (
                  <label
                    key={exam.code}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                      selectedExams?.includes(exam.code)
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-[#111817] border-[#3c5350] hover:border-[#4a6360]'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedExams?.includes(exam.code) || false}
                      onChange={() => handleExamToggle(exam.code)}
                      className="rounded text-primary bg-[#111817] border-[#3c5350] focus:ring-primary"
                    />
                    <span
                      className={cn(
                        'text-sm',
                        selectedExams?.includes(exam.code) ? 'text-white' : 'text-gray-300'
                      )}
                    >
                      {exam.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Prescrição de Medicamentos</span>
              <textarea
                rows={3}
                {...register('prescriptions')}
                className="form-textarea bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                placeholder="Ex: Sulfato ferroso 200mg, 1 comprimido ao dia..."
              ></textarea>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Encaminhamentos</span>
              <textarea
                rows={2}
                {...register('referrals')}
                className="form-textarea bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                placeholder="Ex: Encaminhamento para nutricionista..."
              ></textarea>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Orientações</span>
              <textarea
                rows={3}
                {...register('orientations')}
                className="form-textarea bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                placeholder="Ex: Aumentar a ingestão de líquidos, relatar sinais de alerta..."
              ></textarea>
            </label>
          </div>
        </section>

        {/* Próxima Consulta */}
        <section className="bg-[#1c2625] border border-[#3c5350] rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">Próxima Consulta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Data Sugerida</span>
              <input
                type="date"
                {...register('nextAppointmentDate')}
                className="form-input bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">Tipo</span>
              <select
                {...register('nextAppointmentType')}
                className="form-select bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              >
                <option value="routine">Rotina</option>
                <option value="return">Retorno</option>
                <option value="urgent">Urgência</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-white">Observações</span>
              <textarea
                rows={2}
                {...register('nextAppointmentNotes')}
                className="form-textarea bg-[#111817] border border-[#3c5350] rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                placeholder="Instruções para a próxima consulta..."
              ></textarea>
            </label>
          </div>
        </section>

        {/* Footer Actions */}
        <footer className="fixed bottom-0 left-0 right-0 bg-[#1c2625] border-t border-[#3c5350] p-4 z-20 md:static md:bg-transparent md:border-t-0 md:p-0">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row-reverse items-center gap-4">
            <div className="flex gap-4 w-full md:w-auto">
              <button
                type="button"
                onClick={() => navigate(`/patients/${patientId}`)}
                disabled={isSubmitting}
                className="h-12 flex-1 md:flex-none px-8 rounded-lg border border-[#3c5350] text-white font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 flex-1 md:flex-none px-8 rounded-lg bg-primary text-[#111817] font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#111817] border-t-transparent rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar Consulta'
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9db8b5] md:mr-auto">
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Dados serão sincronizados com a RNDS/DATASUS ao salvar.</span>
            </div>
          </div>
        </footer>
        {/* Spacer for mobile fixed footer */}
        <div className="h-20 md:hidden"></div>
      </form>
    </div>
  );
};

function getAppointmentTypeLabel(type: string): string {
  switch (type) {
    case 'routine':
      return 'Rotina';
    case 'return':
      return 'Retorno';
    case 'urgent':
      return 'Urgência';
    default:
      return type;
  }
}

export default NewConsultationPage;
