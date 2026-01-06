
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus, BarChart3, Pencil, Clock, Repeat } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isAfter, isBefore, startOfDay, subWeeks, addWeeks, getDay } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetail from '@/components/tasks/task-detail';
import { ListChecks } from 'lucide-react';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { getDailyQuote } from '@/lib/daily-quotes';
import { WeekView } from '@/components/sidebar/week-view';
import { TaskProvider, useTasks } from '@/contexts/TaskContext';
import { StatsDialog } from '@/components/stats/StatsDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TaskTypeDialog } from '@/components/kanban/task-type-dialog';
import type { TaskType } from '@/lib/types';

type FilterType = 'all' | 'today' | 'week';

function TaskKanban() {
  const { tasks, selectedTaskId, setSelectedTaskId } = useTasks();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isTaskTypeDialogOpen, setIsTaskTypeDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<import('@/lib/types').Task | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadingDots, setLoadingDots] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [initialTaskType, setInitialTaskType] = useState<TaskType>('deadline');


  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeDialog');
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
      localStorage.setItem('hasSeenWelcomeDialog', 'true');
    }
    const savedName = localStorage.getItem('userName');
    setUserName(savedName || 'Louis Giang');
  }, []);

  useEffect(() => {
    if (userName && userName !== 'Louis Giang') {
      localStorage.setItem('userName', userName);
    }
  }, [userName]);

  useState(() => {
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 6; // Cycle from 0 to 5
      setLoadingDots('.'.repeat(dotCount));
    }, 700); 

    return () => clearInterval(interval);
  });

  const handleOpenNewTaskDialog = (type: TaskType) => {
    setTaskToEdit(undefined);
    setInitialTaskType(type);
    setIsTaskDialogOpen(true);
  };
  
  const handleSelectTaskType = (type: TaskType) => {
    setInitialTaskType(type);
    setIsTaskTypeDialogOpen(false);
    setIsTaskDialogOpen(true);
  };

  const handleOpenEditTaskDialog = useCallback((task: import('@/lib/types').Task) => {
    setTaskToEdit(task);
    setInitialTaskType(task.taskType);
    setIsTaskDialogOpen(true);
  }, []);
  
  const handleCloseTaskDialog = useCallback(() => {
    setTaskToEdit(undefined);
    setIsTaskDialogOpen(false);
  }, []);

  const hasInProgressSubtasks = useCallback((task: import('@/lib/types').Task) => {
    if (task.status === 'Done') return false;
    
    if (task.taskType === 'recurring') {
      return task.recurringDays?.includes(getDay(new Date()));
    }

    const today = startOfDay(new Date());
    return task.subtasks.some(st => 
      !st.completed && 
      st.startDate && 
      st.endDate &&
      !isAfter(today, startOfDay(st.endDate)) && !isBefore(today, startOfDay(st.startDate))
    );
  }, []);
  
  const todaysTasks = useMemo(() => tasks.filter(hasInProgressSubtasks), [tasks, hasInProgressSubtasks]);
  const uncompletedTasksCount = useMemo(() => tasks.filter(task => task.status !== 'Done').length, [tasks]);

  const filteredTasksForSidebar = useMemo(() => {
    const sDay = startOfDay(selectedDay);
    const dayOfWeek = getDay(sDay);

    switch(activeFilter) {
      case 'today':
        return todaysTasks;
      case 'week':
        return tasks.filter(task => {
          if (task.taskType === 'recurring') {
            return task.recurringDays?.includes(dayOfWeek);
          }
          return task.subtasks.some(st => {
            if (!st.startDate || !st.endDate) return false;
            const subtaskStart = startOfDay(st.startDate);
            const subtaskEnd = startOfDay(st.endDate);
            return !isAfter(sDay, subtaskEnd) && !isBefore(sDay, subtaskStart);
          });
        });
      case 'all':
      default:
        return tasks;
    }
  }, [activeFilter, tasks, selectedDay, todaysTasks]);

  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedTaskId), [tasks, selectedTaskId]);

  const todaysSubtaskCount = useMemo(() => tasks.reduce((count, task) => {
    if (task.status === 'Done') {
      return count;
    }

    if (task.taskType === 'recurring') {
      if (task.recurringDays?.includes(getDay(new Date()))) {
        return count + task.subtasks.filter(st => !st.completed).length;
      }
      return count;
    }

    const today = startOfDay(new Date());
    const inProgressSubtasks = task.subtasks.filter(st => {
        if (!st.completed && st.startDate && st.endDate) {
            const subtaskStart = startOfDay(st.startDate);
            const subtaskEnd = startOfDay(st.endDate);
            return !isAfter(today, subtaskEnd) && !isBefore(today, subtaskStart);
        }
        return false;
    });
    return count + inProgressSubtasks.length;
  }, 0), [tasks]);


  const handlePrevWeek = useCallback(() => setCurrentDate(prev => subWeeks(prev, 1)), []);
  const handleNextWeek = useCallback(() => setCurrentDate(prev => addWeeks(prev, 1)), []);
  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  }, []);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (newName.length <= 12) {
      setUserName(newName);
      setNameError(null);
    } else {
      setUserName(newName.substring(0, 12));
      setNameError('Bạn chỉ được nhập 12 kí tự');
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
      setNameError(null);
    }
  };

  const handleEditBlur = () => {
    setIsEditingName(false);
    setNameError(null);
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
                {isEditingName ? (
                    <div className="w-full">
                        <Input
                        type="text"
                        value={userName || ''}
                        onChange={handleNameChange}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleEditBlur}
                        autoFocus
                        maxLength={12}
                        className="text-2xl font-bold font-headline bg-sidebar-accent border-sidebar-border h-auto p-0"
                        />
                    </div>
                ) : (
                    <h2 className="flex items-center text-2xl font-bold font-headline truncate">
                        {userName !== null ? (
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            Hi, {userName}
                            <span className="inline-block text-left w-12">{loadingDots}</span>
                        </span>
                        ) : (
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            Hi, ...
                        </span>
                        )}
                    </h2>
                )}
            </div>
            {isEditingName && nameError && <p className="text-destructive text-xs mt-1 absolute top-full left-4">{nameError}</p>}
            {!isEditingName && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-sidebar-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={() => setIsEditingName(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            <div className="flex items-center gap-2">
              <SidebarMenuItem className="flex-1">
                <SidebarMenuButton onClick={() => handleOpenNewTaskDialog('deadline')} className="w-full">
                  <Clock />
                  <span>Deadline</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="flex-1">
                <SidebarMenuButton onClick={() => handleOpenNewTaskDialog('recurring')} className="w-full">
                  <Repeat />
                  <span>Lặp lại</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        variant="ghost" 
                        size="icon"
                        className="w-full"
                        onClick={() => setIsStatsDialogOpen(true)}
                      >
                          <BarChart3 />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Thống kê
                    </TooltipContent>
                  </Tooltip>
              </SidebarMenuItem>
            </div>
          </SidebarMenu>
          <Separator className="my-2" />
          <div className="px-2">
            <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FilterType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-sidebar-accent/60">
                <TabsTrigger value="all" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Tất cả ({uncompletedTasksCount})
                </TabsTrigger>
                <TabsTrigger value="today" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Hôm nay ({todaysSubtaskCount})
                </TabsTrigger>
                <TabsTrigger value="week" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Xem tuần
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {activeFilter === 'week' && (
            <WeekView 
              tasks={tasks}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              currentDate={currentDate}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onGoToToday={handleGoToToday}
            />
          )}
          <RecentTasks 
            tasks={filteredTasksForSidebar} 
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            activeFilter={activeFilter}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <div className="absolute top-3 left-3 z-20">
            <SidebarTrigger className="md:hidden" />
          </div>
          <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
            {selectedTask ? (
              <TaskDetail 
                task={selectedTask} 
                onEditTask={handleOpenEditTaskDialog}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <ListChecks className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-semibold">Chọn một nhiệm vụ</h2>
                <p>Chọn một nhiệm vụ từ danh sách bên trái để xem chi tiết.</p>
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
      <TaskTypeDialog 
        isOpen={isTaskTypeDialogOpen}
        onOpenChange={setIsTaskTypeDialogOpen}
        onSelectType={handleSelectTaskType}
      />
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={handleCloseTaskDialog}
        taskToEdit={taskToEdit}
        initialTaskType={initialTaskType}
      />
      <StatsDialog 
        tasks={tasks} 
        isOpen={isStatsDialogOpen} 
        onOpenChange={setIsStatsDialogOpen} 
      />
       <WelcomeDialog
        isOpen={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        todayTaskCount={todaysSubtaskCount}
        dailyQuote={getDailyQuote()}
      />
    </SidebarProvider>
  );
}

export default function Home() {
  return (
    <TaskProvider>
      <TaskKanban />
    </TaskProvider>
  )
}

    

    