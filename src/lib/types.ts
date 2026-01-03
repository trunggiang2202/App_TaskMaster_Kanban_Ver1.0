export type Status = 'To Do' | 'In Progress' | 'Done';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  subtasks: Subtask[];
}
