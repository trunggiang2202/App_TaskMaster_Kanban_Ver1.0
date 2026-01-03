'use client';

import { useState, useEffect } from 'react';
import type { Task, Subtask, Status } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, ListChecks, Clock, MoreHorizontal, Timer, Edit, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: Status) => void;
  onEditTask: (task: Task) => void;
}

export default function TaskCard({ task, onUpdateTask, onTaskStatusChange, onEditTask }: TaskCardProps) {
  const [timeProgress, setTimeProgress] = useState(100);
  const [subtaskProgress, setSubtaskProgress] = useState(0);
  const [isDoneDisabled, setIsDoneDisabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [deadlineStatus, setDeadlineStatus] = useState('');

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
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeadlineStatus(formatDistanceToNow(task.endDate, { addSuffix: true }));
    }
  }, [task.endDate]);

  useEffect(() => {
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const totalSubtasks = task.subtasks.length;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 100;
    setSubtaskProgress(progress);
    setIsDoneDisabled(progress < 100);
  }, [task.subtasks]);

  const handleSubtaskChange = (subtaskId: string, completed: boolean) => {
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed } : st
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
            <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock size={14} /> Tiến độ</span>
              <span className={isOverdue ? "text-destructive font-medium" : ""}>{deadlineStatus}</span>
            </div>
            <Progress value={timeProgress} className="h-2" indicatorClassName={getProgressColor()} />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Timer size={14} /> Thời gian còn lại</span>
            </div>
            <div className={`text-sm font-semibold ${getTimeLeftColor()}`}>
              {timeLeft}
            </div>
          </div>
        </div>
        
        {task.subtasks.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ListChecks size={14} /> Công việc</span>
                <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
            </div>
            <Progress value={subtaskProgress} className="h-2" />
          </div>
        )}

        {task.subtasks.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="subtasks" className="border-b-0">
              <AccordionTrigger className="text-sm py-1 hover:no-underline -ml-2">
                Xem Công việc
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-2">
                {task.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center space-x-2 p-2 rounded-md bg-muted/50">
                    <Checkbox
                      id={`subtask-${subtask.id}`}
                      checked={subtask.completed}
                      onCheckedChange={(checked) => handleSubtaskChange(subtask.id, !!checked)}
                      disabled={task.status === 'Done'}
                    />
                    <label
                      htmlFor={`subtask-${subtask.id}`}
                      className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                    >
                      {subtask.title}
                    </label>
                  </div>
                ))}
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
