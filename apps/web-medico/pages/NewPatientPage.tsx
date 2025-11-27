import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createCitizen, searchPatientInRNDS } from '../services/citizens.service';
import { createPregnancy } from '../services/pregnancies.service';
import { queryClient, queryKeys } from '../lib/query-client';
import {
  formatCPF,
  unformatCPF,
  formatPhone,
  unformatPhone,
  formatCEP,
  unformatCEP,
  isValidCPF,
  calculateDueDate,
} from '../lib/utils';
import type { BloodType, RiskLevel, PregnancyType, Address } from '../types';

// Schema de validação
const patientSchema = z.object({
  // Dados Pessoais
  cpf: z.string().min(11, 'CPF inválido').refine((val) => isValidCPF(unformatCPF(val)), 'CPF inválido'),
  cns: z.string().optional(),
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  socialName: z.string().optional(),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  mobilePhone: z.string().min(10, 'Telefone inválido'),
  homePhone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  motherName: z.string().optional(),

  // Endereço
  postalCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),

  // Dados Clínicos
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),

  // Dados da Gravidez
  lastMenstrualPeriod: z.string().min(1, 'DUM é obrigatória'),
  prePregnancyWeight: z.number().optional(),
  height: z.number().optional(),
  gravida: z.number().min(1).default(1),
  para: z.number().min(0).default(0),
  cesarean: z.number().min(0).default(0),
  abortions: z.number().min(0).default(0),
  pregnancyType: z.string().default('singleton'),
  riskLevel: z.string().default('habitual'),
});

