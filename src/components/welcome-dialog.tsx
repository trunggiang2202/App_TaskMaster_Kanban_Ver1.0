
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
import { Quote, Sparkles, Zap } from 'lucide-react';

interface WelcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  todayTaskCount: number;
  dailyQuote: string;
}

export function WelcomeDialog({ isOpen, onOpenChange, todayTaskCount, dailyQuote }: WelcomeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold font-headline">
            <Sparkles className="h-6 w-6 text-amber-400" />
            Chào mừng trở lại!
          </DialogTitle>
          <DialogDescription>
            Chúc bạn có một ngày làm việc hiệu quả.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg border bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-1">Công việc còn lại cho hôm nay</p>
            <div className="flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-primary"/>
                <p className="text-2xl font-bold text-foreground">
                    {todayTaskCount} công việc
                </p>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Góc suy ngẫm
            </p>
            <p className="italic text-center text-foreground">
              "{dailyQuote}"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">Bắt đầu nào!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    