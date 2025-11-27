import { format, differenceInWeeks, differenceInDays, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formatação de datas
export const formatDate = (date: string | Date, pattern = 'dd/MM/yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: ptBR });
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
};

export const formatDateLong = (date: string | Date): string => {
  return formatDate(date, "EEEE, dd 'de' MMMM 'de' yyyy");
};

// Cálculos obstétricos
export const calculateGestationalAge = (
  lastMenstrualPeriod: string | Date
): { weeks: number; days: number; total: number } => {
  const lmp = typeof lastMenstrualPeriod === 'string' ? parseISO(lastMenstrualPeriod) : lastMenstrualPeriod;
  const today = new Date();

  const totalDays = differenceInDays(today, lmp);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  return { weeks, days, total: totalDays };
};

export const formatGestationalAge = (weeks: number, days: number): string => {
  return `${weeks}s ${days}d`;
};

export const calculateDueDate = (lastMenstrualPeriod: string | Date): Date => {
  const lmp = typeof lastMenstrualPeriod === 'string' ? parseISO(lastMenstrualPeriod) : lastMenstrualPeriod;
  return addDays(lmp, 280); // 40 semanas
};

export const getTrimester = (weeks: number): 1 | 2 | 3 | null => {
  if (weeks < 0) return null;
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
};

export const getTrimesterLabel = (trimester: 1 | 2 | 3 | null): string => {
  if (!trimester) return '-';
  return `${trimester}º Trimestre`;
};

// Formatação de CPF
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const unformatCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};

export const maskCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `***.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-**`;
};

// Formatação de telefone
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const unformatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Formatação de CEP
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const unformatCEP = (cep: string): string => {
  return cep.replace(/\D/g, '');
};

// Validações
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Cores de risco
export const getRiskColor = (risk: 'habitual' | 'intermediario' | 'alto'): string => {
  switch (risk) {
    case 'habitual':
      return 'green';
    case 'intermediario':
      return 'yellow';
    case 'alto':
      return 'red';
    default:
      return 'gray';
  }
};

export const getRiskLabel = (risk: 'habitual' | 'intermediario' | 'alto'): string => {
  switch (risk) {
    case 'habitual':
      return 'Habitual';
    case 'intermediario':
      return 'Intermediário';
    case 'alto':
      return 'Alto';
    default:
      return risk;
  }
};

// Cores de status de consulta
export const getAppointmentStatusColor = (
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
): string => {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'CONFIRMED':
      return 'blue';
    case 'IN_PROGRESS':
      return 'purple';
    case 'COMPLETED':
      return 'green';
    case 'CANCELLED':
      return 'gray';
    case 'NO_SHOW':
      return 'red';
    default:
      return 'gray';
  }
};

export const getAppointmentStatusLabel = (
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
): string => {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'IN_PROGRESS':
      return 'Em Andamento';
    case 'COMPLETED':
      return 'Concluída';
    case 'CANCELLED':
      return 'Cancelada';
    case 'NO_SHOW':
      return 'Não Compareceu';
    default:
      return status;
  }
};

// Gerar saudação baseada na hora
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

// ClassNames helper (similar ao clsx)
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
