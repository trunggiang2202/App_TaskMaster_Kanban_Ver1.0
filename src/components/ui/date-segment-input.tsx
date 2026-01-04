
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

  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  // Sync local state with parent value prop
  React.useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setDay(parts[0] || '');
      setMonth(parts[1] || '');
      setYear(parts[2] || '');
    } else {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);
  
  const triggerParentOnChange = React.useCallback(() => {
    const newDate = `${day}-${month}-${year}`;
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      onChange(newDate);
    }
  }, [day, month, year, onChange]);

  React.useEffect(() => {
    triggerParentOnChange();
  }, [day, month, year, triggerParentOnChange]);


  const handleSegmentChange = (segment: 'day' | 'month' | 'year', segmentValue: string) => {
    const isNumeric = /^\d*$/.test(segmentValue);
    if (!isNumeric) return;

    if (segment === 'day') {
      setDay(segmentValue);
      const dayNum = parseInt(segmentValue, 10);
      if (segmentValue.length === 2 || dayNum > 3) {
        monthRef.current?.focus();
      }
    } else if (segment === 'month') {
      setMonth(segmentValue);
      const monthNum = parseInt(segmentValue, 10);
      if (segmentValue.length === 2 || monthNum > 1) {
        yearRef.current?.focus();
      }
    } else if (segment === 'year') {
      setYear(segmentValue);
    }
  };
  
  const handleBlur = (segment: 'day' | 'month' | 'year') => {
    if (segment === 'day') {
        if (day.length === 1 && parseInt(day, 10) > 0) {
            setDay(day.padStart(2, '0'));
        }
    } else if (segment === 'month') {
        if (month.length === 1 && parseInt(month, 10) > 0) {
            setMonth(month.padStart(2, '0'));
        }
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, segment: 'day' | 'month' | 'year') => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && target.value === '') {
      e.preventDefault();
      if (segment === 'year') monthRef.current?.focus();
      if (segment === 'month') dayRef.current?.focus();
    }
  }

  return (
    <div className={cn(
        "flex items-center h-10 w-full rounded-md border border-input bg-primary/5 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
            placeholder="YYYY"
            maxLength={4}
            disabled={disabled}
            className="w-16 border-none bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
        />
    </div>
  );
}
