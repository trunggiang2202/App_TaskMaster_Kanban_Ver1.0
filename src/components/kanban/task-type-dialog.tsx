
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Repeat, Zap } from 'lucide-react';
import type { TaskType } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface TaskTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectType: (type: TaskType) => void;
}

const TypeButton = ({ type, selectedType, onSelect, children, icon: Icon }: { type: TaskType, selectedType: TaskType | null, onSelect: (type: TaskType) => void, children: React.ReactNode, icon: React.ElementType }) => (
    <button
        className={cn(
            "group p-4 text-left rounded-lg border transition-all flex items-center gap-4",
            "bg-transparent hover:bg-primary hover:text-primary-foreground",
            selectedType === type
                ? 'border-primary ring-2 ring-primary text-primary' 
                : 'text-muted-foreground border-border'
        )}
        onClick={() => onSelect(type)}
    >
        <Icon className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            selectedType === type ? 'text-primary' : 'text-muted-foreground',
            "group-hover:text-primary-foreground"
        )} />
        <div>
            <p className={cn(
                "font-semibold transition-colors", 
                selectedType === type ? 'text-primary' : 'text-card-foreground',
                "group-hover:text-primary-foreground"
            )}>
                {children}
            </p>
        </div>
    </button>
);


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
          <DialogTitle>Chọn loại mục tiêu</DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <TypeButton type="deadline" selectedType={selectedType} onSelect={handleSelect} icon={Clock}>
                Có deadline
            </TypeButton>
            <TypeButton type="recurring" selectedType={selectedType} onSelect={handleSelect} icon={Repeat}>
                Lặp lại
            </TypeButton>
        </div>
         <div className="pt-2">
            <TypeButton type="idea" selectedType={selectedType} onSelect={handleSelect} icon={Zap}>
                Mục tiêu nháp
            </TypeButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
