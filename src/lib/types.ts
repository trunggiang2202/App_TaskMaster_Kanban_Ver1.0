export type Status = 'To Do' | 'In Progress' | 'Done';

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
  startDate?: Date;
  endDate?: Date;
  attachments?: Attachment[];
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
