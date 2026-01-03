
'use client';

import * as React from 'react';
import { startOfWeek, addDays, format, isSameDay, isSameWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekViewProps {
  tasks: Task[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
}

export function WeekView({ tasks, selectedDay, onSelectDay, currentDate, onPrevWeek, onNextWeek, onGoToToday }: WeekViewProps) {
  const today = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Bắt đầu từ thứ 2

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const hasTasksOnDay = (day: Date) => {
    return tasks.some(task => 
        (task.startDate && isSameDay(task.startDate, day)) ||
        (task.endDate && isSameDay(task.endDate, day)) ||
        task.subtasks.some(st => st.startDate && isSameDay(st.startDate, day))
    );
  };
  
  const isCurrentWeek = isSameWeek(currentDate, today, { weekStartsOn: 1 });

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="px-2 pt-3 pb-2">
      <div className="flex items-center justify-between px-2 mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold text-sidebar-foreground">
             Tháng {format(currentDate, 'M, yyyy')}
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex flex-col items-center justify-center p-1 rounded-md transition-none h-14",
              isSameDay(day, selectedDay)
                ? "bg-sidebar-primary/90 text-sidebar-primary-foreground"
                : "hover:bg-sidebar-accent/80",
              isSameDay(day, today) && !isSameDay(day, selectedDay)
                ? "bg-sidebar-accent/50"
                : ""
            )}
          >
            <span className="text-xs font-medium uppercase">
              {dayNames[getDay(day)]}
            </span>
            <span className="text-lg font-bold">
              {format(day, 'd')}
            </span>
            {hasTasksOnDay(day) && (
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-0.5"></div>
            )}
          </button>
        ))}
      </div>
      {!isCurrentWeek && (
        <div className="mt-2 px-2">
            <Button variant="outline" size="sm" className="w-full" onClick={onGoToToday}>
                Quay về hôm nay
            </Button>
        </div>
      )}
    </div>
  );
}
