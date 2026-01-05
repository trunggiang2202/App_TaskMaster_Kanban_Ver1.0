
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

interface TaskTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectType: (type: TaskType) => void;
}

export function TaskTypeDialog({ isOpen, onOpenChange, onSelectType }: TaskTypeDialogProps) {
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
                className="h-24 flex-col gap-2"
                onClick={() => onSelectType('deadline')}
            >
                <Zap className="h-6 w-6 text-primary" />
                <span className="font-semibold">Có deadline</span>
            </Button>
            <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => onSelectType('recurring')}
            >
                <Repeat className="h-6 w-6 text-accent" />
                <span className="font-semibold">Lặp lại</span>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
