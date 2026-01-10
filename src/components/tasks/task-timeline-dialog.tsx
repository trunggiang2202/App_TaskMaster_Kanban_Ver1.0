
'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { eachDayOfInterval, format, differenceInDays, isBefore, isAfter, startOfDay, isWithinInterval, isSameDay } from 'date-fns';
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
  const [focusedDay, setFocusedDay] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFocusedDay(null);
    }
  }, [isOpen]);
  
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

  const handleDayClick = (day: Date) => {
    setFocusedDay(prev => prev && isSameDay(prev, day) ? null : day);
  };
  
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // If the click is not on a day label or inside it, reset focus
    if (!target.closest('[data-day-index]')) {
      setFocusedDay(null);
    }
  };


  if (!task) {
    return null;
  }

  const { days, subtasks } = timelineData;
  const gridTemplateColumns = `repeat(${subtasks.length || 1}, minmax(100px, 1fr))`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Timeline: {task.title}</DialogTitle>
          </div>
        </DialogHeader>
        <Separator />
        <div 
          className="flex-1 overflow-auto custom-scrollbar pr-2"
          onClick={handleBackgroundClick}
        >
            <div className="relative flex">
                <div 
                    className="flex flex-col sticky left-0 bg-background z-10 cursor-pointer"
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const dayIndexStr = target.closest('[data-day-index]')?.getAttribute('data-day-index');
                        if (dayIndexStr) {
                            handleDayClick(days[parseInt(dayIndexStr, 10)]);
                        }
                    }}
                >
                    {days.map((day, index) => (
                        <div 
                          key={index} 
                          data-day-index={index}
                          className={cn(
                            "h-10 flex-shrink-0 flex items-center justify-end text-xs text-muted-foreground rounded-l-md transition-opacity duration-300",
                            focusedDay && !isSameDay(focusedDay, day) && "opacity-20",
                            focusedDay && isSameDay(focusedDay, day) && "bg-primary/10"
                          )}
                        >
                            <span className={cn("px-2", isSameDay(day, new Date()) && "font-bold text-primary")}>
                                {format(day, 'dd/MM')}
                            </span>
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
                     <div className="absolute inset-y-0 -left-px w-px bg-border"></div>
                     <div className="grid" style={{ gridTemplateColumns }}>
                        {subtasks.map((subtask, subtaskIndex) => (
                            <div key={subtask.id} className="relative h-full">
                                {days.map((day, dayIndex) => {
                                    const subtaskInterval = { start: startOfDay(subtask.startDate!), end: startOfDay(subtask.endDate!) };
                                    const isDayInSubtask = isWithinInterval(day, subtaskInterval);

                                    const cellContent = isDayInSubtask ? (
                                        <TooltipProvider key={`${subtask.id}-${dayIndex}`} delayDuration={0}>
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
                                    ) : (
                                       <div className="h-10"></div>
                                    );

                                    return (
                                        <div 
                                            key={`${subtask.id}-${dayIndex}`} 
                                            className={cn(
                                                "border-b border-dashed border-border/50 transition-opacity duration-300",
                                                focusedDay && !isSameDay(focusedDay, day) && "opacity-20"
                                            )}
                                        >
                                           {cellContent}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
