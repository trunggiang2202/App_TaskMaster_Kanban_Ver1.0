'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListChecks, Clock, Timer, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';

function SubtasksDisplay({ subtasks }: { subtasks: Subtask[] }) {
  if (subtasks.length === 0) {
    return null;
  }
  
  return (
     <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="subtasks" className="border-b-0">
        <AccordionTrigger className="text-xs py-1 hover:no-underline text-sidebar-foreground/80 -ml-2">
          Xem Công việc
        </AccordionTrigger>
        <AccordionContent className="pt-2 space-y-2">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex flex-col space-y-1 p-2 rounded-md bg-sidebar-background/50">
              <div className="flex items-center space-x-2">
                 <Checkbox
                    id={`sidebar-subtask-${subtask.id}`}
                    checked={subtask.completed}
                    className="border-sidebar-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    disabled
                  />
                <label
                  htmlFor={`sidebar-subtask-${subtask.id}`}
                  className={`flex-1 text-xs ${subtask.completed ? 'line-through text-sidebar-foreground/60' : 'text-sidebar-foreground/90'}`}
                >
                  {subtask.title}
                </label>
              </div>
               {subtask.description && (
                <p className="text-xs text-sidebar-foreground/60 pl-6">{subtask.description}</p>
              )}
              {subtask.startDate && subtask.endDate && (
                <div className="text-xs text-sidebar-foreground/60 pl-6">
                  Deadline: {format(subtask.startDate, 'dd/MM HH:mm')} - {format(subtask.endDate, 'dd/MM HH:mm')}
                </div>
              )}
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function TaskProgress({ task }: { task: Task }) {
  const [timeProgress, setTimeProgress] = React.useState(100);
  const [subtaskProgress, setSubtaskProgress] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState('');
  const [deadlineStatus, setDeadlineStatus] = React.useState('');
  
  React.useEffect(() => {
    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      
      if (now >= end) return 0;
      if (now < start) return 100;
      
      const percentage = ((end - now) / (end - start)) * 100;
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
    if (typeof window !== 'undefined') {
        setDeadlineStatus(formatDistanceToNow(new Date(task.endDate), { addSuffix: true }));
    }
  }, [task.endDate]);

  React.useEffect(() => {
    if (task.subtasks.length > 0) {
      const completedCount = task.subtasks.filter(st => st.completed).length;
      setSubtaskProgress((completedCount / task.subtasks.length) * 100);
    } else {
       setSubtaskProgress(task.status === 'Done' ? 100 : 0);
    }
  }, [task.subtasks, task.status]);

  const isOverdue = timeProgress === 0 && task.status !== 'Done';
  const isWarning = timeProgress < 20 && task.status !== 'Done';

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
            {deadlineStatus}
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
      <SubtasksDisplay subtasks={task.subtasks} />
    </div>
  );
}


export function RecentTasks({ tasks, onEditTask, onDeleteTask }: RecentTasksProps) {
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Công việc đã thêm</SidebarGroupLabel>
      <div className="space-y-3 px-2">
        {recentTasks.map(task => (
          <div key={task.id} className="p-2.5 rounded-lg bg-sidebar-accent/50 space-y-2 relative group">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-sidebar-foreground truncate pr-6">{task.title}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEditTask(task)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Chỉnh sửa</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-destructive">
                     <Trash2 className="mr-2 h-4 w-4" />
                    <span>Xóa</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
