
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isBefore, isAfter, startOfDay } from 'date-fns';
import { TrendingUp, Circle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface SubtaskStats {
  inProgress: number;
  upcoming: number;
  done: number;
  overdue: number;
  total: number;
}

interface StatsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Task[];
}

export function StatsDialog({ isOpen, onOpenChange, tasks }: StatsDialogProps) {
  const stats = React.useMemo<SubtaskStats>(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    const initialStats: SubtaskStats = { inProgress: 0, upcoming: 0, done: 0, overdue: 0, total: 0 };

    return tasks.reduce((acc, task) => {
      acc.total += task.subtasks.length;
      task.subtasks.forEach(subtask => {
        if (subtask.completed) {
          acc.done++;
        } else if (!subtask.startDate || !subtask.endDate) {
          acc.upcoming++;
        } else if (isBefore(today, startOfDay(subtask.startDate))) {
          acc.upcoming++;
        } else if (isAfter(now, subtask.endDate)) {
          acc.overdue++;
        } else {
          acc.inProgress++;
        }
      });

      return acc;
    }, initialStats);
  }, [tasks]);

  const statsData = [
    { 
      status: 'Đang làm', 
      count: stats.inProgress, 
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      description: 'Các công việc đang trong thời gian thực hiện.'
    },
    { 
      status: 'Sắp làm', 
      count: stats.upcoming, 
      icon: <Circle className="h-5 w-5 text-sky-500" />,
      description: 'Các công việc chưa đến ngày bắt đầu.'
    },
    { 
      status: 'Đã xong', 
      count: stats.done, 
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      description: 'Các công việc đã được đánh dấu hoàn thành.'
    },
    { 
      status: 'Quá hạn', 
      count: stats.overdue, 
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      description: 'Các công việc chưa hoàn thành nhưng đã qua ngày kết thúc.'
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Thống kê công việc
          </DialogTitle>
          <DialogDescription>
            Tổng quan nhanh về tất cả các công việc con của bạn.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statsData.map((item) => (
                <TableRow key={item.status}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div className="flex flex-col">
                        <span className="font-medium">{item.status}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">{item.count}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right font-bold text-lg">{stats.total}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
