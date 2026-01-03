'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { ListChecks, Clock, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentTasksProps {
  tasks: Task[];
}

function TaskProgress({ task }: { task: Task }) {
  const [timeProgress, setTimeProgress] = React.useState(0);
  const [subtaskProgress, setSubtaskProgress] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState('');
  
  React.useEffect(() => {
    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      if (now >= end) return 100;
      if (now < start) return 0;
      const percentage = ((now - start) / (end - start)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    };

    const calculateTimeLeft = () => {
      if (task.status === 'Done') {
        return 'Đã hoàn thành';
      }

      const now = new Date().getTime();
      const end = new Date(task.endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        return 'Đã quá hạn';
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      
      return result.trim() + ' còn lại';
    }

    setTimeProgress(calculateTimeProgress());
    setTimeLeft(calculateTimeLeft());
    
    if (task.status !== 'Done') {
      const interval = setInterval(() => {
        setTimeProgress(calculateTimeProgress());
        setTimeLeft(calculateTimeLeft());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task.startDate, task.endDate, task.status]);

  React.useEffect(() => {
    if (task.subtasks.length > 0) {
      const completedCount = task.subtasks.filter(st => st.completed).length;
      setSubtaskProgress((completedCount / task.subtasks.length) * 100);
    } else {
      setSubtaskProgress(task.status === 'Done' ? 100 : 0);
    }
  }, [task.subtasks, task.status]);

  const isOverdue = new Date() > new Date(task.endDate) && task.status !== 'Done';
  const isWarning = timeProgress > 80 && task.status !== 'Done';

  const getProgressColor = () => {
    if (isOverdue || isWarning) {
      return 'bg-destructive'; // Red
    }
    return 'bg-emerald-500'; // Green
  };

  const getTimeLeftColor = () => {
    if (task.status === 'Done') return 'text-emerald-500';
    if (isOverdue) return 'text-destructive';
    if (isWarning) return 'text-amber-500';
    return 'text-sidebar-foreground/80';
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between items-center text-xs text-sidebar-foreground/80 mb-1">
          <span className="flex items-center gap-1.5"><Clock size={12} /> Deadline</span>
          <span className={isOverdue ? "text-destructive font-medium" : ""}>
            {formatDistanceToNow(new Date(task.endDate), { addSuffix: true })}
          </span>
        </div>
        <Progress value={timeProgress} className="h-1.5 bg-sidebar-accent" indicatorClassName={getProgressColor()} />
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 text-xs text-sidebar-foreground/80"><Timer size={12} /> Thời gian còn lại</span>
        <div className={`text-xs font-semibold ${getTimeLeftColor()}`}>
          {timeLeft}
        </div>
      </div>
      
      {task.subtasks.length > 0 && (
        <div>
          <div className="flex justify-between items-center text-xs text-sidebar-foreground/80 mb-1">
            <span className="flex items-center gap-1.5"><ListChecks size={12} /> Công việc</span>
            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
          </div>
          <Progress value={subtaskProgress} className="h-1.5 bg-sidebar-accent" indicatorClassName="bg-primary" />
        </div>
      )}
    </div>
  );
}


export function RecentTasks({ tasks }: RecentTasksProps) {
  // Sort tasks by creation date, newest first, and take the top 5
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Công việc đã thêm</SidebarGroupLabel>
      <div className="space-y-3 px-2">
        {recentTasks.map(task => (
          <div key={task.id} className="p-2.5 rounded-lg bg-sidebar-accent/50 space-y-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{task.title}</p>
            <TaskProgress task={task} />
          </div>
        ))}
         {recentTasks.length === 0 && (
          <p className="text-sm text-center text-sidebar-foreground/60 py-4">Chưa có công việc nào.</p>
        )}
      </div>
    </SidebarGroup>
  );
}
