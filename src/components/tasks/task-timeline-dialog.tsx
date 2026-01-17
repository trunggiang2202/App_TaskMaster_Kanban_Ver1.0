
'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, eachDayOfInterval, isSameDay, startOfDay, isBefore, isAfter } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface TaskTimelineDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task | null;
}

type SubtaskTimelineStatus = 'upcoming' | 'in-progress' | 'done' | 'overdue';

const SubtaskBadge: React.FC<{ subtask: Subtask }> = ({ subtask }) => {
    const getStatusForSubtask = (subtask: Subtask): SubtaskTimelineStatus => {
        const now = new Date();
        if (subtask.completed) {
          return 'done';
        }
        if (subtask.startDate && isBefore(now, subtask.startDate)) {
           return 'upcoming';
        }
        if (subtask.endDate && isAfter(now, subtask.endDate)) {
          return 'overdue';
        }
        return 'in-progress';
    };
    
    const statusStyles: Record<SubtaskTimelineStatus, string> = {
        upcoming: 'bg-primary/90 text-primary-foreground border-transparent',
        'in-progress': 'bg-amber-500 text-white border-transparent',
        done: 'bg-chart-2 text-white border-transparent',
        overdue: 'bg-destructive text-destructive-foreground border-transparent',
    };
    
    const status = getStatusForSubtask(subtask);
    const truncatedTitle = subtask.title.length > 5 ? `${subtask.title.substring(0, 5)}...` : subtask.title;
    
    const badge = (
        <Badge
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                statusStyles[status]
            )}
        >
            {truncatedTitle}
        </Badge>
    );

    if (subtask.title.length > 5) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* We need a div wrapper for TooltipTrigger when child is a custom component */}
                        <div>{badge}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{subtask.title}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return badge;
};


export function TaskTimelineDialog({ isOpen, onOpenChange, task }: TaskTimelineDialogProps) {
  const timelineData = React.useMemo(() => {
    if (!task || task.taskType !== 'deadline' || !task.startDate || !task.endDate) {
      return [];
    }

    const interval = {
      start: startOfDay(task.startDate),
      end: startOfDay(task.endDate),
    };

    if (interval.start > interval.end) return [];

    const days = eachDayOfInterval(interval);

    return days.map(day => {
      const activeSubtasks = task.subtasks.filter(st =>
        st.startDate && isSameDay(day, startOfDay(st.startDate))
      );
      return {
        date: day,
        subtasks: activeSubtasks,
      };
    });
  }, [task]);
  
  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lộ trình: {task?.title}</DialogTitle>
           {timelineData.length > 0 && (
            <DialogDescription>
              Tổng số ngày: {timelineData.length}
            </DialogDescription>
          )}
        </DialogHeader>
        <Separator />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-3 gap-4 px-1 pb-2 border-b-2">
              <div className="col-span-1 font-semibold text-sm text-muted-foreground">Ngày/tháng</div>
              <div className="col-span-2 font-semibold text-sm text-muted-foreground pl-4">Công việc</div>
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="pr-2 pt-1">
              {timelineData.length > 0 ? (
                timelineData.map(({ date, subtasks }, index) => (
                  <div key={index} className="grid grid-cols-3 items-start border-b-2">
                    <div className="col-span-1 text-left sticky top-0 bg-background py-3">
                      <p className="font-semibold text-sm text-foreground">{format(date, 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{format(date, 'eeee', { locale: vi })}</p>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2 items-center border-l-2 py-3 px-4 min-h-[58px]">
                      {subtasks.length > 0 ? (
                        subtasks.map(st => (
                            <SubtaskBadge 
                              key={st.id}
                              subtask={st}
                            />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Không có công việc nào</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full py-10">
                  <p className="text-sm text-muted-foreground">Lộ trình này không có công việc nào có deadline cụ thể.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
