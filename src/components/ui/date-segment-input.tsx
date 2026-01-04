
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface DateSegmentInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateSegmentInput({ value, onChange, disabled, className }: DateSegmentInputProps) {
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const [d = '', m = '', y = ''] = value ? value.split('-') : ['', '', ''];
    if (d !== day) setDay(d);
    if (m !== month) setMonth(m);
    if (y !== year) setYear(y);
  }, [value]);
  
  const triggerParentOnChange = (currentDay: string, currentMonth: string, currentYear: string) => {
    if (currentDay.length === 2 && currentMonth.length === 2 && currentYear.length === 4) {
      const newDate = `${currentDay}-${currentMonth}-${currentYear}`;
      if (value !== newDate) {
        onChange(newDate);
      }
    } else if (value) {
        // If not a full date, we pass up the partials for validation logic
        const newDate = `${currentDay}-${currentMonth}-${currentYear}`;
        if (value !== newDate) {
            onChange(newDate);
        }
    }
  };


  const handleSegmentChange = (segment: 'day' | 'month' | 'year', segmentValue: string) => {
    const isNumeric = /^\d*$/.test(segmentValue);
    if (!isNumeric) return;

    if (segment === 'day') {
      const newDay = segmentValue;
      setDay(newDay);
      triggerParentOnChange(newDay, month, year);
    } else if (segment === 'month') {
      const newMonth = segmentValue;
      setMonth(newMonth);
      triggerParentOnChange(day, newMonth, year);
    } else if (segment === 'year') {
      const newYear = segmentValue;
      setYear(newYear);
      triggerParentOnChange(day, month, newYear);
    }
  };
  
  const handleBlur = (segment: 'day' | 'month' | 'year') => {
    let currentDay = day;
    let currentMonth = month;
    let currentYear = year;
    
    if (segment === 'day') {
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        const daysInMonth = (monthNum && yearNum) ? new Date(yearNum, monthNum, 0).getDate() : 31;

        if (day.length === 1 && dayNum > 0) {
            currentDay = day.padStart(2, '0');
            setDay(currentDay);
        } else if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) {
            currentDay = '';
            setDay('');
        }
    } else if (segment === 'month') {
        const monthNum = parseInt(month, 10);
        if (month.length === 1 && monthNum > 0) {
            currentMonth = month.padStart(2, '0');
            setMonth(currentMonth);
        } else if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            currentMonth = '';
            setMonth('');
        }
    } else if (segment === 'year') {
        const yearNum = parseInt(year, 10);
        if (year.length > 0 && (yearNum < 1900 || yearNum > 2100)) {
            currentYear = '';
            setYear('');
        }
    }

    triggerParentOnChange(currentDay, currentMonth, currentYear);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, segment: 'day' | 'month' | 'year') => {
    const target = e.target as HTMLInputElement;

    if (e.key === 'ArrowRight') {
        if (target.selectionStart === target.value.length) {
            e.preventDefault();
            if (segment === 'day') monthRef.current?.focus();
            if (segment === 'month') yearRef.current?.focus();
        }
    }

    if (e.key === 'ArrowLeft') {
        if (target.selectionStart === 0) {
            e.preventDefault();
            if (segment === 'year') monthRef.current?.focus();
            if (segment === 'month') dayRef.current?.focus();
        }
    }

    if (e.key === 'Backspace' && target.value === '') {
      e.preventDefault();
      if (segment === 'year') {
        monthRef.current?.focus();
      }
      if (segment === 'month') {
        dayRef.current?.focus();
      }
    }
  }

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT') {
      return; 
    }
    
    if (containerRef.current && dayRef.current && monthRef.current && yearRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - containerRect.left;

        const dayRect = dayRef.current.getBoundingClientRect();
        const monthRect = monthRef.current.getBoundingClientRect();

        const dayBoundary = (dayRect.right - containerRect.left);
        const monthBoundary = (monthRect.right - containerRect.left);

        if (clickX < dayBoundary) {
            dayRef.current.focus();
        } else if (clickX < monthBoundary) {
            monthRef.current.focus();
        } else {
            yearRef.current.focus();
        }
    }
  };


  return (
    <div 
        ref={containerRef}
        onClick={handleContainerClick}
        className={cn(
        "flex items-center h-10 w-full rounded-md border border-input bg-primary/5 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        !disabled && 'cursor-text',
        className
    )}>
        <Input
            ref={dayRef}
            value={day}
            onChange={(e) => handleSegmentChange('day', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'day')}
            onBlur={() => handleBlur('day')}
            placeholder="DD"
            maxLength={2}
            disabled={disabled}
            className="w-10 border-none bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
        />
        <span className="text-muted-foreground">-</span>
        <Input
            ref={monthRef}
            value={month}
            onChange={(e) => handleSegmentChange('month', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'month')}
            onBlur={() => handleBlur('month')}
            placeholder="MM"
            maxLength={2}
            disabled={disabled}
            className="w-10 border-none bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
        />
        <span className="text-muted-foreground">-</span>
        <Input
            ref={yearRef}
            value={year}
            onChange={(e) => handleSegmentChange('year', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'year')}
            onBlur={() => handleBlur('year')}
            placeholder="YYYY"
            maxLength={4}
            disabled={disabled}
            className="w-16 border-none bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
        />
    </div>
  );
}
