
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Repeat } from 'lucide-react';
import type { TaskType } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TaskTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectType: (type: TaskType) => void;
}

export function TaskTypeDialog({ isOpen, onOpenChange, onSelectType }: TaskTypeDialogProps) {
    const [selectedType, setSelectedType] = useState<TaskType | null>(null);

    const handleSelect = (type: TaskType) => {
        setSelectedType(type);
        setTimeout(() => onSelectType(type), 150); // Delay for visual feedback
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn loại nhiệm vụ</DialogTitle>
          <DialogDescription>
            Bạn muốn tạo một nhiệm vụ có hạn cuối cụ thể hay một nhiệm vụ lặp lại hàng tuần?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <button
                className={cn(
                    "h-24 justify-start p-4 text-left flex-col items-start rounded-lg border bg-card transition-all flex",
                    selectedType === 'deadline' 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'text-muted-foreground'
                )}
                onClick={() => handleSelect('deadline')}
            >
                <Zap className={cn("h-5 w-5 mb-2", selectedType === 'deadline' && 'text-primary')} />
                <span className={cn("font-semibold", selectedType === 'deadline' ? 'text-primary' : 'text-card-foreground')}>Có deadline</span>
                <span className="text-xs">Ngày hết hạn cụ thể</span>
            </button>
            <button
                className={cn(
                    "h-24 justify-start p-4 text-left flex-col items-start rounded-lg border bg-card transition-all flex",
                     selectedType === 'recurring' 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'text-muted-foreground'
                )}
                onClick={() => handleSelect('recurring')}
            >
                <Repeat className={cn("h-5 w-5 mb-2", selectedType === 'recurring' && 'text-primary')} />
                <span className={cn("font-semibold", selectedType === 'recurring' ? 'text-primary' : 'text-card-foreground')}>Lặp lại</span>
                <span className="text-xs">Theo các ngày trong tuần</span>
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
