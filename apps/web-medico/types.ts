export interface Patient {
  id: string;
  name: string;
  cpf: string;
  gestationalAge: string;
  risk: 'Alto' | 'Habitual' | 'Intermediário';
  lastConsultation: string;
  dueDate?: string;
  trimester?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface Consultation {
  id: string;
  patientName: string;
  time: string;
  status: 'Concluída' | 'Em Andamento' | 'Agendada';
}

export interface StatCard {
  label: string;
  value: string;
  type: 'default' | 'warning';
}

export interface MenuItem {
  label: string;
  icon: string;
  path: string;
}
