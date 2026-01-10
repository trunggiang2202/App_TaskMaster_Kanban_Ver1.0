'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { eachDayOfInterval, format, differenceInDays, isBefore, isAfter, startOfDay, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface TaskTimelineDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task | null;
}

const getStatus = (subtask: Subtask, now: Date) => {
  if (subtask.completed) {
    return 'Xong';
  }
  const subtaskStart = subtask.startDate ? startOfDay(subtask.startDate) : null;
  if (subtaskStart && isBefore(now, subtaskStart)) {
    return 'Chưa bắt đầu';
  }
  const subtaskEnd = subtask.endDate ? startOfDay(subtask.endDate) : null;
  if (subtaskEnd && isAfter(now, subtaskEnd)) {
      return 'Quá hạn';
  }
  return 'Làm';
};

const getProgressColor = (status: string) => {
    switch (status) {
        case 'Xong': return 'bg-chart-2';
        case 'Làm': return 'bg-amber-500';
        case 'Quá hạn': return 'bg-destructive';
        case 'Chưa bắt đầu':
        default: return 'bg-primary/50';
    }
}


export function TaskTimelineDialog({ isOpen, onOpenChange, task }: TaskTimelineDialogProps) {
  const now = React.useMemo(() => new Date(), []);
  
  const timelineData = React.useMemo(() => {
    if (!task || !task.startDate || !task.endDate) {
      return { days: [], subtasks: [], totalDays: 0 };
    }

    const interval = { start: task.startDate, end: task.endDate };
    const days = eachDayOfInterval(interval).reverse();
    const totalDays = differenceInDays(task.endDate, task.startDate) + 1;

    const processedSubtasks = task.subtasks
      .filter(st => st.startDate && st.endDate)
      .map(subtask => {
        const status = getStatus(subtask, now);
        const color = getProgressColor(status);
        return {
          ...subtask,
          status,
          color,
        };
      });

    return { days, subtasks: processedSubtasks, totalDays };
  }, [task, now]);

  if (!task) {
    return null;
  }

  const { days, subtasks } = timelineData;
  const gridTemplateColumns = `repeat(${subtasks.length || 1}, minmax(100px, 1fr))`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Timeline: {task.title}</DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="flex-1 overflow-auto custom-scrollbar pr-2">
            <div className="relative flex">
                {/* Y-Axis Labels (Dates) */}
                <div className="flex flex-col pr-4 border-r border-border sticky left-0 bg-background z-10">
                    {days.map((day, index) => (
                        <div key={index} className="h-10 flex-shrink-0 flex items-center justify-end text-xs text-muted-foreground">
                            {format(day, 'dd/MM')}
                        </div>
                    ))}
                </div>

                {/* Timeline Grid */}
                <div className="relative flex-1" style={{ minWidth: `${subtasks.length * 110}px`}}>
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 grid h-full -z-10" style={{ gridTemplateColumns }}>
                        {subtasks.map((_, index) => (
                           <div key={index} className="border-r border-dashed border-border/50"></div>
                        ))}
                    </div>
                     <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns }}>
                        {Array.from({ length: subtasks.length * days.length }).map((_, index) => {
                            const dayIndex = Math.floor(index / subtasks.length);
                            const day = days[dayIndex];
                            
                            // Find the subtask for the current column
                            const subtaskIndex = index % subtasks.length;
                            const subtask = subtasks[subtaskIndex];

                            if (!subtask) return null;

                            const subtaskInterval = { start: startOfDay(subtask.startDate!), end: startOfDay(subtask.endDate!) };
                            const isDayInSubtask = isWithinInterval(day, subtaskInterval);

                            if (!isDayInSubtask) {
                                return <div key={index} className="h-10"></div>; // Empty cell
                            }

                            return (
                                <TooltipProvider key={index} delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="h-10 p-0.5">
                                                <div className={cn("h-full w-full rounded flex items-center justify-center px-1 cursor-pointer", subtask.color)}>
                                                    <p className="text-xs font-medium text-primary-foreground truncate">{subtask.title}</p>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            <div className="text-xs">
                                                <p className="font-bold">{subtask.title}</p>
                                                <p>Bắt đầu: {format(subtask.startDate!, 'p, dd/MM/yy', { locale: vi })}</p>
                                                <p>Kết thúc: {format(subtask.endDate!, 'p, dd/MM/yy', { locale: vi })}</p>
                                                <p>Trạng thái: {subtask.status}</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                    </div>
                </div>
            </div>

             <div className="relative flex mt-2 sticky left-0">
                <div className="w-[76px] flex-shrink-0 pr-4"></div>
                <div className="flex-1 grid text-center text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns }}>
                    {subtasks.map(st => (
                      <div key={st.id} className="truncate px-1">{st.title}</div>
                    ))}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
