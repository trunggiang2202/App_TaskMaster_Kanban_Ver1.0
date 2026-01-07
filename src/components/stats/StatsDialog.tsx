
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isBefore, isAfter, startOfDay, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { TrendingUp, Circle, AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SubtaskStats {
  inProgress: number;
  upcoming: number;
  done: number;
  overdue: number;
  total: number;
}

type StatsFilter = 'all' | 'today' | 'week' | 'month';

interface StatsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Task[];
}

export function StatsDialog({ isOpen, onOpenChange, tasks }: StatsDialogProps) {
  const [filter, setFilter] = React.useState<StatsFilter>('all');

  const filteredTasks = React.useMemo(() => {
    if (filter === 'all') return tasks;
    
    return tasks.map(task => {
      const subtasks = task.subtasks.filter(st => {
        if (!st.startDate) return false;
        const subtaskDate = new Date(st.startDate);
        if (filter === 'today') return isToday(subtaskDate);
        if (filter === 'week') return isThisWeek(subtaskDate, { weekStartsOn: 1 });
        if (filter === 'month') return isThisMonth(subtaskDate);
        return false;
      });
      return { ...task, subtasks };
    }).filter(task => task.subtasks.length > 0);

  }, [tasks, filter]);

  const stats = React.useMemo<SubtaskStats>(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    const initialStats: SubtaskStats = { inProgress: 0, upcoming: 0, done: 0, overdue: 0, total: 0 };

    return filteredTasks.reduce((acc, task) => {
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
  }, [filteredTasks]);

  const statsData = [
    { 
      status: 'Đang làm', 
      count: stats.inProgress, 
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    { 
      status: 'Sắp làm', 
      count: stats.upcoming, 
      icon: <Circle className="h-5 w-5 text-sky-500" />,
    },
    { 
      status: 'Đã xong', 
      count: stats.done,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
    { 
      status: 'Quá hạn', 
      count: stats.overdue, 
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
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
        </DialogHeader>
        
        <Tabs value={filter} onValueChange={(value) => setFilter(value as StatsFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-primary/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tất cả</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hôm nay</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tuần này</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tháng này</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3">
                    <ListTodo className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Tổng công việc</span>
                </div>
                <span className="text-foreground">{stats.total}</span>
            </div>

            <Separator />

            <div className="px-2 space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Trạng thái</span>
                    <span>Số lượng</span>
                </div>
                {statsData.map((item, index) => (
                    <React.Fragment key={item.status}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="font-medium text-foreground">{item.status}</span>
                            </div>
                            <span className="text-foreground">{item.count}</span>
                        </div>
                        {index < statsData.length -1 && <Separator />}
                    </React.Fragment>
                ))}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
