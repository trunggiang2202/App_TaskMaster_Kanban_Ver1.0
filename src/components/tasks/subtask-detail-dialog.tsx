
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
import { Paperclip, Download, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { format, isAfter, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      if (now < start) {
        const distance = end - start;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0 || days > 0) result += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
        return result.trim();
      }

      const distance = end - now;

      if (distance < 0) return 'Đã quá hạn';

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      
      return result.trim() === '' ? 'dưới 1 phút' : result.trim();
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

  const now = new Date();
  const isUpcoming = isBefore(now, startDate);
  const isOverdue = !completed && isAfter(now, endDate);
  const isWarning = !isOverdue && timeProgress < 20 && !completed;

  const getTimeLeftColor = () => {
    if (completed) return 'text-emerald-500';
    if (isOverdue || isWarning) return 'text-destructive';
    if (isUpcoming) return 'text-sky-500';
    return 'text-muted-foreground';
  };

  const formattedStart = subtask.startDate ? format(subtask.startDate, 'p, dd/MM/yyyy', { locale: vi }) : '';
  const formattedEnd = subtask.endDate ? format(subtask.endDate, 'p, dd/MM/yyyy', { locale: vi }) : '';

  return (
    <div className="space-y-3">
        <div className="space-y-1 text-sm text-foreground">
            <p className={cn("flex items-center gap-2", !isUpcoming && !completed && "text-emerald-500 font-semibold")}>
              <Calendar className="h-4 w-4" /> 
              Bắt đầu: {formattedStart}
              {!isUpcoming && !completed && <span className="font-semibold">(Đã bắt đầu)</span>}
            </p>
            {completed ? (
                 <p className="flex items-center gap-2 font-semibold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã hoàn thành
                </p>
            ) : (
                <p className={cn("flex items-center gap-2", isOverdue && "text-destructive")}>
                  <Calendar className="h-4 w-4" /> Kết thúc: {formattedEnd}
                  {isOverdue && <span className="font-semibold">(đã quá hạn)</span>}
                </p>
            )}
            {!isOverdue && !completed && (
                <>
                    <p className={`flex items-center gap-2 font-semibold ${getTimeLeftColor()}`}>
                        <Clock className="h-4 w-4" /> 
                        {isUpcoming ? 'Tổng thời gian' : 'Thời gian còn lại'}: {timeLeft}
                        {isUpcoming && <span className="font-normal text-muted-foreground">(Chưa bắt đầu)</span>}
                    </p>
                    <Progress value={timeProgress} className="h-1.5" indicatorClassName={isWarning ? 'bg-destructive' : 'bg-emerald-500'} />
                </>
            )}
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
                  <div className="p-3 rounded-md border bg-muted/20">
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
