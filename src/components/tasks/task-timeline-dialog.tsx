'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { eachDayOfInterval, format, differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';
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
  return 'Làm';
};

export function TaskTimelineDialog({ isOpen, onOpenChange, task }: TaskTimelineDialogProps) {
  const now = React.useMemo(() => new Date(), []);
  
  const timelineData = React.useMemo(() => {
    if (!task || !task.startDate || !task.endDate) {
      return { days: [], subtasks: [], totalDays: 0 };
    }

    const interval = { start: task.startDate, end: task.endDate };
    const days = eachDayOfInterval(interval).reverse(); // Reverse days to have start date at bottom
    const totalDays = differenceInDays(task.endDate, task.startDate) + 1;

    const positionedSubtasks = task.subtasks.map((subtask) => {
      if (!subtask.startDate || !subtask.endDate) return null;

      const offset = differenceInDays(task.endDate!, subtask.endDate!);
      const duration = differenceInDays(subtask.endDate, subtask.startDate) + 1;
      
      const status = getStatus(subtask, now);
      let left = 0;
      if (status === 'Làm') {
        const elapsed = differenceInDays(now, subtask.startDate);
        left = (elapsed / (duration -1)) * 100;
      } else if (status === 'Xong') {
        left = 100;
      }
      
      const getProgressColor = () => {
          if (status === 'Xong') return 'bg-chart-2';
          if (status === 'Làm') {
              if (isAfter(now, subtask.endDate!)) return 'bg-destructive';
              return 'bg-amber-500';
          }
          return 'bg-primary/50';
      }

      return {
        ...subtask,
        offset,
        duration,
        progress: left,
        color: getProgressColor(),
        status: status,
      };
    }).filter(Boolean);

    return { days, subtasks: positionedSubtasks as (Subtask & { offset: number; duration: number, progress: number, color: string, status: string })[], totalDays };
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
                    <div className="absolute inset-0 grid h-full -z-10" style={{ gridTemplateColumns }}>
                        {subtasks.map((_, index) => (
                           <div key={index} className="border-r border-dashed border-border/50"></div>
                        ))}
                    </div>
                     <div className="relative h-full" style={{ gridTemplateColumns }}>
                        {subtasks.map((subtask, index) => (
                            <TooltipProvider key={subtask.id} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn("absolute rounded-md flex items-center justify-center px-2 cursor-pointer", subtask.color)}
                                            style={{
                                                top: `${subtask.offset * 40}px`,
                                                height: `${subtask.duration * 40}px`,
                                                left: `calc(${index * (100 / subtasks.length)}% + 4px)`,
                                                width: `calc(${100 / subtasks.length}% - 8px)`,
                                            }}
                                        >
                                            <p className="text-xs font-medium text-primary-foreground truncate">{subtask.title}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <div className="text-xs">
                                            <p className="font-bold">{subtask.title}</p>
                                            <p>Bắt đầu: {format(subtask.startDate!, 'p, dd/MM/yy', { locale: vi })}</p>
                                            <p>Kết thúc: {format(subtask.endDate!, 'p, dd/MM/yy', { locale: vi })}</p>
                                            <p>Trạng thái: {subtask.status}</p>
                                            <p>Tiến độ: {subtask.progress.toFixed(0)}%</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
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
