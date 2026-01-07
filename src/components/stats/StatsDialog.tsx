
'use client';

import * as React from 'react';
import type { Subtask, Task } from '@/lib/types';
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
        inProgress: new Map<string, string>(),
        upcoming: new Map<string, string>(),
        done: new Map<string, string>(),
        overdue: new Map<string, string>(),
    };


    tasks.forEach(task => {
      let totalSubtasksInFilter = 0;
      task.subtasks.forEach(subtask => {
        let include = false;
        if (filter === 'all') {
          include = true;
        } else if (subtask.startDate) {
          const subtaskDate = new Date(subtask.startDate);
          if (filter === 'today' && isToday(subtaskDate)) include = true;
          if (filter === 'week' && isThisWeek(subtaskDate, { weekStartsOn: 1 })) include = true;
          if (filter === 'month' && isThisMonth(subtaskDate)) include = true;
        } else if (filter !== 'all' && task.taskType === 'recurring') {
            // Include recurring tasks for today/week/month filters if they are active
            const dateToTest = new Date();
            if (filter === 'today' && isToday(dateToTest)) include = true;
            if (filter === 'week' && isThisWeek(dateToTest, { weekStartsOn: 1 })) include = true;
            if (filter === 'month' && isThisMonth(dateToTest)) include = true;
        }
        
        if (include) {
            totalSubtasksInFilter++;
            if (subtask.completed) {
              taskSets.done.set(task.id, task.title);
            } else if (!subtask.startDate || !subtask.endDate) {
              taskSets.upcoming.set(task.id, task.title);
            } else if (isBefore(today, startOfDay(subtask.startDate))) {
              taskSets.upcoming.set(task.id, task.title);
            } else if (isAfter(now, subtask.endDate)) {
              taskSets.overdue.set(task.id, task.title);
            } else {
              taskSets.inProgress.set(task.id, task.title);
            }
        }
      });
      if(task.subtasks.length === 0 && filter === 'all') {
        if(task.status === 'Done') {
          taskSets.done.set(task.id, task.title);
        } else if (task.taskType === 'deadline' && task.startDate && isBefore(now, task.startDate)) {
          taskSets.upcoming.set(task.id, task.title);
        } else if (task.taskType === 'deadline' && task.endDate && isAfter(now, task.endDate)) {
          taskSets.overdue.set(task.id, task.title);
        } else if (task.taskType === 'deadline' && task.startDate && isAfter(now, task.startDate)){
            taskSets.inProgress.set(task.id, task.title);
        } else {
            taskSets.upcoming.set(task.id, task.title);
        }
      }
      initialStats.total += totalSubtasksInFilter || (filter === 'all' ? 1 : 0);
    });
    
    initialStats.inProgress = Array.from(taskSets.inProgress, ([id, title]) => ({ id, title }));
    initialStats.upcoming = Array.from(taskSets.upcoming, ([id, title]) => ({ id, title }));
    initialStats.done = Array.from(taskSets.done, ([id, title]) => ({ id, title }));
    initialStats.overdue = Array.from(taskSets.overdue, ([id, title]) => ({ id, title }));

    return initialStats;
  }, [tasks, filter]);
  
  const handleTaskClick = (taskId: string) => {
    onTaskSelect(taskId);
    onOpenChange(false);
  };

  const statsData = [
    { 
      status: 'Đang làm', 
      tasks: stats.inProgress, 
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    { 
      status: 'Sắp làm', 
      tasks: stats.upcoming, 
      icon: <Circle className="h-5 w-5 text-sky-500" />,
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Thống kê công việc
          </DialogTitle>
        </DialogHeader>
        <Separator />
        
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
            <Accordion type="multiple" className="w-full">
              {statsData.map((item) => (
                <AccordionItem value={item.status} key={item.status}>
                  <AccordionTrigger className="hover:no-underline px-2">
                      <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                              {item.icon}
                              <span className="font-medium text-foreground">{item.status} ({item.tasks.length})</span>
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
                            className="w-full h-auto text-left justify-start p-2 bg-background hover:bg-muted/50 rounded-md border"
                            onClick={() => handleTaskClick(task.id)}
                          >
                            <div>
                              <p className="font-medium text-foreground truncate">{task.title}</p>
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
              ))}
            </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
