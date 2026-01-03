'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task, Subtask, Status } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, ListChecks, Clock, MoreHorizontal, Edit, Trash2, Circle, Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: Status) => void;
  onEditTask: (task: Task) => void;
}

function SubtaskTimeProgress({ subtask }: { subtask: Subtask }) {
    const [timeProgress, setTimeProgress] = useState(100);
    const [timeLeft, setTimeLeft] = useState('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
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
            if (intervalRef.current) clearInterval(intervalRef.current);
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
        return 'bg-emerald-500';
    };
    
    const getTimeLeftColor = () => {
        if (subtask.completed) return 'text-emerald-500';
        if (isOverdue) return 'text-destructive';
        if (isWarning) return 'text-amber-500';
        return 'text-muted-foreground';
    };

    return (
        <div className="pl-6 mt-1">
            <div className="flex justify-between items-center mb-1 text-xs">
                <span className={`flex items-center gap-1.5 ${getTimeLeftColor()}`}><Clock size={14} /> {timeLeft}</span>
            </div>
            <Progress value={timeProgress} className="h-1.5" indicatorClassName={getProgressColor()} />
        </div>
    );
}

export default function TaskCard({ task, onUpdateTask, onTaskStatusChange, onEditTask }: TaskCardProps) {
  const [timeProgress, setTimeProgress] = useState(100);
  const [subtaskProgress, setSubtaskProgress] = useState(0);
  const [isDoneDisabled, setIsDoneDisabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = task.startDate.getTime();
      const end = task.endDate.getTime();

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
      const end = task.endDate.getTime();
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

  useEffect(() => {
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const totalSubtasks = task.subtasks.length;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);
    setSubtaskProgress(progress);
    setIsDoneDisabled(progress < 100 && totalSubtasks > 0);
  }, [task.subtasks, task.status]);

  const handleSubtaskToggle = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };
  
  const handleMarkAsDone = () => {
    if (!isDoneDisabled) {
      onTaskStatusChange(task.id, 'Done');
    }
  };

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
    return 'text-muted-foreground';
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle className="text-base font-semibold leading-tight">{task.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEditTask(task)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Chỉnh sửa</span>
            </DropdownMenuItem>
            {task.status !== 'To Do' && <DropdownMenuItem onClick={() => onTaskStatusChange(task.id, 'To Do')}>Move to To Do</DropdownMenuItem>}
            {task.status !== 'In Progress' && <DropdownMenuItem onClick={() => onTaskStatusChange(task.id, 'In Progress')}>Move to In Progress</DropdownMenuItem>}
            {task.status !== 'Done' && <DropdownMenuItem onClick={handleMarkAsDone} disabled={isDoneDisabled}>Mark as Done</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        
        <div className="space-y-3">
          <div>
             <div className="flex justify-between items-center mb-1 text-xs">
              <span className={`flex items-center gap-1.5 ${getTimeLeftColor()}`}><Clock size={14} /> {timeLeft}</span>
            </div>
            <Progress value={timeProgress} className="h-2" indicatorClassName={getProgressColor()} />
          </div>
        </div>
        
        {task.subtasks.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="subtasks" className="border-b-0">
              <AccordionTrigger className="text-sm font-medium py-1 hover:no-underline w-full p-0 flex flex-col items-start">
                <div className="w-full text-left space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <ListChecks size={14} />
                        <span>Công việc</span>
                        <ChevronDown className="accordion-chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                      </div>
                      <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                  </div>
                  <Progress value={subtaskProgress} className="h-2" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-2">
                {task.subtasks.map(subtask => {
                  const isSubtaskInProgress = task.status === 'In Progress' && !subtask.completed;
                  return (
                    <div key={subtask.id} className="flex flex-col space-y-2 p-2 rounded-md bg-muted/50">
                      <div 
                        className="flex items-start space-x-2 cursor-pointer"
                        onClick={() => handleSubtaskToggle(subtask.id)}
                      >
                        {subtask.completed ? (
                          <Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                        ) : isSubtaskInProgress ? (
                          <LoaderCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0 animate-spin" />
                        ) : (
                          <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1">
                          <span
                            className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                          >
                            {subtask.title}
                          </span>
                          {subtask.description && (
                            <p className="text-xs text-muted-foreground">{subtask.description}</p>
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
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={14} />
          <span>Hạn chót: {format(task.endDate, 'MMM d, yyyy')}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
