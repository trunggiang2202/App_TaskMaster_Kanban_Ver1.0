
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
import { format, eachDayOfInterval, isWithinInterval, startOfDay, isBefore, isAfter } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TaskTimelineDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task | null;
}

type SubtaskTimelineStatus = 'upcoming' | 'in-progress' | 'done' | 'overdue';


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
        st.startDate &&
        st.endDate &&
        isWithinInterval(day, {
          start: startOfDay(st.startDate),
          end: startOfDay(st.endDate),
        })
      );
      return {
        date: day,
        subtasks: activeSubtasks,
      };
    });
  }, [task]);

  const getStatusForSubtask = (subtask: Subtask): SubtaskTimelineStatus => {
    const now = new Date();
    if (subtask.completed) {
      return 'done';
    }
    if (subtask.endDate && isBefore(now, subtask.endDate)) {
       if (subtask.startDate && isAfter(now, subtask.startDate)) {
            return 'in-progress';
       }
       return 'upcoming';
    }
    if (subtask.endDate && isAfter(now, subtask.endDate)) {
      return 'overdue';
    }
    return 'upcoming';
  };
  
  const statusStyles: Record<SubtaskTimelineStatus, string> = {
    upcoming: 'bg-primary/90 text-primary-foreground border-transparent',
    'in-progress': 'bg-amber-500 text-white border-transparent',
    done: 'bg-chart-2/90 text-white border-transparent',
    overdue: 'bg-destructive text-destructive-foreground border-transparent',
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lộ trình: {task?.title}</DialogTitle>
        </DialogHeader>
        <Separator />
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pr-2">
            {timelineData.length > 0 ? (
              timelineData.map(({ date, subtasks }, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-start">
                  <div className="col-span-1 text-left sticky top-0 bg-background py-2">
                    <p className="font-semibold text-sm text-foreground">{format(date, 'dd/MM/yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{format(date, 'eeee', { locale: vi })}</p>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 items-center border-l pl-4 py-2 min-h-[50px]">
                    {subtasks.length > 0 ? (
                      subtasks.map(st => {
                        const status = getStatusForSubtask(st);
                        return (
                          <Badge 
                            key={st.id}
                            className={cn(
                              "font-normal",
                              statusStyles[status],
                              st.completed && "line-through"
                            )}
                          >
                            {st.title}
                          </Badge>
                        )
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Không có công việc nào</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full py-10">
                <p className="text-sm text-muted-foreground">Nhiệm vụ này không có công việc nào có deadline cụ thể.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
