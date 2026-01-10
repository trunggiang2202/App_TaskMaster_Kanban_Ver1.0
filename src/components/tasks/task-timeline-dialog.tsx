
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
  return 'Đang làm';
};

const getTimelineCellStyle = (status: string, subtask: Subtask, now: Date) => {
    switch (status) {
        case 'Xong':
            const wasOverdue = subtask.endDate && isBefore(subtask.endDate, now);
            return wasOverdue ? 'border border-destructive/30 border-l-4 border-l-destructive bg-background' : 'border border-chart-2/30 border-l-4 border-l-chart-2 bg-background';
        case 'Đang làm':
            return 'border border-amber-500/30 border-l-4 border-l-amber-500 bg-background';
        case 'Quá hạn':
            return 'border border-destructive/30 border-l-4 border-l-destructive bg-background';
        case 'Chưa bắt đầu':
        default:
            return 'border border-primary/30 border-l-4 border-l-primary bg-background';
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
        const style = getTimelineCellStyle(status, subtask, now);
        return {
          ...subtask,
          status,
          style,
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
                                                        <div className={cn("h-full w-full rounded flex items-center px-2 cursor-pointer", subtask.style)}>
                                                            <p className="text-xs font-medium text-foreground truncate">{subtask.title}</p>
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
