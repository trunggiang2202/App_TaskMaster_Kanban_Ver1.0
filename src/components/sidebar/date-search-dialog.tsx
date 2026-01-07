
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValid, parse } from 'date-fns';

interface DateSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDateSelect: (date: Date) => void;
}

export function DateSearchDialog({ isOpen, onOpenChange, onDateSelect }: DateSearchDialogProps) {
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSearch = () => {
    setError(null);
    const dateStr = `${year}-${month}-${day}`;
    const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    
    if (isValid(parsedDate) && parsedDate.getFullYear() === parseInt(year) && (parsedDate.getMonth() + 1) === parseInt(month) && parsedDate.getDate() === parseInt(day)) {
      onDateSelect(parsedDate);
    } else {
      setError('Ngày không hợp lệ. Vui lòng kiểm tra lại.');
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, maxLength: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= maxLength) {
      setter(value);
    }
  };
  
  React.useEffect(() => {
    if (isOpen) {
        const today = new Date();
        setDay(String(today.getDate()).padStart(2, '0'));
        setMonth(String(today.getMonth() + 1).padStart(2, '0'));
        setYear(String(today.getFullYear()));
        setError(null);
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tìm kiếm ngày
          </DialogTitle>
          <DialogDescription>
            Nhập ngày, tháng, năm để nhảy đến ngày đó.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 py-4">
          <div className="space-y-1">
            <Label htmlFor="day" className="text-right">
              Ngày
            </Label>
            <Input id="day" value={day} onChange={handleInputChange(setDay, 2)} placeholder="DD" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="month" className="text-right">
              Tháng
            </Label>
            <Input id="month" value={month} onChange={handleInputChange(setMonth, 2)} placeholder="MM" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="year" className="text-right">
              Năm
            </Label>
            <Input id="year" value={year} onChange={handleInputChange(setYear, 4)} placeholder="YYYY" />
          </div>
        </div>
        {error && <p className="text-sm text-destructive text-center -mt-2">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSearch} className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Tìm kiếm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
