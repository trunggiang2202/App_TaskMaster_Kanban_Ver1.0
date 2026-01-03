'use client';

import type { Subtask, Attachment } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Paperclip, Download } from 'lucide-react';

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors text-sm"
    >
      <Paperclip className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate text-foreground">{attachment.name}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );

interface SubtaskDetailDialogProps {
  subtask: Subtask | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SubtaskDetailDialog({ subtask, isOpen, onOpenChange }: SubtaskDetailDialogProps) {
  if (!subtask) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{subtask.title}</DialogTitle>
          {subtask.description && (
             <DialogDescription className="pt-2">{subtask.description}</DialogDescription>
          )}
        </DialogHeader>
        
        {subtask.attachments && subtask.attachments.length > 0 && (
          <div className="space-y-3 pt-2">
             <h3 className="text-sm font-medium text-muted-foreground">Tệp đính kèm</h3>
            <div className="space-y-2">
              {subtask.attachments.map((att, index) => <AttachmentItem key={index} attachment={att} />)}
            </div>
          </div>
        )}

        {!subtask.description && (!subtask.attachments || subtask.attachments.length === 0) && (
            <p className="text-sm text-muted-foreground pt-2">Công việc này không có mô tả chi tiết hay tệp đính kèm.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