type PatientFormData = z.infer<typeof patientSchema>;

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const NewPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [rndsLoading, setRndsLoading] = useState(false);
  const [rndsMessage, setRndsMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');

  const tabs = [
    '1. Dados Pessoais',
    '2. Endereço',
    '3. Dados Clínicos',
    '4. Dados da Gravidez',
  ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gravida: 1,
      para: 0,
      cesarean: 0,
      abortions: 0,
      pregnancyType: 'singleton',
      riskLevel: 'habitual',
      allergies: [],
      chronicConditions: [],
    },
  });

  const watchDUM = watch('lastMenstrualPeriod');
  const watchAllergies = watch('allergies') || [];
  const watchConditions = watch('chronicConditions') || [];

  // Calcular DPP quando DUM mudar
  const estimatedDueDate = watchDUM ? calculateDueDate(watchDUM) : null;

  // Mutation para criar paciente
  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      // 1. Criar cidadã
      const address: Address | undefined =
        data.street && data.city && data.state
          ? {
              line: [data.street, data.number || '', data.complement || '', data.neighborhood || ''],
              city: data.city,
              state: data.state,
              postalCode: unformatCEP(data.postalCode || ''),
            }
          : undefined;

      const citizen = await createCitizen({
        cpf: unformatCPF(data.cpf),
        cns: data.cns || undefined,
        fullName: data.fullName,
        socialName: data.socialName || undefined,
        birthDate: data.birthDate,
        mobilePhone: unformatPhone(data.mobilePhone),
        homePhone: data.homePhone ? unformatPhone(data.homePhone) : undefined,
        email: data.email || undefined,
        motherName: data.motherName || undefined,
        address,
        bloodType: (data.bloodType as BloodType) || undefined,
        allergies: data.allergies || [],
        chronicConditions: data.chronicConditions || [],
      });

      // 2. Criar gestação
      const pregnancy = await createPregnancy({
        citizenId: citizen.id,
        lastMenstrualPeriod: data.lastMenstrualPeriod,
        prePregnancyWeight: data.prePregnancyWeight,
        height: data.height,
        gravida: data.gravida,
        para: data.para,
        cesarean: data.cesarean,
        abortions: data.abortions,
        pregnancyType: data.pregnancyType as PregnancyType,
        riskLevel: data.riskLevel as RiskLevel,
      });

      return { citizen, pregnancy };
    },
    onSuccess: (data) => {
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: queryKeys.citizens });
      queryClient.invalidateQueries({ queryKey: queryKeys.pregnancies });

      // Navegar para detalhes da paciente
      navigate(`/patients/${data.citizen.id}`);
    },
  });

  // Buscar dados na RNDS
  const handleSearchRNDS = async () => {
    const cpf = getValues('cpf');
    if (!cpf || !isValidCPF(unformatCPF(cpf))) {
      setRndsMessage({ type: 'error', text: 'Digite um CPF válido para buscar na RNDS' });
      return;
    }

    setRndsLoading(true);
    setRndsMessage(null);

    try {
      const result = await searchPatientInRNDS(unformatCPF(cpf));

      if (result.found && result.patient) {
        // Preencher dados do formulário
        setValue('fullName', result.patient.fullName);
        setValue('birthDate', result.patient.birthDate);
        if (result.patient.cns) setValue('cns', result.patient.cns);
        if (result.patient.motherName) setValue('motherName', result.patient.motherName);

        if (result.patient.address) {
          setValue('street', result.patient.address.line[0]);
          setValue('number', result.patient.address.line[1]);
          setValue('complement', result.patient.address.line[2]);
          setValue('neighborhood', result.patient.address.line[3]);
          setValue('city', result.patient.address.city);
          setValue('state', result.patient.address.state);
          setValue('postalCode', formatCEP(result.patient.address.postalCode));
        }

        setRndsMessage({ type: 'success', text: 'Dados carregados da RNDS com sucesso!' });
      } else {
        setRndsMessage({
          type: 'info',
          text: result.message || 'Paciente não encontrado na RNDS. Preencha os dados manualmente.',
        });
      }
    } catch (error) {
      setRndsMessage({ type: 'error', text: 'Erro ao buscar dados na RNDS. Tente novamente.' });
    } finally {
      setRndsLoading(false);
    }
  };

  // Buscar CEP
  const handleSearchCEP = async () => {
    const cep = getValues('postalCode');
    if (!cep || unformatCEP(cep).length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${unformatCEP(cep)}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue('street', data.logradouro);
        setValue('neighborhood', data.bairro);
        setValue('city', data.localidade);
        setValue('state', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  // Adicionar alergia
  const handleAddAllergy = () => {
    if (allergiesInput.trim()) {
      setValue('allergies', [...watchAllergies, allergiesInput.trim()]);
      setAllergiesInput('');
    }
  };

  // Remover alergia
  const handleRemoveAllergy = (index: number) => {
    setValue(
      'allergies',
      watchAllergies.filter((_, i) => i !== index)
    );
  };

  // Adicionar condição
  const handleAddCondition = () => {
    if (conditionsInput.trim()) {
      setValue('chronicConditions', [...watchConditions, conditionsInput.trim()]);
      setConditionsInput('');
    }
  };

  // Remover condição
  const handleRemoveCondition = (index: number) => {
    setValue(
      'chronicConditions',
      watchConditions.filter((_, i) => i !== index)
    );
  };

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const handleNext = () => {
    if (activeTab < 3) setActiveTab(activeTab + 1);
  };

  const handlePrev = () => {
    if (activeTab > 0) setActiveTab(activeTab - 1);
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto py-8 px-4 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
          Cadastro de Nova Gestante
        </h1>
        <p className="text-gray-400 text-base font-normal leading-normal">
          Preencha os dados abaixo para registrar uma nova paciente no sistema.
        </p>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 bg-[#111817] z-10 pt-4 pb-2 mb-6">
        <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex-shrink-0 px-6 pb-3 pt-2 text-sm font-bold leading-normal tracking-[0.015em] border-b-[3px] transition-colors ${
                activeTab === index
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-[#111817] rounded-lg">
        {/* Tab 1: Dados Pessoais */}
        {activeTab === 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                Dados Pessoais
              </h2>
              <button
                type="button"
                onClick={handleSearchRNDS}
                disabled={rndsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {rndsLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Buscando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">cloud_download</span>
                    Buscar na RNDS
                  </>
                )}
              </button>
            </div>

            {/* RNDS Message */}
            {rndsMessage && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  rndsMessage.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : rndsMessage.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">
                    {rndsMessage.type === 'success' ? 'check_circle' : rndsMessage.type === 'error' ? 'error' : 'info'}
                  </span>
                  <p className="text-sm">{rndsMessage.text}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">
                    CPF <span className="text-red-400">*</span>
                  </span>
                  <input
                    {...register('cpf')}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setValue('cpf', formatted);
                    }}
                    className={`form-input bg-white/5 border ${
                      errors.cpf ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && <p className="text-red-400 text-sm">{errors.cpf.message}</p>}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">CNS (Cartão Nacional de Saúde)</span>
                  <input
                    {...register('cns')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="000 0000 0000 0000"
                    maxLength={18}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">
                    Nome Completo <span className="text-red-400">*</span>
                  </span>
                  <input
                    {...register('fullName')}
                    className={`form-input bg-white/5 border ${
                      errors.fullName ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                    placeholder="Digite o nome completo"
                  />
                  {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName.message}</p>}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Nome Social (Opcional)</span>
                  <input
                    {...register('socialName')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Digite o nome social"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">
                    Data de Nascimento <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="date"
                    {...register('birthDate')}
                    className={`form-input bg-white/5 border ${
                      errors.birthDate ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                  />
                  {errors.birthDate && <p className="text-red-400 text-sm">{errors.birthDate.message}</p>}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">E-mail</span>
                  <input
                    type="email"
                    {...register('email')}
                    className={`form-input bg-white/5 border ${
                      errors.email ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">
                    Telefone Celular <span className="text-red-400">*</span>
                  </span>
                  <input
                    {...register('mobilePhone')}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue('mobilePhone', formatted);
                    }}
                    className={`form-input bg-white/5 border ${
                      errors.mobilePhone ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  {errors.mobilePhone && <p className="text-red-400 text-sm">{errors.mobilePhone.message}</p>}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Telefone Fixo (Opcional)</span>
                  <input
                    {...register('homePhone')}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue('homePhone', formatted);
                    }}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="(00) 0000-0000"
                    maxLength={14}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Nome da Mãe</span>
                  <input
                    {...register('motherName')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Digite o nome completo da mãe"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Endereço */}
        {activeTab === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-6">Endereço</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">CEP</span>
                  <div className="flex gap-2">
                    <input
                      {...register('postalCode')}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value);
                        setValue('postalCode', formatted);
                      }}
                      onBlur={handleSearchCEP}
                      className="form-input flex-1 bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <button
                      type="button"
                      onClick={handleSearchCEP}
                      className="px-3 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white transition-colors"
                    >
                      <span className="material-symbols-outlined">search</span>
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-white text-base font-medium">Rua</span>
                  <input
                    {...register('street')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Nome da rua"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Número</span>
                  <input
                    {...register('number')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="123"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-white text-base font-medium">Complemento</span>
                  <input
                    {...register('complement')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Apto, Bloco, etc."
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Bairro</span>
                  <input
                    {...register('neighborhood')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Nome do bairro"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Cidade</span>
                  <input
                    {...register('city')}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Nome da cidade"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Estado</span>
                  <select
                    {...register('state')}
                    className="form-select bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  >
                    <option value="">Selecione</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Dados Clínicos */}
        {activeTab === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-6">
              Dados Clínicos
            </h2>

            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-white text-base font-medium">Tipo Sanguíneo</span>
                <select
                  {...register('bloodType')}
                  className="form-select bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors max-w-xs"
                >
                  <option value="">Selecione</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </label>

              {/* Alergias */}
              <div className="flex flex-col gap-2">
                <span className="text-white text-base font-medium">Alergias</span>
                <div className="flex gap-2">
                  <input
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAllergy();
                      }
                    }}
                    className="form-input flex-1 bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Digite uma alergia e pressione Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-4 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchAllergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm"
                    >
                      {allergy}
                      <button type="button" onClick={() => handleRemoveAllergy(index)} className="hover:text-red-100">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Condições Crônicas */}
              <div className="flex flex-col gap-2">
                <span className="text-white text-base font-medium">Condições Crônicas</span>
                <div className="flex gap-2">
                  <input
                    value={conditionsInput}
                    onChange={(e) => setConditionsInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCondition();
                      }
                    }}
                    className="form-input flex-1 bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Digite uma condição e pressione Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-4 rounded-lg bg-[#293836] hover:bg-[#3c5350] text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchConditions.map((condition, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm"
                    >
                      {condition}
                      <button type="button" onClick={() => handleRemoveCondition(index)} className="hover:text-yellow-100">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Dados da Gravidez */}
        {activeTab === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-6">
              Dados da Gravidez
            </h2>

            <div className="space-y-6">
              {/* DUM e DPP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">
                    Data da Última Menstruação (DUM) <span className="text-red-400">*</span>
                  </span>
                  <input
                    type="date"
                    {...register('lastMenstrualPeriod')}
                    className={`form-input bg-white/5 border ${
                      errors.lastMenstrualPeriod ? 'border-red-500' : 'border-white/20'
                    } rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
                  />
                  {errors.lastMenstrualPeriod && (
                    <p className="text-red-400 text-sm">{errors.lastMenstrualPeriod.message}</p>
                  )}
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Data Provável do Parto (DPP)</span>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-primary font-medium">
                    {estimatedDueDate
                      ? estimatedDueDate.toLocaleDateString('pt-BR')
                      : 'Preencha a DUM para calcular'}
                  </div>
                </div>
              </div>

              {/* Peso e Altura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Peso Pré-Gestacional (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    {...register('prePregnancyWeight', { valueAsNumber: true })}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Ex: 65.5"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Altura (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('height', { valueAsNumber: true })}
                    className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    placeholder="Ex: 1.65"
                  />
                </label>
              </div>

              {/* Histórico Obstétrico */}
              <div>
                <span className="text-white text-base font-medium block mb-3">Histórico Obstétrico</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-[#9db8b5] text-sm">Gestações (G)</span>
                    <input
                      type="number"
                      min="1"
                      {...register('gravida', { valueAsNumber: true })}
                      className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[#9db8b5] text-sm">Partos (P)</span>
                    <input
                      type="number"
                      min="0"
                      {...register('para', { valueAsNumber: true })}
                      className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[#9db8b5] text-sm">Cesáreas (C)</span>
                    <input
                      type="number"
                      min="0"
                      {...register('cesarean', { valueAsNumber: true })}
                      className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[#9db8b5] text-sm">Abortos (A)</span>
                    <input
                      type="number"
                      min="0"
                      {...register('abortions', { valueAsNumber: true })}
                      className="form-input bg-white/5 border border-white/20 rounded-lg p-3 text-white text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </label>
                </div>
              </div>

              {/* Tipo de Gravidez e Risco */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Tipo de Gravidez</span>
                  <select
                    {...register('pregnancyType')}
                    className="form-select bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  >
                    <option value="singleton">Única</option>
                    <option value="twin">Gemelar</option>
                    <option value="triplet">Trigemelar</option>
                    <option value="multiple">Múltipla</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-white text-base font-medium">Nível de Risco Inicial</span>
                  <select
                    {...register('riskLevel')}
                    className="form-select bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  >
                    <option value="habitual">Habitual (Baixo)</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="alto">Alto</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-white bg-transparent border border-white/20 text-sm font-bold hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-4">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-white bg-[#293836] text-sm font-bold hover:bg-[#3c5350] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Voltar
              </button>
            )}

            {activeTab < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-black bg-primary text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Próximo
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={createPatientMutation.isPending}
                className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg text-black bg-primary text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPatientMutation.isPending ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check</span>
                    Finalizar Cadastro
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {createPatientMutation.isError && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400">error</span>
              <p className="text-red-300 text-sm">
                Erro ao cadastrar paciente. Verifique os dados e tente novamente.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default NewPatientPage;
