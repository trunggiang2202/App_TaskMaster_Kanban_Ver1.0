import type { Task, Status } from '@/lib/types';
import TaskCard from './task-card';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: Status) => void;
  onEditTask: (task: Task) => void;
}

export default function KanbanColumn({ status, tasks, onUpdateTask, onTaskStatusChange, onEditTask }: KanbanColumnProps) {
  const statusColors: { [key in Status]: string } = {
    'To Do': 'bg-sky-500',
    'In Progress': 'bg-amber-500',
    'Done': 'bg-emerald-500',
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card/50 p-4 h-full">
      <div className="flex items-center gap-3 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`}></span>
        <h2 className="text-lg font-semibold font-headline">{status}</h2>
        <span className="ml-auto text-sm font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onUpdateTask={onUpdateTask} onTaskStatusChange={onTaskStatusChange} onEditTask={onEditTask} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No tasks here yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
