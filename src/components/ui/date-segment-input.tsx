
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface DateSegmentInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
}

export function DateSegmentInput({ value, onChange, disabled, className, ...props }: DateSegmentInputProps) {
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const [d = '', m = '', y = ''] = value ? value.split('-') : ['', '', ''];
    setDay(d.replace(/'/g, ''));
    setMonth(m.replace(/'/g, ''));
    setYear(y.replace(/'/g, ''));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  
  const triggerParentOnChange = (currentDay: string, currentMonth: string, currentYear: string) => {
      const newDate = `${currentDay || "''"}-${currentMonth || "''"}-${currentYear || "''"}`;
      if (value !== newDate) {
        onChange(newDate);
      }
  };


  const handleSegmentChange = (segment: 'day' | 'month' | 'year', segmentValue: string) => {
    const isNumeric = /^\d*$/.test(segmentValue);
    if (!isNumeric) return;

    let currentDay = day;
    let currentMonth = month;
    let currentYear = year;

    if (segment === 'day') {
      currentDay = segmentValue;
      setDay(currentDay);
    } else if (segment === 'month') {
      currentMonth = segmentValue;
      setMonth(currentMonth);
    } else if (segment === 'year') {
      currentYear = segmentValue;
      setYear(currentYear);
    }
    
    if (day === '' && month === '' && year === '' && segmentValue !== '') {
        const fullYear = new Date().getFullYear().toString();
        if (segment !== 'year') setYear(fullYear);
        currentYear = fullYear;
    }

    triggerParentOnChange(currentDay, currentMonth, currentYear);
  };
  
  const handleBlur = (segment: 'day' | 'month' | 'year') => {
    let currentDay = day;
    let currentMonth = month;
    let currentYear = year;
    
    const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
    
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const dayNum = parseInt(day, 10);

    if (segment === 'day') {
        if (day.length === 1 && dayNum > 0) {
            currentDay = day.padStart(2, '0');
            setDay(currentDay);
        } else if (isNaN(dayNum) || dayNum === 0 || (monthNum && yearNum && dayNum > daysInMonth(monthNum, yearNum)) || dayNum > 31) {
            currentDay = '';
            setDay('');
        }
    } else if (segment === 'month') {
        if (month.length === 1 && monthNum > 0) {
            currentMonth = month.padStart(2, '0');
            setMonth(currentMonth);
        } else if (isNaN(monthNum) || monthNum === 0 || monthNum > 12) {
            currentMonth = '';
            setMonth('');
        }
    } else if (segment === 'year') {
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
        "flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        !disabled && 'cursor-text',
        props['aria-invalid'] && 'border-destructive',
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
