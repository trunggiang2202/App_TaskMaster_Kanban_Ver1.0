
'use client';

import * as React from 'react';
import type { Subtask, Attachment } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Paperclip, Download, Clock } from 'lucide-react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
    if (attachment.type === 'image') {
        return (
            <a 
                href={attachment.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block relative"
            >
                <Image src={attachment.url} alt={attachment.name} width={400} height={300} className="w-full h-auto object-cover rounded-md" />
            </a>
        );
    }
    
    return (
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        download={attachment.name}
        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors text-sm"
      >
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-foreground">{attachment.name}</span>
        <Download className="h-4 w-4 text-muted-foreground" />
      </a>
    );
};

const SubtaskTimeProgress: React.FC<{ subtask: Subtask }> = ({ subtask }) => {
  const { startDate, endDate, completed } = subtask;
  const [timeProgress, setTimeProgress] = React.useState(100);
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    if (!startDate || !endDate) return;

    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      if (completed) return 100;
      if (now >= end) return 0;
      if (now < start) return 100;
      
      const percentage = ((end - now) / (end - start)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    };

    const calculateTimeLeft = () => {
      if (completed) return 'Đã hoàn thành';
      if (!startDate || !endDate) return 'Chưa có deadline';

      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;

      if (distance < 0) return 'Đã quá hạn';

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      
      return result.trim() === '' ? '0s' : result.trim();
    };

    const updateTimes = () => {
        setTimeProgress(calculateTimeProgress());
        setTimeLeft(calculateTimeLeft());
    };
    
    updateTimes();
    
    if (!completed) {
      const interval = setInterval(updateTimes, 1000);
      return () => clearInterval(interval);
    }
  }, [startDate, endDate, completed]);
  
  if (!startDate || !endDate) {
    return null;
  }

  const isOverdue = timeProgress === 0 && !completed;
  const isWarning = timeProgress < 20 && !completed;

  const getProgressColor = () => {
    if (completed) return 'bg-emerald-500';
    if (isOverdue || isWarning) return 'bg-destructive';
    return 'bg-emerald-500';
  };

  const getTimeLeftColor = () => {
    if (completed) return 'text-emerald-500';
    if (isOverdue || isWarning) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className={`flex items-center gap-1.5 font-semibold ${getTimeLeftColor()}`}>
            <Clock size={12} /> {timeLeft}
          </span>
        </div>
        <Progress value={timeProgress} className="h-1.5" indicatorClassName={getProgressColor()} />
      </div>
    </div>
  );
}

interface SubtaskDetailDialogProps {
  subtask: Subtask | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SubtaskDetailDialog({ subtask, isOpen, onOpenChange }: SubtaskDetailDialogProps) {
  if (!subtask) {
    return null;
  }

  const formattedRange = subtask.startDate && subtask.endDate
    ? `${format(subtask.startDate, 'dd/MM/yy, HH:mm')} - ${format(subtask.endDate, 'dd/MM/yy, HH:mm')}`
    : 'Không có thông tin.';


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{subtask.title}</DialogTitle>
          <DialogDescription>
            Chi tiết cho công việc.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Mô tả</h3>
                <div className="p-3 rounded-md border bg-muted/20 min-h-[60px]">
                    <p className="text-sm text-foreground leading-relaxed">
                        {subtask.description || <span className="text-muted-foreground">Không có mô tả.</span>}
                    </p>
                </div>
            </div>

            {(subtask.startDate && subtask.endDate) && (
              <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Deadline</h3>
                  <div className="p-3 rounded-md border bg-muted/20 space-y-3">
                      <p className="text-sm text-foreground">{formattedRange}</p>
                      <SubtaskTimeProgress subtask={subtask} />
                  </div>
              </div>
            )}

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Tệp đính kèm</h3>
                <div className="p-3 rounded-md border bg-muted/20 min-h-[60px]">
                    {subtask.attachments && subtask.attachments.length > 0 ? (
                        <div className="space-y-2">
                            {subtask.attachments.map((att, index) => <AttachmentItem key={index} attachment={att} />)}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
