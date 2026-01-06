
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Repeat } from 'lucide-react';
import type { TaskType } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
        </DialogHeader>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <button
                className={cn(
                    "group p-4 text-left rounded-lg border transition-all flex items-center gap-4",
                    "bg-transparent hover:bg-primary hover:text-primary-foreground",
                    selectedType === 'deadline' 
                        ? 'border-primary ring-2 ring-primary text-primary' 
                        : 'text-muted-foreground border-border'
                )}
                onClick={() => handleSelect('deadline')}
            >
                <Clock className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    selectedType === 'deadline' ? 'text-primary' : 'text-muted-foreground',
                    "group-hover:text-primary-foreground"
                )} />
                <div>
                    <p className={cn(
                        "font-semibold transition-colors", 
                        selectedType === 'deadline' ? 'text-primary' : 'text-card-foreground',
                        "group-hover:text-primary-foreground"
                    )}>Có deadline</p>
                </div>
            </button>
            <button
                 className={cn(
                    "group p-4 text-left rounded-lg border transition-all flex items-center gap-4",
                    "bg-transparent hover:bg-primary hover:text-primary-foreground",
                     selectedType === 'recurring' 
                        ? 'border-primary ring-2 ring-primary text-primary' 
                        : 'text-muted-foreground border-border'
                )}
                onClick={() => handleSelect('recurring')}
            >
                <Repeat className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    selectedType === 'recurring' ? 'text-primary' : 'text-muted-foreground',
                    "group-hover:text-primary-foreground"
                )} />
                <div>
                    <p className={cn(
                        "font-semibold transition-colors", 
                        selectedType === 'recurring' ? 'text-primary' : 'text-card-foreground',
                        "group-hover:text-primary-foreground"
                    )}>Lặp lại</p>
                </div>
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
