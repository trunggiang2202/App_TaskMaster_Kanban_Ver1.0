

'use client';

import * as React from 'react';
import { startOfWeek, addDays, format, isSameDay, isSameWeek, getDay, isAfter, isBefore, startOfDay, isValid, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DateSearchBar = ({ onDateSelect, onClose }: { onDateSelect: (date: Date) => void, onClose: () => void }) => {
    const [day, setDay] = React.useState('');
    const [month, setMonth] = React.useState('');
    const [year, setYear] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const today = new Date();
        setDay(String(today.getDate()).padStart(2, '0'));
        setMonth(String(today.getMonth() + 1).padStart(2, '0'));
        setYear(String(today.getFullYear()));
        setError(null);
    }, []);

    const handleSearch = () => {
        setError(null);
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        
        if (isValid(parsedDate) && parsedDate.getFullYear() === parseInt(year) && (parsedDate.getMonth() + 1) === parseInt(month) && parsedDate.getDate() === parseInt(day)) {
          onDateSelect(parsedDate);
          onClose();
        } else {
          setError('Ngày không hợp lệ.');
        }
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, maxLength: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= maxLength) {
          setter(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }

    return (
        <div className="p-2 space-y-3 bg-sidebar-accent/50 rounded-md mb-2" onKeyDown={handleKeyDown}>
             <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label htmlFor="day" className="text-xs">Ngày</Label>
                    <Input id="day" value={day} onChange={handleInputChange(setDay, 2)} placeholder="DD" className="h-8 bg-sidebar-accent"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="month" className="text-xs">Tháng</Label>
                    <Input id="month" value={month} onChange={handleInputChange(setMonth, 2)} placeholder="MM" className="h-8 bg-sidebar-accent"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="year" className="text-xs">Năm</Label>
                    <Input id="year" value={year} onChange={handleInputChange(setYear, 4)} placeholder="YYYY" className="h-8 bg-sidebar-accent"/>
                </div>
            </div>
            {error && <p className="text-sm text-destructive text-center -mt-2">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
                <Button onClick={onClose} variant="ghost" size="sm">Hủy</Button>
                <Button onClick={handleSearch} size="sm">
                    <Search className="mr-2 h-4 w-4" />
                    Tìm
                </Button>
            </div>
        </div>
    );
};

interface WeekViewProps {
  tasks: Task[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  onDateSearch: (date: Date) => void;
}

export function WeekView({ tasks, selectedDay, onSelectDay, currentDate, onPrevWeek, onNextWeek, onGoToToday, onDateSearch }: WeekViewProps) {
  const today = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Bắt đầu từ thứ 2
  const [showSearch, setShowSearch] = React.useState(false);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const hasTasksOnDay = (day: Date) => {
    const sDay = startOfDay(day);
    const dayOfWeek = getDay(sDay);

    return tasks.some(task => {
      if (task.taskType === 'recurring') {
        return task.recurringDays?.includes(dayOfWeek);
      }
      return task.subtasks.some(st => {
        if (!st.startDate || !st.endDate) return false;
        const subtaskStart = startOfDay(st.startDate);
        const subtaskEnd = startOfDay(st.endDate);
        return !isAfter(sDay, subtaskEnd) && !isBefore(sDay, subtaskStart);
      })
    });
  };
  
  const isCurrentWeek = isSameWeek(currentDate, today, { weekStartsOn: 1 });

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="px-2 pt-3 pb-2">
      {showSearch ? (
        <DateSearchBar onDateSelect={onDateSearch} onClose={() => setShowSearch(false)} />
      ) : (
        <div className="flex items-center justify-between px-2 mb-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold text-sidebar-foreground">
                Tháng {format(currentDate, 'M, yyyy')}
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSearch(true)}>
                  <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      )}
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
            <Button variant="ghost" size="sm" className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground" onClick={onGoToToday}>
                Quay về hôm nay
            </Button>
        </div>
      )}
    </div>
  );
}
