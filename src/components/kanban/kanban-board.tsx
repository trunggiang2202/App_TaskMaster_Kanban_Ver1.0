import type { Task, Status } from '@/lib/types';
import KanbanColumn from './kanban-column';

const columns: Status[] = ['To Do', 'In Progress', 'Done'];

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: Status) => void;
  onEditTask: (task: Task) => void;
}

export default function KanbanBoard({ tasks, onUpdateTask, onTaskStatusChange, onEditTask }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start h-full">
      {columns.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasks.filter(task => task.status === status)}
          onUpdateTask={onUpdateTask}
          onTaskStatusChange={onTaskStatusChange}
          onEditTask={onEditTask}
        />
      ))}
    </div>
  );
}
