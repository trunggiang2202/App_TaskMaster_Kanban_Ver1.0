'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus, TrendingUp, Pencil, Clock, Repeat, GanttChartSquare, Activity, ListFilter, ArrowUpDown, GripVertical, Zap } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isAfter, isBefore, startOfDay, subWeeks, addWeeks, getDay, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, areIntervalsOverlapping } from 'date-fns';
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
import type { TaskType, Task, Subtask } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type FilterType = 'all' | 'today' | 'week';
type AllTasksFilterType = 'all' | 'deadline' | 'recurring' | 'idea';
type AllTasksSortType = 'newest' | 'longest' | 'shortest';

const IconButton = ({ children, tooltipText, onClick, className }: { children: React.ReactNode, tooltipText: string, onClick?: () => void, className?: string }) => (
    <TooltipProvider delayDuration={0}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    className={cn(
                        "group flex items-center justify-center w-full h-9 rounded-lg bg-sidebar-accent/60 text-sidebar-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                        className
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const FilterSelect = ({ value, onValueChange }: { value: AllTasksFilterType, onValueChange: (value: AllTasksFilterType) => void }) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className="w-full h-9 bg-sidebar-accent/60 border-sidebar-border text-sidebar-foreground focus:ring-sidebar-ring">
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4" />
        <SelectValue placeholder="Lọc theo loại" />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả</SelectItem>
      <SelectItem value="deadline">Nhiệm vụ có Deadline</SelectItem>
      <SelectItem value="recurring">Nhiệm vụ lặp lại</SelectItem>
      <SelectItem value="idea">Nhiệm vụ ý tưởng</SelectItem>
    </SelectContent>
  </Select>
);

const SortSelect = ({ value, onValueChange, disabled }: { value: AllTasksSortType, onValueChange: (value: AllTasksSortType) => void, disabled: boolean }) => (
  <Select value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger className="w-full h-9 bg-sidebar-accent/60 border-sidebar-border text-sidebar-foreground focus:ring-sidebar-ring">
       <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4" />
        <SelectValue placeholder="Sắp xếp" />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="newest">Mới nhất</SelectItem>
      <SelectItem value="longest">Dài → Ngắn</SelectItem>
      <SelectItem value="shortest">Ngắn → Dài</SelectItem>
    </SelectContent>
  </Select>
);


function TaskKanban() {
  const { tasks, selectedTaskId, setSelectedTaskId } = useTasks();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isTaskTypeDialogOpen, setIsTaskTypeDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<import('@/lib/types').Task | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [allTasksFilter, setAllTasksFilter] = useState<AllTasksFilterType>('all');
  const [allTasksSort, setAllTasksSort] = useState<AllTasksSortType>('newest');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadingDots, setLoadingDots] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [initialTaskType, setInitialTaskType] = useState<TaskType>('deadline');
  const [taskToConvert, setTaskToConvert] = useState<{ title: string, id: string } | null>(null);


  useEffect(() => {
    // Reset sort when filter changes to something that doesn't support duration sorting
    if (allTasksFilter === 'recurring' || allTasksFilter === 'idea') {
      setAllTasksSort('newest');
    }
  }, [allTasksFilter]);


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

  useEffect(() => {
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 6; // Cycle from 0 to 5
      setLoadingDots('.'.repeat(dotCount));
    }, 700); 

    return () => clearInterval(interval);
  }, []);

  const handleOpenNewTaskDialog = (type: TaskType) => {
    setTaskToEdit(undefined);
    setTaskToConvert(null);
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
    setTaskToConvert(null);
    setInitialTaskType(task.taskType);
    setIsTaskDialogOpen(true);
  }, []);
  
  const handleCloseTaskDialog = useCallback(() => {
    setTaskToEdit(undefined);
    setTaskToConvert(null);
    setIsTaskDialogOpen(false);
  }, []);
  
  const handleConvertToTask = useCallback((title: string, id: string) => {
    setTaskToConvert({ title, id });
    setInitialTaskType('deadline');
    setTaskToEdit(undefined);
    setIsTaskDialogOpen(false); 
    setIsTaskDialogOpen(true); 
  }, []);

  const isTaskForToday = useCallback((task: import('@/lib/types').Task) => {
    const today = startOfDay(new Date());
    if (task.taskType === 'idea') {
        return false; // Ideas don't belong to 'today' unless explicitly filtered
    }
    if (task.taskType === 'recurring') {
        const dayOfWeek = getDay(today);
        return task.recurringDays?.includes(dayOfWeek);
    }
    // For deadline tasks, check if any subtask is active today
    return task.subtasks.some(st => 
        st.isManuallyStarted ||
        (st.startDate && st.endDate && isWithinInterval(today, {start: startOfDay(st.startDate), end: startOfDay(st.endDate)}))
    );
  }, []);

  const weeklyFilteredTasks = useMemo(() => {
    const day = startOfDay(selectedDay);
    const dayOfWeek = getDay(day);

    const sortTasks = (a: Task, b: Task) => {
        if (a.taskType === 'recurring' && b.taskType !== 'recurring') return -1;
        if (a.taskType !== 'recurring' && b.taskType === 'recurring') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    return tasks.filter(task => {
      if (task.taskType === 'recurring') {
        return task.recurringDays?.includes(dayOfWeek);
      }
      if (task.taskType === 'idea') {
        return isSameDay(task.createdAt, day);
      }
      return task.subtasks.some(st => {
        if (!st.startDate || !st.endDate) return false;
        const subtaskInterval = { start: startOfDay(st.startDate), end: startOfDay(st.endDate) };
        return isWithinInterval(day, subtaskInterval);
      });
    }).sort((a, b) => {
        if (a.status === 'Done' && b.status !== 'Done') return 1;
        if (a.status !== 'Done' && b.status === 'Done') return -1;
        return sortTasks(a, b);
    });
  }, [tasks, selectedDay]);

  const filteredTasksForSidebar = useMemo(() => {
    const sortTasks = (a: Task, b: Task) => {
        if (a.taskType === 'recurring' && b.taskType !== 'recurring') return -1;
        if (a.taskType !== 'recurring' && b.taskType === 'recurring') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    switch(activeFilter) {
      case 'today':
         const todaysTasks = tasks.filter(isTaskForToday);
         return [...todaysTasks].sort((a,b) => {
            if (a.status === 'Done' && b.status !== 'Done') return 1;
            if (a.status !== 'Done' && b.status === 'Done') return -1;
            return sortTasks(a,b);
        });
      case 'week':
        return weeklyFilteredTasks;
      case 'all':
      default:
        let allTasks = [...tasks];
        
        // 1. Filter by type
        let typeFilteredTasks = allTasks;
        if (allTasksFilter !== 'all') {
          typeFilteredTasks = allTasks.filter(task => task.taskType === allTasksFilter);
        }

        // 2. Sort the filtered tasks
        const getTaskDuration = (task: Task) => {
          if (task.taskType !== 'deadline' || !task.startDate || !task.endDate) return 0;
          return new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
        }
        
        const baseSort = (a: Task, b: Task) => {
            if (a.status === 'Done' && b.status !== 'Done') return 1;
            if (a.status !== 'Done' && b.status === 'Done') return -1;
            return 0;
        }

        switch(allTasksSort) {
          case 'newest':
            return typeFilteredTasks.sort((a, b) => {
                const statusSort = baseSort(a, b);
                if (statusSort !== 0) return statusSort;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
          case 'longest':
            return typeFilteredTasks.sort((a, b) => {
                const statusSort = baseSort(a, b);
                if (statusSort !== 0) return statusSort;
                if (a.taskType === 'deadline' && b.taskType === 'deadline') {
                    return getTaskDuration(b) - getTaskDuration(a);
                }
                return 0;
            });
          case 'shortest':
            return typeFilteredTasks.sort((a, b) => {
                const statusSort = baseSort(a, b);
                if (statusSort !== 0) return statusSort;
                if (a.taskType === 'deadline' && b.taskType === 'deadline') {
                    return getTaskDuration(a) - getTaskDuration(b);
                }
                return 0;
            });
          default:
            return typeFilteredTasks.sort(baseSort);
        }
    }
  }, [activeFilter, allTasksFilter, allTasksSort, tasks, weeklyFilteredTasks, isTaskForToday]);

  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedTaskId), [tasks, selectedTaskId]);

  const { completedTodaysSubtasks, totalTodaysSubtasks } = useMemo(() => {
    let total = 0;
    let completed = 0;
    const today = startOfDay(new Date());
    const dayOfWeek = getDay(today);

    tasks.forEach(task => {
        if (task.taskType === 'idea') return;
        if (!isTaskForToday(task)) return; // Ensure task is relevant for today

        task.subtasks.forEach(st => {
            let isActiveToday = false;
            if (task.taskType === 'recurring') {
                isActiveToday = task.recurringDays?.includes(dayOfWeek) ?? false;
            } else { // 'deadline' task
                isActiveToday = !!st.isManuallyStarted || 
                                (!!st.startDate && !!st.endDate && isWithinInterval(today, {
                                    start: startOfDay(st.startDate),
                                    end: startOfDay(st.endDate)
                                }));
            }

            if (isActiveToday) {
                total++;
                if (st.completed) {
                    completed++;
                }
            }
        });
    });

    return { completedTodaysSubtasks: completed, totalTodaysSubtasks: total };
  }, [tasks, isTaskForToday]);
  
  const weekViewCounts = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekInterval = { start: weekStart, end: weekEnd };

    let total = 0;
    let completed = 0;

    tasks.forEach(task => {
        if (task.taskType === 'idea') return;

        if (task.taskType === 'recurring') {
            const weekDays = eachDayOfInterval(weekInterval);
            // Only count if the recurring task has a day within the current week
            if (weekDays.some(day => task.recurringDays?.includes(getDay(day)))) {
                // Only count subtasks that are NOT completed
                const uncompletedSubtasks = task.subtasks.filter(st => !st.completed);
                total += uncompletedSubtasks.length;
                // 'completed' for recurring tasks in week view is always 0, as we only show pending ones.
            }
        } else { // 'deadline' task
            task.subtasks.forEach(subtask => {
                if (subtask.startDate && subtask.endDate) {
                    const subtaskInterval = { start: startOfDay(subtask.startDate), end: startOfDay(subtask.endDate) };
                    // Check if the subtask's date range overlaps with the current week
                    if (areIntervalsOverlapping(weekInterval, subtaskInterval)) {
                        total++;
                        if (subtask.completed) {
                            completed++;
                        }
                    }
                }
            });
        }
    });

    return { completed, total };
}, [tasks, currentDate]);


  const welcomeDialogTaskCount = useMemo(() => totalTodaysSubtasks - completedTodaysSubtasks, [totalTodaysSubtasks, completedTodaysSubtasks]);

  const handlePrevWeek = useCallback(() => setCurrentDate(prev => subWeeks(prev, 1)), []);
  const handleNextWeek = useCallback(() => setCurrentDate(prev => addWeeks(prev, 1)), []);
  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  }, []);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (newName.length > 12) {
      setNameError('Bạn chỉ được nhập 12 kí tự');
    } else {
      setUserName(newName);
      setNameError(null);
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

  const handleDateSearch = (date: Date) => {
    setCurrentDate(date);
    setSelectedDay(date);
  };

  const allSubtasksCount = useMemo(() => {
    let total = 0;
    let completed = 0;
    tasks.forEach(task => {
      if (task.taskType === 'idea') return;
      total += task.subtasks.length;
      completed += task.subtasks.filter(st => st.completed).length;
    });
    return { total, completed };
  }, [tasks]);


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 relative">
                {isEditingName ? (
                    <div className="w-full relative">
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
                         {isEditingName && nameError && <p className="text-destructive text-xs mt-1 absolute top-full left-0">{nameError}</p>}
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
          </div>
        </SidebarHeader>
        <SidebarContent>
        <SidebarMenu className="px-2 grid grid-cols-5 gap-2">
            <IconButton tooltipText="Nhiệm vụ có Deadline" onClick={() => handleOpenNewTaskDialog('deadline')}>
                <Clock className="h-4 w-4" />
            </IconButton>
            <IconButton tooltipText="Nhiệm vụ lặp lại" onClick={() => handleOpenNewTaskDialog('recurring')}>
                <Repeat className="h-4 w-4" />
            </IconButton>
             <IconButton tooltipText="Ý tưởng" onClick={() => handleOpenNewTaskDialog('idea')}>
                <Zap className="h-4 w-4" />
            </IconButton>
            <IconButton tooltipText="Thống kê" onClick={() => setIsStatsDialogOpen(true)}>
                <TrendingUp className="h-4 w-4" />
            </IconButton>
            <IconButton tooltipText="Sửa tên" onClick={() => setIsEditingName(true)}>
                <Pencil className="h-4 w-4" />
            </IconButton>
        </SidebarMenu>
          <Separator className="my-2" />
          <div className="px-2">
            <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FilterType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-1">
                <TabsTrigger value="all" className="text-xs">
                  Tất cả ({allSubtasksCount.completed}/{allSubtasksCount.total})
                </TabsTrigger>
                <TabsTrigger value="today" className="text-xs">
                  Hôm nay ({completedTodaysSubtasks}/{totalTodaysSubtasks})
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                   Xem tuần ({weekViewCounts.completed}/{weekViewCounts.total})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {activeFilter === 'all' && (
             <div className="px-2 pt-2 grid grid-cols-2 gap-2">
                <FilterSelect value={allTasksFilter} onValueChange={(v) => setAllTasksFilter(v as AllTasksFilterType)} />
                <SortSelect 
                  value={allTasksSort} 
                  onValueChange={(v) => setAllTasksSort(v as AllTasksSortType)}
                  disabled={allTasksFilter === 'recurring' || allTasksFilter === 'idea'}
                />
            </div>
          )}
          {activeFilter === 'week' && (
            <WeekView 
              tasks={tasks}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay} 
              currentDate={currentDate}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onGoToToday={handleGoToToday}
              onDateSearch={handleDateSearch}
            />
          )}
          <RecentTasks 
            tasks={filteredTasksForSidebar} 
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            activeFilter={activeFilter}
            allTasksFilter={allTasksFilter}
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
        taskToConvert={taskToConvert}
        onConvertToTask={handleConvertToTask}
      />
      <StatsDialog 
        tasks={tasks} 
        isOpen={isStatsDialogOpen} 
        onOpenChange={setIsStatsDialogOpen}
        onTaskSelect={setSelectedTaskId}
        onFilterChange={setActiveFilter}
      />
       <WelcomeDialog
        isOpen={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        todayTaskCount={welcomeDialogTaskCount}
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
