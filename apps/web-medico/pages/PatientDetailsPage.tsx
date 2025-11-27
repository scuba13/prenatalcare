import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCitizenById } from '../services/citizens.service';
import { getActivePregnancy, getPregnancyTimeline } from '../services/pregnancies.service';
import { getTasksByPregnancy } from '../services/tasks.service';
import { getObservations } from '../services/clinical-observations.service';
import { queryKeys } from '../lib/query-client';
import {
  formatDate,
  formatCPF,
  formatPhone,
  formatGestationalAge,
  getTrimesterLabel,
  getTrimester,
  getRiskColor,
  getRiskLabel,
  cn,
} from '../lib/utils';
import type { Citizen, Pregnancy, Task, ClinicalObservation, TimelineEvent } from '../types';

type TabType = 'resumo' | 'gravidez' | 'consultas' | 'exames' | 'timeline';

const PatientDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('resumo');

  // Buscar dados da cidadã
  const {
    data: citizen,
    isLoading: loadingCitizen,
    error: errorCitizen,
  } = useQuery({
    queryKey: queryKeys.citizen(id!),
    queryFn: () => getCitizenById(id!),
    enabled: !!id,
  });

  // Buscar gestação ativa
  const {
    data: pregnancy,
    isLoading: loadingPregnancy,
  } = useQuery({
    queryKey: queryKeys.pregnancyCitizen(id!),
    queryFn: () => getActivePregnancy(id!),
    enabled: !!id,
  });

  // Buscar timeline
  const { data: timeline } = useQuery({
    queryKey: [...queryKeys.pregnancyTimeline(pregnancy?.id || ''), 'timeline'],
    queryFn: () => getPregnancyTimeline(pregnancy!.id),
    enabled: !!pregnancy?.id,
  });

  // Buscar tarefas/consultas
  const { data: tasks } = useQuery({
    queryKey: [...queryKeys.tasks, pregnancy?.id, 'all'],
    queryFn: () => getTasksByPregnancy(pregnancy!.id),
    enabled: !!pregnancy?.id,
  });

  // Buscar observações clínicas (exames)
  const { data: observations } = useQuery({
    queryKey: [...queryKeys.observations, pregnancy?.id],
    queryFn: () => getObservations({ pregnancyId: pregnancy!.id }),
    enabled: !!pregnancy?.id,
  });

  if (loadingCitizen || loadingPregnancy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#9db8b5]">Carregando dados da paciente...</p>
        </div>
      </div>
    );
  }

  if (errorCitizen || !citizen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        <p className="text-white text-xl">Paciente não encontrada</p>
        <button
          onClick={() => navigate('/patients')}
          className="px-6 py-2 bg-primary text-[#111817] rounded-lg font-bold"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  const riskColor = pregnancy ? getRiskColor(pregnancy.riskLevel) : 'gray';
  const riskLabel = pregnancy ? getRiskLabel(pregnancy.riskLevel) : 'Sem gestação';
  const trimester = pregnancy ? getTrimester(pregnancy.gestationalWeeks) : null;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'gravidez', label: 'Gravidez' },
    { key: 'consultas', label: 'Consultas' },
    { key: 'exames', label: 'Exames' },
    { key: 'timeline', label: 'Timeline' },
  ];

  // Filtrar tarefas por tipo
  const consultations = tasks?.filter((t) => t.type === 'consultation') || [];
  const exams = tasks?.filter((t) => ['exam', 'ultrasound'].includes(t.type)) || [];
  const vaccines = tasks?.filter((t) => t.type === 'vaccine') || [];

  return (
    <div className="flex flex-col items-center p-4 md:p-8 w-full max-w-[1200px] mx-auto">
      {/* Header Bar */}
      <div className="flex w-full justify-between items-center mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-white hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-medium">Voltar</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="w-full bg-[#1c2625] rounded-xl border border-[#3c5350] p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Avatar & Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start lg:items-center">
            <div className="h-32 w-32 rounded-full bg-[#293836] border-2 border-[#3c5350] flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-[#9db8b5]">person</span>
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {citizen.socialName || citizen.fullName}
              </h1>
              <p className="text-[#9db8b5] mt-1">
                {calculateAge(citizen.birthDate)} anos | CPF: {formatCPF(citizen.cpf)}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3 text-sm text-[#9db8b5]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">phone</span>
                  {formatPhone(citizen.mobilePhone)}
                </span>
                {citizen.email && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">mail</span>
                    {citizen.email}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border',
                    `bg-${riskColor}-500/10 text-${riskColor}-400 border-${riskColor}-500/20`
                  )}
                >
                  <span className={`size-2 rounded-full bg-${riskColor}-400`}></span>
                  Risco {riskLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          {pregnancy && (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:ml-8">
              <div className="bg-[#111817] p-4 rounded-lg border border-[#3c5350]">
                <p className="text-[#9db8b5] text-sm font-medium mb-1">Idade Gestacional</p>
                <p className="text-white text-xl font-bold">
                  {formatGestationalAge(pregnancy.gestationalWeeks, pregnancy.gestationalDays)}
                </p>
              </div>
              <div className="bg-[#111817] p-4 rounded-lg border border-[#3c5350]">
                <p className="text-[#9db8b5] text-sm font-medium mb-1">Data Provável do Parto</p>
                <p className="text-white text-xl font-bold">{formatDate(pregnancy.estimatedDueDate)}</p>
              </div>
              <div className="bg-[#111817] p-4 rounded-lg border border-[#3c5350]">
                <p className="text-[#9db8b5] text-sm font-medium mb-1">Trimestre</p>
                <p className="text-white text-xl font-bold">{getTrimesterLabel(trimester)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sync Status & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-[#3c5350]">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-green-400 text-lg">verified</span>
            <span className="text-[#9db8b5]">Dados sincronizados com RNDS/DATASUS</span>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none h-10 px-4 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-lg">edit</span>
              Editar Cadastro
            </button>
            <button className="flex-1 md:flex-none h-10 px-4 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-lg">calendar_add_on</span>
              Agendar
            </button>
            <button
              onClick={() => navigate(`/patients/${id}/consultation/new`)}
              className="flex-1 md:flex-none h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-[#111817] text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-lg font-semibold">add_circle</span>
              Registrar Consulta
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="w-full mb-6 border-b border-[#3c5350]">
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-2',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#9db8b5] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'resumo' && (
          <TabResumo citizen={citizen} pregnancy={pregnancy} />
        )}
        {activeTab === 'gravidez' && pregnancy && (
          <TabGravidez pregnancy={pregnancy} />
        )}
        {activeTab === 'consultas' && (
          <TabConsultas consultations={consultations} patientId={id!} />
        )}
        {activeTab === 'exames' && (
          <TabExames exams={exams} vaccines={vaccines} observations={observations || []} />
        )}
        {activeTab === 'timeline' && (
          <TabTimeline events={timeline?.events || []} />
        )}
      </div>
    </div>
  );
};

// ==========================================
// Tab Components
// ==========================================

interface TabResumoProps {
  citizen: Citizen;
  pregnancy: Pregnancy | null;
}

const TabResumo: React.FC<TabResumoProps> = ({ citizen, pregnancy }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        {/* Dados Cadastrais */}
        <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
          <h3 className="text-white font-bold text-lg mb-4">Dados Cadastrais</h3>
          <div className="space-y-3">
            <DataRow label="Nome Completo" value={citizen.fullName} />
            <DataRow label="Data de Nasc." value={formatDate(citizen.birthDate)} />
            <DataRow label="CPF" value={formatCPF(citizen.cpf)} />
            {citizen.cns && <DataRow label="CNS" value={citizen.cns} />}
            {citizen.address && (
              <DataRow
                label="Endereço"
                value={`${citizen.address.line[0]}, ${citizen.address.line[1]} - ${citizen.address.line[3]}, ${citizen.address.city}/${citizen.address.state}`}
              />
            )}
          </div>
        </div>

        {/* Contato Emergência */}
        <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
          <h3 className="text-white font-bold text-lg mb-4">Dados Clínicos</h3>
          <div className="space-y-3">
            <DataRow label="Tipo Sanguíneo" value={citizen.bloodType || 'Não informado'} />
            <div className="flex flex-col gap-1">
              <span className="text-[#9db8b5] text-sm">Alergias</span>
              <div className="flex flex-wrap gap-2">
                {citizen.allergies.length > 0 ? (
                  citizen.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full"
                    >
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span className="text-white text-sm">Nenhuma</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#9db8b5] text-sm">Condições Crônicas</span>
              <div className="flex flex-wrap gap-2">
                {citizen.chronicConditions.length > 0 ? (
                  citizen.chronicConditions.map((condition, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full"
                    >
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="text-white text-sm">Nenhuma</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Gestação Atual */}
        {pregnancy && (
          <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
            <h3 className="text-white font-bold text-lg mb-4">Gestação Atual</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="DUM" value={formatDate(pregnancy.lastMenstrualPeriod)} />
              <StatCard label="DPP" value={formatDate(pregnancy.estimatedDueDate)} />
              <StatCard
                label="Fórmula Obstétrica"
                value={`G${pregnancy.gravida}P${pregnancy.para}C${pregnancy.cesarean}A${pregnancy.abortions}`}
              />
              <StatCard label="Tipo" value={getPregnancyTypeLabel(pregnancy.pregnancyType)} />
            </div>
          </div>
        )}

        {/* Fatores de Risco */}
        {pregnancy && pregnancy.riskFactors.length > 0 && (
          <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
            <h3 className="text-white font-bold text-lg mb-4">Fatores de Risco</h3>
            <div className="flex flex-wrap gap-2">
              {pregnancy.riskFactors.map((factor, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium border',
                    factor.severity === 'high'
                      ? 'bg-red-500/20 text-red-400 border-red-500/20'
                      : factor.severity === 'moderate'
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                  )}
                >
                  {factor.display}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Medicações */}
        {pregnancy && pregnancy.medications.length > 0 && (
          <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
            <h3 className="text-white font-bold text-lg mb-4">Medicações em Uso</h3>
            <div className="space-y-3">
              {pregnancy.medications.map((med, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#293836] rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{med.name}</p>
                    <p className="text-[#9db8b5] text-sm">
                      {med.dose} - {med.frequency}
                    </p>
                  </div>
                  <span className="text-[#9db8b5] text-sm">
                    Desde {formatDate(med.startDate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TabGravidezProps {
  pregnancy: Pregnancy;
}

const TabGravidez: React.FC<TabGravidezProps> = ({ pregnancy }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dados da Gestação */}
      <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
        <h3 className="text-white font-bold text-lg mb-4">Dados da Gestação</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataRow label="DUM (Data da Última Menstruação)" value={formatDate(pregnancy.lastMenstrualPeriod)} />
          <DataRow label="DPP (Data Provável do Parto)" value={formatDate(pregnancy.estimatedDueDate)} />
          <DataRow
            label="Idade Gestacional"
            value={formatGestationalAge(pregnancy.gestationalWeeks, pregnancy.gestationalDays)}
          />
          <DataRow
            label="Trimestre"
            value={getTrimesterLabel(getTrimester(pregnancy.gestationalWeeks))}
          />
          <DataRow label="Tipo de Gestação" value={getPregnancyTypeLabel(pregnancy.pregnancyType)} />
          <DataRow label="Status" value={getPregnancyStatusLabel(pregnancy.status)} />
        </div>
      </div>

      {/* Histórico Obstétrico */}
      <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
        <h3 className="text-white font-bold text-lg mb-4">Histórico Obstétrico</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#293836] p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-white">{pregnancy.gravida}</p>
            <p className="text-[#9db8b5] text-sm">Gestações</p>
          </div>
          <div className="bg-[#293836] p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-white">{pregnancy.para}</p>
            <p className="text-[#9db8b5] text-sm">Partos</p>
          </div>
          <div className="bg-[#293836] p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-white">{pregnancy.cesarean}</p>
            <p className="text-[#9db8b5] text-sm">Cesáreas</p>
          </div>
          <div className="bg-[#293836] p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-white">{pregnancy.abortions}</p>
            <p className="text-[#9db8b5] text-sm">Abortos</p>
          </div>
          <div className="bg-[#293836] p-4 rounded-lg text-center col-span-2">
            <p className="text-3xl font-bold text-white">{pregnancy.liveBirths}</p>
            <p className="text-[#9db8b5] text-sm">Nascidos Vivos</p>
          </div>
        </div>
      </div>

      {/* Vacinas */}
      <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
        <h3 className="text-white font-bold text-lg mb-4">Vacinação</h3>
        {pregnancy.vaccinations.length > 0 ? (
          <div className="space-y-3">
            {pregnancy.vaccinations.map((vac, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-[#293836] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">vaccines</span>
                  <div>
                    <p className="text-white font-medium">{vac.name}</p>
                    <p className="text-[#9db8b5] text-sm">{vac.dose}</p>
                  </div>
                </div>
                <span className="text-[#9db8b5] text-sm">{formatDate(vac.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#9db8b5]">Nenhuma vacina registrada</p>
        )}
      </div>

      {/* Dados Antropométricos */}
      <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
        <h3 className="text-white font-bold text-lg mb-4">Dados Antropométricos</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataRow
            label="Peso Pré-Gestacional"
            value={pregnancy.prePregnancyWeight ? `${pregnancy.prePregnancyWeight} kg` : 'Não informado'}
          />
          <DataRow
            label="Altura"
            value={pregnancy.height ? `${pregnancy.height} cm` : 'Não informado'}
          />
          {pregnancy.prePregnancyWeight && pregnancy.height && (
            <DataRow
              label="IMC Pré-Gestacional"
              value={calculateIMC(pregnancy.prePregnancyWeight, pregnancy.height)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface TabConsultasProps {
  consultations: Task[];
  patientId: string;
}

const TabConsultas: React.FC<TabConsultasProps> = ({ consultations, patientId }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">Histórico de Consultas</h3>
        <button
          onClick={() => navigate(`/patients/${patientId}/consultation/new`)}
          className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-[#111817] text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nova Consulta
        </button>
      </div>

      {consultations.length > 0 ? (
        <div className="bg-[#1c2625] rounded-lg border border-[#3c5350] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#3c5350] text-xs uppercase bg-[#293836]">
              <tr>
                <th className="px-6 py-4 font-bold text-white">Data</th>
                <th className="px-6 py-4 font-bold text-white">Semana Gest.</th>
                <th className="px-6 py-4 font-bold text-white">Tipo</th>
                <th className="px-6 py-4 font-bold text-white">Status</th>
                <th className="px-6 py-4 font-bold text-white text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c5350]">
              {consultations.map((consultation) => (
                <tr key={consultation.id} className="hover:bg-[#293836] transition-colors">
                  <td className="px-6 py-4 text-white">
                    {formatDate(consultation.dueDate || consultation.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-[#9db8b5]">
                    {consultation.gestationalWeekAtCreation
                      ? `${consultation.gestationalWeekAtCreation}ª semana`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-[#9db8b5]">{consultation.title}</td>
                  <td className="px-6 py-4">
                    <TaskStatusBadge status={consultation.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-primary hover:text-primary/80 text-sm font-medium">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#1c2625] p-12 rounded-lg border border-[#3c5350] text-center">
          <span className="material-symbols-outlined text-5xl text-[#9db8b5] mb-4">event_note</span>
          <p className="text-[#9db8b5]">Nenhuma consulta registrada</p>
        </div>
      )}
    </div>
  );
};

interface TabExamesProps {
  exams: Task[];
  vaccines: Task[];
  observations: ClinicalObservation[];
}

const TabExames: React.FC<TabExamesProps> = ({ exams, vaccines, observations }) => {
  const [filter, setFilter] = useState<'all' | 'exams' | 'vaccines' | 'observations'>('all');

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="flex gap-3">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'exams', label: 'Exames' },
          { key: 'vaccines', label: 'Vacinas' },
          { key: 'observations', label: 'Observações' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-primary text-[#111817]'
                : 'bg-[#293836] text-white hover:bg-[#3c5350]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Exames */}
      {(filter === 'all' || filter === 'exams') && (
        <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
          <h3 className="text-white font-bold text-lg mb-4">Exames Solicitados</h3>
          {exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 bg-[#293836] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-400">biotech</span>
                    <div>
                      <p className="text-white font-medium">{exam.title}</p>
                      {exam.description && (
                        <p className="text-[#9db8b5] text-sm">{exam.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#9db8b5] text-sm">
                      {exam.dueDate ? formatDate(exam.dueDate) : 'Sem prazo'}
                    </span>
                    <TaskStatusBadge status={exam.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#9db8b5]">Nenhum exame solicitado</p>
          )}
        </div>
      )}

      {/* Vacinas */}
      {(filter === 'all' || filter === 'vaccines') && (
        <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
          <h3 className="text-white font-bold text-lg mb-4">Vacinas Pendentes</h3>
          {vaccines.length > 0 ? (
            <div className="space-y-3">
              {vaccines.map((vaccine) => (
                <div
                  key={vaccine.id}
                  className="flex items-center justify-between p-4 bg-[#293836] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-400">vaccines</span>
                    <div>
                      <p className="text-white font-medium">{vaccine.title}</p>
                      {vaccine.description && (
                        <p className="text-[#9db8b5] text-sm">{vaccine.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#9db8b5] text-sm">
                      {vaccine.dueDate ? formatDate(vaccine.dueDate) : 'Sem prazo'}
                    </span>
                    <TaskStatusBadge status={vaccine.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#9db8b5]">Nenhuma vacina pendente</p>
          )}
        </div>
      )}

      {/* Observações Clínicas */}
      {(filter === 'all' || filter === 'observations') && (
        <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
          <h3 className="text-white font-bold text-lg mb-4">Observações Clínicas</h3>
          {observations.length > 0 ? (
            <div className="space-y-3">
              {observations.slice(0, 10).map((obs) => (
                <div
                  key={obs.id}
                  className="flex items-center justify-between p-4 bg-[#293836] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-400">monitoring</span>
                    <div>
                      <p className="text-white font-medium">{obs.display}</p>
                      <p className="text-[#9db8b5] text-sm">
                        {obs.value} {obs.unit}
                      </p>
                    </div>
                  </div>
                  <span className="text-[#9db8b5] text-sm">
                    {formatDate(obs.effectiveDateTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#9db8b5]">Nenhuma observação registrada</p>
          )}
        </div>
      )}
    </div>
  );
};

interface TabTimelineProps {
  events: TimelineEvent[];
}

const TabTimeline: React.FC<TabTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return { icon: 'stethoscope', color: 'text-blue-400' };
      case 'exam':
        return { icon: 'biotech', color: 'text-purple-400' };
      case 'vaccine':
        return { icon: 'vaccines', color: 'text-green-400' };
      case 'observation':
        return { icon: 'monitoring', color: 'text-cyan-400' };
      case 'alert':
        return { icon: 'warning', color: 'text-red-400' };
      case 'task':
        return { icon: 'task_alt', color: 'text-yellow-400' };
      default:
        return { icon: 'event', color: 'text-gray-400' };
    }
  };

  return (
    <div className="bg-[#1c2625] p-6 rounded-lg border border-[#3c5350]">
      <h3 className="text-white font-bold text-lg mb-6">Timeline da Gestação</h3>

      {events.length > 0 ? (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#3c5350]"></div>

          <div className="space-y-6">
            {events.map((event, index) => {
              const { icon, color } = getEventIcon(event.type);
              return (
                <div key={event.id || index} className="relative pl-12">
                  {/* Círculo */}
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#293836] border-2 border-[#3c5350] flex items-center justify-center">
                    <span className={cn('material-symbols-outlined text-lg', color)}>{icon}</span>
                  </div>

                  {/* Conteúdo */}
                  <div className="bg-[#293836] p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-[#9db8b5] text-sm mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[#9db8b5] text-sm">{formatDate(event.date)}</p>
                        {event.gestationalWeek && (
                          <p className="text-[#9db8b5] text-xs">
                            {event.gestationalWeek}ª semana
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-[#9db8b5] mb-4">timeline</span>
          <p className="text-[#9db8b5]">Nenhum evento registrado na timeline</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Helper Components
// ==========================================

const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-[#9db8b5] text-sm">{label}</span>
    <span className="text-white text-sm font-medium text-right ml-4">{value}</span>
  </div>
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#293836] p-4 rounded-lg">
    <p className="text-[#9db8b5] text-sm mb-1">{label}</p>
    <p className="text-white font-bold">{value}</p>
  </div>
);

const TaskStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/20';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
      case 'overdue':
        return 'bg-red-500/20 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        getStatusStyle()
      )}
    >
      {getStatusLabel()}
    </span>
  );
};

// ==========================================
// Helper Functions
// ==========================================

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateIMC(weight: number, height: number): string {
  const heightInMeters = height / 100;
  const imc = weight / (heightInMeters * heightInMeters);
  return imc.toFixed(1);
}

function getPregnancyTypeLabel(type: string): string {
  switch (type) {
    case 'singleton':
      return 'Única';
    case 'twin':
      return 'Gemelar';
    case 'triplet':
      return 'Trigêmeos';
    case 'multiple':
      return 'Múltipla';
    default:
      return type;
  }
}

function getPregnancyStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'completed':
      return 'Concluída';
    case 'terminated':
      return 'Interrompida';
    default:
      return status;
  }
}

export default PatientDetailsPage;
