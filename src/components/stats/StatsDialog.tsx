
'use client';

import * as React from 'react';
import type { Subtask, Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isBefore, isAfter, startOfDay, isToday, isThisWeek, isThisMonth, getDay } from 'date-fns';
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
    const today = startOfDay(now);
    
    const initialStats: TaskStats = { inProgress: [], upcoming: [], done: [], overdue: [], total: 0 };
    const taskSets = {
        inProgress: new Map<string, { title: string; count: number }>(),
        upcoming: new Map<string, { title: string; count: number }>(),
        done: new Map<string, { title: string; count: number }>(),
        overdue: new Map<string, { title: string; count: number }>(),
    };


    tasks.forEach(task => {
        const processSubtask = (subtask: Subtask, statusMap: Map<string, { title: string; count: number }>) => {
            const existing = statusMap.get(task.id);
            if (existing) {
                existing.count++;
            } else {
                statusMap.set(task.id, { title: task.title, count: 1 });
            }
        };

        const checkFilter = (date: Date | undefined): boolean => {
          if (filter === 'all' || !date) return true;
          if (filter === 'today' && isToday(date)) return true;
          if (filter === 'week' && isThisWeek(date, { weekStartsOn: 1 })) return true;
          if (filter === 'month' && isThisMonth(date)) return true;
          return false;
        };
        
        let totalSubtasksInFilterForThisTask = 0;

        task.subtasks.forEach(subtask => {
            let inFilter = false;
            if (task.taskType === 'recurring') {
                const dayOfWeek = getDay(now);
                const isRecurringToday = task.recurringDays?.includes(dayOfWeek);
                 if (filter === 'all' || (isRecurringToday && ['today', 'week', 'month'].includes(filter))) {
                    inFilter = true;
                }
            } else { // deadline
                inFilter = checkFilter(subtask.startDate);
            }

            if (inFilter) {
                totalSubtasksInFilterForThisTask++;
                if (subtask.completed) {
                    processSubtask(subtask, taskSets.done);
                } else if (task.taskType === 'recurring') {
                    const dayOfWeek = getDay(now);
                    const isRecurringToday = task.recurringDays?.includes(dayOfWeek);
                    if (isRecurringToday) {
                        processSubtask(subtask, taskSets.inProgress);
                    } else {
                        processSubtask(subtask, taskSets.upcoming);
                    }
                } else { // deadline subtask
                    if (!subtask.startDate || isBefore(now, startOfDay(subtask.startDate))) {
                        processSubtask(subtask, taskSets.upcoming);
                    } else if (subtask.endDate && isAfter(now, subtask.endDate)) {
                        processSubtask(subtask, taskSets.overdue);
                    } else {
                        processSubtask(subtask, taskSets.inProgress);
                    }
                }
            }
        });
        
        initialStats.total += totalSubtasksInFilterForThisTask;
        
        if (task.subtasks.length === 0 && checkFilter(task.startDate)) {
            const taskInfo = { title: task.title, count: 1 };
            initialStats.total++;
            if (task.status === 'Done') {
                taskSets.done.set(task.id, taskInfo);
            } else if (task.taskType === 'deadline') {
                if (task.startDate && isBefore(now, task.startDate)) {
                    taskSets.upcoming.set(task.id, taskInfo);
                } else if (task.endDate && isAfter(now, task.endDate)) {
                    taskSets.overdue.set(task.id, taskInfo);
                } else if (task.startDate && isAfter(now, task.startDate)) {
                    taskSets.inProgress.set(task.id, taskInfo);
                } else {
                    taskSets.upcoming.set(task.id, taskInfo);
                }
            } else { // recurring with no subtasks
                 const dayOfWeek = getDay(now);
                 if(task.recurringDays?.includes(dayOfWeek)) {
                     taskSets.inProgress.set(task.id, taskInfo);
                 } else {
                     taskSets.upcoming.set(task.id, taskInfo);
                 }
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
        <Separator className="bg-border" />
        
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

            <Separator className="bg-border" />
            <Accordion type="multiple" className="w-full">
              {displayedStats.map((item) => (
                <div className="border-b" key={item.status}>
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
