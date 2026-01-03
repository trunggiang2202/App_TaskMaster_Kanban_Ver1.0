'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { SidebarGroup } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListChecks, Clock, MoreHorizontal, Edit, Trash2, Circle, Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function SubtaskTimeProgress({ subtask }: { subtask: Subtask }) {
  const [timeProgress, setTimeProgress] = React.useState(100);
  const [timeLeft, setTimeLeft] = React.useState('');
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const calculateTimeProgress = () => {
      if (!subtask.startDate || !subtask.endDate) return 100;
      const now = new Date().getTime();
      const start = new Date(subtask.startDate).getTime();
      const end = new Date(subtask.endDate).getTime();

      if (now >= end) return 0;
      if (now < start) return 100;

      const percentage = ((end - now) / (end - start)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    };

    const calculateTimeLeft = () => {
      if (!subtask.startDate || !subtask.endDate) return '';
      if (subtask.completed) return 'Đã hoàn thành';

      const now = new Date().getTime();
      const end = new Date(subtask.endDate).getTime();
      const distance = end - now;

      if (distance < 0) return 'Đã quá hạn';

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m`;

      return result.trim() === '' ? '0m' : result.trim();
    };

    const updateTimes = () => {
        setTimeProgress(calculateTimeProgress());
        setTimeLeft(calculateTimeLeft());
    };

    updateTimes();

    if (!subtask.completed) {
      intervalRef.current = setInterval(updateTimes, 60000);
    } else {
        if(intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [subtask.startDate, subtask.endDate, subtask.completed]);

  if (!subtask.startDate || !subtask.endDate) return null;
  
  const isOverdue = timeProgress === 0 && !subtask.completed;
  const isWarning = timeProgress < 20 && !subtask.completed;

  const getProgressColor = () => {
    if (isOverdue || isWarning) return 'bg-destructive';
    return 'bg-emerald-400';
  };
  
  const getTimeLeftColor = () => {
    if (subtask.completed) return 'text-emerald-400';
    if (isOverdue) return 'text-destructive';
    if (isWarning) return 'text-amber-400';
    return 'text-sidebar-foreground/60';
  };

  return (
    <div className="pl-5 mt-1">
        <div className="flex justify-between items-center mb-1 text-xs">
            <span className={`flex items-center gap-1.5 ${getTimeLeftColor()}`}><Clock size={12} /> {timeLeft}</span>
        </div>
        <Progress value={timeProgress} className="h-1 bg-sidebar-accent" indicatorClassName={getProgressColor()} />
    </div>
  );
}

function TaskProgress({ task }: { task: Task }) {
  const [timeProgress, setTimeProgress] = React.useState(100);
  const [subtaskProgress, setSubtaskProgress] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState('');
  
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
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m`;
      
      return result.trim() === '' ? '0m' : result.trim();
    }

    const updateTimes = () => {
        setTimeProgress(calculateTimeProgress());
        setTimeLeft(calculateTimeLeft());
    };
    
    updateTimes();
    
    if (task.status !== 'Done') {
      const interval = setInterval(updateTimes, 60000); // Update every minute
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
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className={`flex items-center gap-1.5 font-semibold ${getTimeLeftColor()}`}>
            <Clock size={12} /> {timeLeft}
          </span>
        </div>
        <Progress value={timeProgress} className="h-1.5 bg-sidebar-accent" indicatorClassName={getProgressColor()} />
      </div>
      
      {task.subtasks.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="subtasks" className="border-b-0">
              <div className="w-full space-y-1">
                <div className="flex items-center">
                   <div className="flex items-center flex-1">
                    <AccordionTrigger className="text-sm font-medium py-1 hover:no-underline flex-1 p-0 flex items-center">
                        <div className="flex justify-between items-center text-xs text-sidebar-foreground/80 w-full">
                            <div className="flex items-center gap-1.5">
                              <ListChecks size={12} /> 
                              <span>Công việc</span>
                              <ChevronDown className="accordion-chevron h-4 w-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-200" />
                            </div>
                            <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                        </div>
                    </AccordionTrigger>
                  </div>
                </div>
                <Progress value={subtaskProgress} className="h-1.5 bg-sidebar-accent" indicatorClassName="bg-primary" />
              </div>
              <AccordionContent className="pt-2 space-y-2">
                {task.subtasks.map(subtask => {
                  return (
                    <div key={subtask.id} className="flex flex-col space-y-1 p-2 rounded-md bg-sidebar-background/50">
                      <div 
                        className="flex items-start space-x-2"
                      >
                        {subtask.completed ? (
                           <div className="h-3 w-3 mt-0.5 flex items-center justify-center bg-primary rounded-full shrink-0">
                                <Check className="h-2 w-2 text-primary-foreground" />
                            </div>
                        ) : (
                          <Circle className="h-3 w-3 mt-0.5 text-sidebar-foreground/60 shrink-0" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`text-xs ${subtask.completed ? 'line-through text-sidebar-foreground/60' : 'text-sidebar-foreground/90'}`}
                          >
                            {subtask.title}
                          </span>
                          {subtask.description && (
                            <p className="text-xs text-sidebar-foreground/60">{subtask.description}</p>
                          )}
                        </div>
                      </div>
                      <SubtaskTimeProgress subtask={subtask} />
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
      )}
    </div>
  );
}


interface RecentTasksProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}


export function RecentTasks({ tasks, selectedTaskId, onSelectTask }: RecentTasksProps) {
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <SidebarGroup>
      <div className="space-y-3 px-2">
        {recentTasks.map(task => (
          <div 
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={`p-2.5 rounded-lg space-y-2 relative group cursor-pointer transition-colors ${selectedTaskId === task.id ? 'bg-sidebar-primary/20' : 'bg-sidebar-accent'}`}
          >
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-sidebar-foreground truncate pr-6">{task.title}</p>
            </div>
            <TaskProgress 
              task={task} 
            />
          </div>
        ))}
         {recentTasks.length === 0 && (
          <p className="text-sm text-center text-sidebar-foreground/60 py-4"></p>
        )}
      </div>
    </SidebarGroup>
  );
}
