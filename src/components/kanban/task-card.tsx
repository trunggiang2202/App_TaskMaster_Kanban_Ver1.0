'use client';

import { useState, useEffect } from 'react';
import type { Task, Subtask, Status } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, ListChecks, Clock, MoreHorizontal } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: Status) => void;
}

export default function TaskCard({ task, onUpdateTask, onTaskStatusChange }: TaskCardProps) {
  const [timeProgress, setTimeProgress] = useState(0);
  const [subtaskProgress, setSubtaskProgress] = useState(0);
  const [isDoneDisabled, setIsDoneDisabled] = useState(true);

  useEffect(() => {
    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = task.startDate.getTime();
      const end = task.endDate.getTime();
      if (now >= end) return 100;
      if (now < start) return 0;
      const percentage = ((now - start) / (end - start)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    };

    setTimeProgress(calculateTimeProgress());

    if (task.status !== 'Done') {
      const interval = setInterval(() => {
        setTimeProgress(calculateTimeProgress());
      }, 1000); // Update every second for real-time effect
      return () => clearInterval(interval);
    }
  }, [task.startDate, task.endDate, task.status]);

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

  const isOverdue = new Date() > task.endDate && task.status !== 'Done';
  const isWarning = timeProgress > 80 && task.status !== 'Done';

  const getProgressColor = () => {
    if (isOverdue || isWarning) {
      return 'bg-destructive'; // Red
    }
    return 'bg-emerald-500'; // Green
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
        
        <div>
          <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock size={14} /> Deadline</span>
            <span className={isOverdue ? "text-destructive font-medium" : ""}>{formatDistanceToNow(task.endDate, { addSuffix: true })}</span>
          </div>
          <Progress value={timeProgress} className="h-2" indicatorClassName={getProgressColor()} />
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
                View Subtasks
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
          <span>{format(task.endDate, 'MMM d, yyyy')}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
