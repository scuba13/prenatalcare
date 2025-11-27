export type TaskType =
  | 'consultation'
  | 'exam'
  | 'vaccine'
  | 'ultrasound'
  | 'education'
  | 'procedure'
  | 'medication'
  | 'other';

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type PriorityLevel = 'routine' | 'important' | 'urgent' | 'critical';

export interface TaskOutcome {
  code?: string;
  value?: string | number;
  unit?: string;
  interpretation?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
  reference?: string;
  date?: string;
}

export interface NotificationSchedule {
  type: 'sms' | 'email' | 'push';
  daysBeforeDue: number;
  sent: boolean;
  sentAt?: string;
}

export interface Prerequisite {
  type: 'task' | 'exam' | 'condition';
  description: string;
  completed: boolean;
}

export interface Recurrence {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  until?: string;
  count?: number;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  s3Key: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Task {
  id: string;
  pregnancyId: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  status: TaskStatus;
  priority: number;
  priorityLevel: PriorityLevel;
  clinicalCode?: string;
  clinicalCodeDisplay?: string;
  assignedTo?: string;
  performedBy?: string;
  location?: string;
  outcome?: TaskOutcome;
  notes?: string;
  cancellationReason?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  notificationSchedule: NotificationSchedule[];
  dependsOnTaskId?: string;
  prerequisites: Prerequisite[];
  isRecurring: boolean;
  recurrence?: Recurrence;
  attachments: Attachment[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateTaskDto {
  pregnancyId: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate: string;
  priority?: number;
  priorityLevel?: PriorityLevel;
  clinicalCode?: string;
  clinicalCodeDisplay?: string;
  assignedTo?: string;
  location?: string;
  notificationSchedule?: NotificationSchedule[];
  dependsOnTaskId?: string;
  prerequisites?: Prerequisite[];
  isRecurring?: boolean;
  recurrence?: Recurrence;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  status?: TaskStatus;
  completedDate?: string;
  performedBy?: string;
  outcome?: TaskOutcome;
  notes?: string;
  cancellationReason?: string;
}

export interface CompleteTaskDto {
  performedBy?: string;
  outcome?: TaskOutcome;
  notes?: string;
}
