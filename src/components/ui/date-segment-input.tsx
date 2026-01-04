
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
  const [day, month, year] = React.useMemo(() => {
    return value ? value.split('-') : ['', '', ''];
  }, [value]);

  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  const handleSegmentChange = (segment: 'day' | 'month' | 'year', segmentValue: string) => {
    let newDate = `${day}-${month}-${year}`;
    if (segment === 'day') {
      newDate = `${segmentValue}-${month}-${year}`;
      if (segmentValue.length === 2) {
        monthRef.current?.focus();
      }
    } else if (segment === 'month') {
      newDate = `${day}-${segmentValue}-${year}`;
      if (segmentValue.length === 2) {
        yearRef.current?.focus();
      }
    } else if (segment === 'year') {
      newDate = `${day}-${month}-${segmentValue}`;
    }
    
    // Only call onChange if the format might be valid, or is being cleared
    if (newDate.length <= 10) {
      onChange(newDate);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, segment: 'day' | 'month' | 'year') => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && target.value === '') {
      if (segment === 'year') monthRef.current?.focus();
      if (segment === 'month') dayRef.current?.focus();
    }
  }

  return (
    <div className={cn(
        "flex items-center h-10 w-full rounded-md border border-input bg-background text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
    )}>
        <Input
            ref={dayRef}
            value={day}
            onChange={(e) => handleSegmentChange('day', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'day')}
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
