
'use client';

import * as React from 'react';
import type { Subtask, Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isBefore, isAfter, startOfDay, getDay, eachDayOfInterval, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { TrendingUp, Circle, AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '../ui/button';

interface TaskInfo {
  id: string;
  title: string;
  subtaskCount: number;
}

interface TaskStats {
  inProgress: TaskInfo[];
  upcoming: TaskInfo[];
  done: TaskInfo[];
  overdue: TaskInfo[];
  total: number;
}

type StatsFilter = 'all' | 'today' | 'week';

interface StatsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: Task[];
  onTaskSelect: (taskId: string | null) => void;
}

export function StatsDialog({ isOpen, onOpenChange, tasks, onTaskSelect }: StatsDialogProps) {
  const [filter, setFilter] = React.useState<StatsFilter>('all');

 const stats = React.useMemo<TaskStats>(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    const initialStats: TaskStats = { inProgress: [], upcoming: [], done: [], overdue: [], total: 0 };
    const taskSubtaskMap = {
        inProgress: new Map<string, { title: string; subtasks: Subtask[] }>(),
        upcoming: new Map<string, { title: string; subtasks: Subtask[] }>(),
        done: new Map<string, { title: string; subtasks: Subtask[] }>(),
        overdue: new Map<string, { title: string; subtasks: Subtask[] }>(),
    };

    const collectedSubtasks = new Map<string, { subtask: Subtask, task: Task }>();

    if (filter === 'all' || filter === 'today') {
        tasks.forEach(task => {
            task.subtasks.forEach(subtask => {
                let isRelevant = false;
                if (filter === 'all') {
                    isRelevant = true;
                } else if (filter === 'today') {
                    const dayOfWeek = getDay(today);
                    if (task.taskType === 'recurring') {
                        if (task.recurringDays?.includes(dayOfWeek)) {
                            isRelevant = true;
                        }
                    } else { // deadline
                        if (subtask.startDate && subtask.endDate) {
                            if (isWithinInterval(today, { start: startOfDay(subtask.startDate), end: startOfDay(subtask.endDate) })) {
                                isRelevant = true;
                            }
                        }
                    }
                }
                if (isRelevant) {
                    collectedSubtasks.set(subtask.id, { subtask, task });
                }
            });
        });
    } else if (filter === 'week') {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

        weekDays.forEach(day => {
            const sDay = startOfDay(day);
            const dayOfWeek = getDay(sDay);

            tasks.forEach(task => {
                if (task.taskType === 'recurring') {
                    if (task.recurringDays?.includes(dayOfWeek)) {
                        task.subtasks.forEach(subtask => collectedSubtasks.set(subtask.id, { subtask, task }));
                    }
                } else { // deadline
                    task.subtasks.forEach(subtask => {
                        if (subtask.startDate && subtask.endDate) {
                            const subtaskStart = startOfDay(subtask.startDate);
                            const subtaskEnd = startOfDay(subtask.endDate);
                            if (isWithinInterval(sDay, { start: subtaskStart, end: subtaskEnd })) {
                                collectedSubtasks.set(subtask.id, { subtask, task });
                            }
                        }
                    });
                }
            });
        });
    }

    initialStats.total = collectedSubtasks.size;

    collectedSubtasks.forEach(({ subtask, task }) => {
        const statusMap = subtask.completed ? taskSubtaskMap.done :
                      (task.taskType === 'deadline' && subtask.endDate && isAfter(now, subtask.endDate)) ? taskSubtaskMap.overdue :
                      (task.taskType === 'deadline' && subtask.startDate && isBefore(now, subtask.startDate)) ? taskSubtaskMap.upcoming :
                      taskSubtaskMap.inProgress;
        
        if (!statusMap.has(task.id)) {
            statusMap.set(task.id, { title: task.title, subtasks: [] });
        }
        statusMap.get(task.id)!.subtasks.push(subtask);
    });

    initialStats.inProgress = Array.from(taskSubtaskMap.inProgress, ([id, data]) => ({ id, title: data.title, subtaskCount: data.subtasks.length }));
    initialStats.upcoming = Array.from(taskSubtaskMap.upcoming, ([id, data]) => ({ id, title: data.title, subtaskCount: data.subtasks.length }));
    initialStats.done = Array.from(taskSubtaskMap.done, ([id, data]) => ({ id, title: data.title, subtaskCount: data.subtasks.length }));
    initialStats.overdue = Array.from(taskSubtaskMap.overdue, ([id, data]) => ({ id, title: data.title, subtaskCount: data.subtasks.length }));

    return initialStats;
  }, [tasks, filter]);
  
  const handleTaskClick = (taskId: string) => {
    onTaskSelect(taskId);
    onOpenChange(false);
  };

  const statsData = [
    { 
      status: 'Chưa bắt đầu', 
      tasks: stats.upcoming, 
      icon: <Circle className="h-5 w-5 text-primary" />,
    },
    { 
      status: 'Đang làm', 
      tasks: stats.inProgress, 
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    { 
      status: 'Đã xong', 
      tasks: stats.done,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
    { 
      status: 'Quá hạn', 
      tasks: stats.overdue, 
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
    },
  ];

  const displayedStats = filter === 'today' 
    ? statsData.filter(item => item.status !== 'Chưa bắt đầu') 
    : statsData;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Thống kê công việc
          </DialogTitle>
        </DialogHeader>
        <Separator className="bg-slate-300" />
        
         <Tabs value={filter} onValueChange={(value) => setFilter(value as StatsFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-primary/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tất cả</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hôm nay</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3">
                    <ListTodo className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Tổng công việc</span>
                </div>
                <span className="text-foreground">{stats.total}</span>
            </div>

            <Separator className="bg-slate-300" />
            <div className="w-full space-y-2">
              {displayedStats.map((item) => (
                 item.tasks.length > 0 && (
                    <div className="border-b border-slate-300" key={item.status}>
                        <div className="flex items-center justify-between w-full px-2 py-3">
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="font-medium text-foreground">{item.status} ({item.tasks.reduce((acc, task) => acc + task.subtaskCount, 0)})</span>
                            </div>
                        </div>
                        <div className="px-2 pb-3">
                            <div className="space-y-2 rounded-md border p-3 bg-muted/30 max-h-48 overflow-y-auto custom-scrollbar">
                            {item.tasks.map((task) => (
                                <Button
                                key={task.id} 
                                variant="outline"
                                className="w-full h-auto text-left justify-start p-2 bg-background hover:bg-primary/10 rounded-md border"
                                onClick={() => handleTaskClick(task.id)}
                                >
                                <div>
                                    <p className="font-medium text-foreground truncate">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">{task.subtaskCount} công việc</p>
                                </div>
                                </Button>
                            ))}
                            </div>
                        </div>
                    </div>
                )
              ))}
                {stats.total > 0 && displayedStats.every(item => item.tasks.length === 0) && (
                     <div className="text-sm text-center text-muted-foreground py-4">
                        Không có công việc nào trong bộ lọc này.
                     </div>
                )}
                {stats.total === 0 && (
                    <div className="text-sm text-center text-muted-foreground py-4">
                        Không có công việc nào.
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
