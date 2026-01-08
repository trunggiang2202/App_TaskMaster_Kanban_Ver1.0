
'use client';

import * as React from 'react';
import type { Subtask, Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isBefore, isAfter, startOfDay, isToday, isThisWeek, isThisMonth, getDay, eachDayOfInterval, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Circle, AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

type StatsFilter = 'all' | 'today' | 'week' | 'month';

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
    
    const initialStats: TaskStats = { inProgress: [], upcoming: [], done: [], overdue: [], total: 0 };
    const taskSets = {
        inProgress: new Map<string, { title: string; count: number }>(),
        upcoming: new Map<string, { title: string; count: number }>(),
        done: new Map<string, { title: string; count: number }>(),
        overdue: new Map<string, { title: string; count: number }>(),
    };
    
    let filterInterval: Interval | null = null;
    if (filter === 'week') {
        filterInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    } else if (filter === 'month') {
        filterInterval = { start: startOfMonth(now), end: endOfMonth(now) };
    }

    const isSubtaskInFilter = (subtask: Subtask, task: Task): boolean => {
      if (filter === 'all') return true;
      const today = startOfDay(now);

      if (filter === 'today') {
          if (task.taskType === 'recurring') {
              return !!task.recurringDays?.includes(getDay(today));
          }
          return !!subtask.startDate && !!subtask.endDate && isWithinInterval(today, { start: startOfDay(subtask.startDate), end: startOfDay(subtask.endDate) });
      }
      
      if (filterInterval) {
          if (task.taskType === 'recurring' && task.recurringDays) {
              const daysInInterval = eachDayOfInterval(filterInterval);
              return daysInInterval.some(day => task.recurringDays?.includes(getDay(day)));
          }
          if (task.taskType === 'deadline' && subtask.startDate && subtask.endDate) {
              // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
              return isAfter(subtask.endDate, filterInterval.start) && isBefore(subtask.startDate, filterInterval.end);
          }
      }
      return false;
    };


    tasks.forEach(task => {
        let totalSubtasksInFilterForThisTask = 0;

        task.subtasks.forEach(subtask => {
            if (isSubtaskInFilter(subtask, task)) {
                totalSubtasksInFilterForThisTask++;
                const statusMap = subtask.completed ? taskSets.done :
                                  (task.taskType === 'deadline' && subtask.endDate && isAfter(now, subtask.endDate)) ? taskSets.overdue :
                                  (task.taskType === 'deadline' && subtask.startDate && isBefore(now, subtask.startDate)) ? taskSets.upcoming :
                                  taskSets.inProgress;

                const existing = statusMap.get(task.id);
                if (existing) {
                    existing.count++;
                } else {
                    statusMap.set(task.id, { title: task.title, count: 1 });
                }
            }
        });
        initialStats.total += totalSubtasksInFilterForThisTask;

        // Handle tasks with no subtasks but matching filter criteria
        if (task.subtasks.length === 0 && isSubtaskInFilter({} as Subtask, task)) {
          initialStats.total++;
          const taskInfo = { title: task.title, count: 1 };
           const statusMap = task.status === 'Done' ? taskSets.done :
                              (task.taskType === 'deadline' && task.endDate && isAfter(now, task.endDate)) ? taskSets.overdue :
                              (task.taskType === 'deadline' && task.startDate && isBefore(now, task.startDate)) ? taskSets.upcoming :
                              taskSets.inProgress;
          
          const existing = statusMap.get(task.id);
          if (existing) {
              existing.count++;
          } else {
              statusMap.set(task.id, taskInfo);
          }
        }
    });
    
    initialStats.inProgress = Array.from(taskSets.inProgress, ([id, data]) => ({ id, title: data.title, subtaskCount: data.count }));
    initialStats.upcoming = Array.from(taskSets.upcoming, ([id, data]) => ({ id, title: data.title, subtaskCount: data.count }));
    initialStats.done = Array.from(taskSets.done, ([id, data]) => ({ id, title: data.title, subtaskCount: data.count }));
    initialStats.overdue = Array.from(taskSets.overdue, ([id, data]) => ({ id, title: data.title, subtaskCount: data.count }));

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
          <TabsList className="grid w-full grid-cols-4 bg-primary/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tất cả</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hôm nay</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tuần này</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tháng này</TabsTrigger>
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
            <Accordion type="multiple" className="w-full">
              {displayedStats.map((item) => (
                <div className="border-b border-slate-300" key={item.status}>
                  <AccordionItem value={item.status} className="border-b-0">
                    <AccordionTrigger className="hover:no-underline px-2 hover:bg-primary/10 rounded-md">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="font-medium text-foreground">{item.status} ({item.tasks.reduce((acc, task) => acc + task.subtaskCount, 0)})</span>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-2">
                      {item.tasks.length > 0 ? (
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
                      ) : (
                        <div className="text-sm text-center text-muted-foreground py-4">
                          Không có công việc nào.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </div>
              ))}
            </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
