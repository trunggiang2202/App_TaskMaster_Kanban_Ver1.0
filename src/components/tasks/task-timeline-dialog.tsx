
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
  const subtaskEnd = subtask.endDate ? startOfDay(subtask.endDate) : null;
  const sNow = startOfDay(now);

  if (subtaskStart && subtaskEnd) {
    if (isAfter(sNow, subtaskEnd)) {
      return 'Quá hạn';
    }
    if (isWithinInterval(sNow, { start: subtaskStart, end: subtaskEnd })) {
      return 'Đang làm';
    }
    if (isBefore(sNow, subtaskStart)) {
      return 'Chưa bắt đầu';
    }
  }
  return 'Chưa bắt đầu';
};

const getTimelineCellStyle = (status: string, subtask: Subtask, now: Date) => {
    switch (status) {
        case 'Xong':
            const wasOverdue = subtask.endDate && isBefore(subtask.endDate, now);
            return wasOverdue ? 'border border-destructive border-l-4 border-l-destructive bg-background' : 'border border-chart-2 border-l-4 border-l-chart-2 bg-background';
        case 'Đang làm':
            if (subtask.isManuallyStarted) {
                return 'border border-blue-600 border-l-4 border-l-blue-600 bg-background';
            }
            if (isAfter(now, subtask.endDate!)) {
              return 'border border-destructive border-l-4 border-l-destructive bg-background';
            }
            return 'border border-amber-500 border-l-4 border-l-amber-500 bg-background';
        case 'Quá hạn':
            return 'border border-destructive border-l-4 border-l-destructive bg-background';
        case 'Chưa bắt đầu':
        default:
            return 'border border-primary border-l-4 border-l-primary bg-background';
    }
}

const getTaskProgressOnDay = (day: Date, subtasks: Subtask[]) => {
    const sDay = startOfDay(day);
    const activeSubtasks = subtasks.filter(st => {
        if (!st.startDate || !st.endDate) return false;
        const subtaskInterval = { start: startOfDay(st.startDate), end: startOfDay(st.endDate) };
        return isWithinInterval(sDay, subtaskInterval);
    });
    
    const completed = activeSubtasks.filter(st => st.completed).length;
    const total = activeSubtasks.length;
    
    return { completed, total };
};


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
      return { days: [], subtasks: [], columns: 1 };
    }

    const interval = { start: task.startDate, end: task.endDate };
    const days = eachDayOfInterval(interval);
    
    const subtasks = task.subtasks.map(subtask => {
        const status = getStatus(subtask, now);
        const style = getTimelineCellStyle(status, subtask, now);
        return {
          ...subtask,
          status,
          style,
        };
      });

    return { days, subtasks, columns: task.subtasks.length || 1 };
  }, [task, now]);

  const handleDayClick = (day: Date) => {
    setFocusedDay(prev => prev && isSameDay(prev, day) ? null : day);
  };
  
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-day-index]')) {
      setFocusedDay(null);
    }
  };


  if (!task) {
    return null;
  }

  const { days, subtasks, columns } = timelineData;
  const gridTemplateColumns = `repeat(${columns}, minmax(100px, 1fr))`;

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
                    className="flex flex-col sticky left-0 bg-background z-10"
                >
                    {days.map((day, index) => {
                        const progress = getTaskProgressOnDay(day, subtasks);
                        const hasTasks = progress.total > 0;
                        const isCompleted = hasTasks && progress.completed === progress.total;
                        return (
                           <div 
                              key={index} 
                              data-day-index={index}
                              onClick={() => handleDayClick(day)}
                              className={cn(
                                "h-10 flex-shrink-0 flex items-center justify-end text-xs rounded-l-md transition-opacity duration-300 cursor-pointer",
                                focusedDay && !isSameDay(focusedDay, day) && "opacity-20",
                                focusedDay && isSameDay(focusedDay, day) && "bg-primary/10"
                              )}
                            >
                                <div className={cn("px-2 text-right w-24 flex items-baseline justify-end gap-1.5", isSameDay(day, new Date()) && "font-bold text-primary")}>
                                     <span className="flex-shrink-0 text-muted-foreground">{format(day, 'dd/MM')}</span>
                                     {hasTasks && (
                                        <span className={cn(
                                            "font-medium text-[11px]",
                                            isCompleted ? "text-chart-2" : "text-amber-600"
                                        )}>
                                            ({progress.completed}/{progress.total})
                                        </span>
                                     )}
                                </div>
                            </div>
                        )
                    })}
                </div>


                {/* Timeline Grid */}
                <div className="relative flex-1" style={{ minWidth: `${columns * 100}px`}}>
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 grid h-full -z-10" style={{ gridTemplateColumns }}>
                        {Array.from({ length: columns }).map((_, index) => (
                           <div key={index} className="border-r border-border/50"></div>
                        ))}
                    </div>
                     <div className="absolute inset-y-0 -left-px w-px bg-border"></div>
                     <div className="relative">
                        {/* Day rows background */}
                        {days.map((_, dayIndex) => (
                          <div key={dayIndex} className="h-10 border-b border-border/50"></div>
                        ))}

                        {/* Subtask labels */}
                        {subtasks.map((subtask, index) => {
                            if (!subtask.startDate || !subtask.endDate) return null;

                            const subtaskStart = subtask.startDate;
                            const subtaskEnd = subtask.endDate;
                            const startDayIndex = differenceInDays(startOfDay(subtaskStart), startOfDay(days[0]));
                            const durationDays = differenceInDays(startOfDay(subtaskEnd), startOfDay(subtaskStart)) + 1;

                            if (startDayIndex < 0 || startDayIndex >= days.length) return null;

                            const top = startDayIndex * 2.5; // 2.5rem is h-10
                            const height = durationDays * 2.5;

                            return (
                                <div
                                    key={subtask.id}
                                    className="absolute w-full px-1"
                                    style={{
                                        top: `${top}rem`,
                                        height: `${height}rem`,
                                        gridColumn: `${index + 1} / span 1`,
                                    }}
                                >
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={cn("h-full w-full rounded flex items-center justify-center p-2", subtask.style)}>
                                                    <p className="text-xs font-medium text-foreground truncate">{subtask.title}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <div className="text-xs">
                                                    <p className="font-bold">{subtask.title}</p>
                                                    <p>Bắt đầu: {format(subtask.startDate, 'p, dd/MM/yy', { locale: vi })}</p>
                                                    <p>Kết thúc: {format(subtask.endDate, 'p, dd/MM/yy', { locale: vi })}</p>
                                                    <p>Trạng thái: {subtask.status}</p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
