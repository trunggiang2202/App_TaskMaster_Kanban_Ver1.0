
'use client';

import * as React from 'react';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface WeekViewProps {
  tasks: Task[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}

export function WeekView({ tasks, selectedDay, onSelectDay }: WeekViewProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Bắt đầu từ thứ 2

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const hasTasksOnDay = (day: Date) => {
    return tasks.some(task => 
        (task.startDate && isSameDay(task.startDate, day)) ||
        (task.endDate && isSameDay(task.endDate, day)) ||
        task.subtasks.some(st => st.startDate && isSameDay(st.startDate, day))
    );
  };

  return (
    <div className="px-4 pt-3 pb-2">
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
              {format(day, 'E', { locale: vi })}
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
    </div>
  );
}
