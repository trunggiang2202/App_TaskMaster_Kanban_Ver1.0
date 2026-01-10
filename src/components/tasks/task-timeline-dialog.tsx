'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, eachDayOfInterval, differenceInDays, startOfDay, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertTriangle, Check, Circle, Clock, LoaderCircle } from 'lucide-react';

interface TaskTimelineDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task | null;
}

const getStatus = (subtask: Subtask & { start: Date, end: Date }) => {
    const now = new Date();
    if (subtask.completed) {
        return 'Xong';
    }
    if (isAfter(now, subtask.end)) {
        return 'Quá hạn';
    }
    if (isBefore(now, subtask.start)) {
        return 'Chưa bắt đầu';
    }
    return 'Đang làm';
};

export function TaskTimelineDialog({ isOpen, onOpenChange, task }: TaskTimelineDialogProps) {
  const timelineData = React.useMemo(() => {
    if (!task || task.taskType !== 'deadline' || !task.startDate || !task.endDate) return null;
    
    const subtasksWithDates = task.subtasks
      .filter(st => st.startDate && st.endDate)
      .map(st => ({
        ...st,
        start: startOfDay(st.startDate!),
        end: startOfDay(st.endDate!),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (subtasksWithDates.length === 0) return null;

    const overallStart = startOfDay(task.startDate);
    const overallEnd = startOfDay(task.endDate);

    const days = eachDayOfInterval({ start: overallStart, end: overallEnd });

    // "Bin Packing" algorithm to layout subtasks in columns
    const columns: (typeof subtasksWithDates)[] = [];
    subtasksWithDates.forEach(subtask => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const hasOverlap = column.some(existingSubtask =>
                areIntervalsOverlapping(
                    { start: subtask.start, end: subtask.end },
                    { start: existingSubtask.start, end: existingSubtask.end },
                    { inclusive: true }
                )
            );
            if (!hasOverlap) {
                column.push(subtask);
                placed = true;
                break;
            }
        }
        if (!placed) {
            columns.push([subtask]);
        }
    });
    
    const positionedSubtasks = columns.flatMap((col, colIndex) => 
        col.map(st => {
            const startDayIndex = differenceInDays(st.start, overallStart);
            const duration = differenceInDays(st.end, st.start) + 1;
            return {
                ...st,
                colIndex,
                startDayIndex: Math.max(0, startDayIndex),
                duration: Math.max(1, duration),
            };
        })
    );
    
    const subtaskCountPerDay = days.map(day => ({
      day,
      count: positionedSubtasks.filter(st => day >= st.start && day <= st.end).length
    }));


    return { days, positionedSubtasks, numColumns: columns.length, subtaskCountPerDay };
  }, [task]);


  if (!task || !timelineData) {
    // Return a dialog with a message if there's no data
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lộ trình: {task?.title}</DialogTitle>
                </DialogHeader>
                <div className="py-10 text-center text-muted-foreground">
                    Không có công việc con nào có deadline để hiển thị.
                </div>
            </DialogContent>
        </Dialog>
    );
  }

  const { days, positionedSubtasks, numColumns, subtaskCountPerDay } = timelineData;
  const gridTemplateColumns = `auto repeat(${numColumns}, minmax(100px, 1fr))`;

  const statusIcons: Record<string, React.ReactNode> = {
    'Xong': <Check className="h-3 w-3 text-white" />,
    'Đang làm': <Clock className="h-3 w-3 text-amber-900" />,
    'Quá hạn': <AlertTriangle className="h-3 w-3 text-white" />,
    'Chưa bắt đầu': <Circle className="h-3 w-3 text-primary-foreground" />,
  };
  const statusColors: Record<string, string> = {
    'Xong': 'bg-chart-2',
    'Đang làm': 'bg-amber-400',
    'Quá hạn': 'bg-destructive',
    'Chưa bắt đầu': 'bg-primary/80',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lộ trình: {task.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-1">
            <div className="grid gap-px" style={{ gridTemplateColumns }}>
              {/* Header */}
              <div className="sticky top-0 z-20 bg-background pr-2 text-xs font-semibold text-right text-muted-foreground">Ngày</div>
              {Array.from({ length: numColumns }).map((_, i) => (
                <div key={`header-${i}`} className="sticky top-0 z-20 bg-background text-center text-xs font-semibold text-muted-foreground">
                  Công việc
                </div>
              ))}

              {/* Day labels and grid lines */}
              {subtaskCountPerDay.map(({day, count}, dayIndex) => (
                <React.Fragment key={day.toISOString()}>
                  <div className="sticky left-0 z-10 bg-background pr-2 h-10 flex flex-col items-end justify-center border-t border-muted-foreground/30">
                     <span className="text-sm font-semibold">{format(day, 'dd')}</span>
                     <span className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: vi })}</span>
                  </div>
                  <div 
                    className="col-span-full h-10 border-t border-muted-foreground/30"
                    style={{ gridColumn: `2 / span ${numColumns}`, gridRow: dayIndex + 2 }}
                  ></div>
                   {count > 0 && (
                      <div className="sticky left-[calc(100%-12px)] z-20 h-10 flex items-center justify-center">
                          <div className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                            {count}
                          </div>
                      </div>
                    )}
                </React.Fragment>
              ))}

              {/* Subtask labels */}
              {positionedSubtasks.map(subtask => {
                const status = getStatus(subtask);
                return (
                  <div
                    key={subtask.id}
                    className="relative p-1"
                    style={{
                      gridColumn: subtask.colIndex + 2,
                      gridRow: `${subtask.startDayIndex + 2} / span ${subtask.duration}`,
                    }}
                  >
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                              "h-full w-full rounded-md flex items-center px-2 text-xs font-medium cursor-default overflow-hidden",
                              statusColors[status]
                            )}>
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <div className="shrink-0">{statusIcons[status]}</div>
                                <span className="truncate text-white">{subtask.title}</span>
                              </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-bold">{subtask.title}</p>
                          <p>Trạng thái: {status}</p>
                          <p>Bắt đầu: {format(subtask.start, 'dd/MM/yyyy')}</p>
                          <p>Kết thúc: {format(subtask.end, 'dd/MM/yyyy')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}