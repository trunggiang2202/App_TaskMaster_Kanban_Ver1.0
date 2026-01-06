
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
            <Button
                variant="outline"
                className={cn(
                    "h-24 justify-start p-4 text-left",
                    selectedType === 'deadline' && 'bg-primary text-primary-foreground'
                )}
                onClick={() => handleSelect('deadline')}
            >
                <Zap className="h-5 w-5 mr-3" />
                <div className="flex flex-col">
                    <span className="font-semibold">Có deadline</span>
                    <span className="text-xs text-muted-foreground">Ngày hết hạn cụ thể</span>
                </div>
            </Button>
            <Button
                variant="outline"
                 className={cn(
                    "h-24 justify-start p-4 text-left",
                    selectedType === 'recurring' && 'bg-primary text-primary-foreground'
                )}
                onClick={() => handleSelect('recurring')}
            >
                <Repeat className="h-5 w-5 mr-3" />
                <div className="flex flex-col">
                    <span className="font-semibold">Lặp lại</span>
                    <span className="text-xs text-muted-foreground">Theo các ngày trong tuần</span>
                </div>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
