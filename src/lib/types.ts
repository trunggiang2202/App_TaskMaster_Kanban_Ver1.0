export type Status = 'To Do' | 'In Progress' | 'Done';
export type TaskType = 'deadline' | 'recurring' | 'idea';

export interface Attachment {
  name: string;
  url: string;
  type?: 'image' | 'file';
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  isManuallyStarted?: boolean; // Added to track manually started tasks
  startDate?: Date;
  endDate?: Date;
  attachments?: Attachment[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  createdAt: Date;
  subtasks: Subtask[];
  taskType: TaskType;
  startDate?: Date;
  endDate?: Date;
  recurringDays?: number[]; // 0 (Sun) to 6 (Sat)
  lastCompletedAt?: Date;
  convertedFrom?: string;
}
