
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isAfter, isBefore, startOfDay, subWeeks, addWeeks } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetail from '@/components/tasks/task-detail';
import { ListChecks } from 'lucide-react';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { getDailyQuote } from '@/lib/daily-quotes';
import { WeekView } from '@/components/sidebar/week-view';
import { TaskProvider, useTasks } from '@/contexts/TaskContext';
import { StatsView } from '@/components/stats/StatsView';

type FilterType = 'all' | 'today' | 'week' | 'stats';

function TaskKanban() {
  const { tasks, selectedTaskId, setSelectedTaskId } = useTasks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<import('@/lib/types').Task | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeDialog');
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
      localStorage.setItem('hasSeenWelcomeDialog', 'true');
    }
  }, []);

  useState(() => {
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 6; // Cycle from 0 to 5
      setLoadingDots('.'.repeat(dotCount));
    }, 700); 

    return () => clearInterval(interval);
  });

  const handleOpenDialog = useCallback((task?: import('@/lib/types').Task) => {
    setTaskToEdit(task);
    setIsDialogOpen(true);
  }, []);
  
  const handleCloseDialog = useCallback(() => {
    setTaskToEdit(undefined);
    setIsDialogOpen(false);
  }, []);

  const hasInProgressSubtasks = useCallback((task: import('@/lib/types').Task) => {
    if (task.status === 'Done') return false;
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
    switch(activeFilter) {
      case 'today':
        return todaysTasks;
      case 'week':
        return tasks.filter(task => 
          task.subtasks.some(st => {
            if (!st.startDate || !st.endDate) return false;
            const subtaskStart = startOfDay(st.startDate);
            const subtaskEnd = startOfDay(st.endDate);
            return !isAfter(sDay, subtaskEnd) && !isBefore(sDay, subtaskStart);
          })
        );
      case 'all':
      case 'stats':
      default:
        return tasks;
    }
  }, [activeFilter, tasks, selectedDay, todaysTasks]);

  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedTaskId), [tasks, selectedTaskId]);

  const todaysSubtaskCount = useMemo(() => tasks.reduce((count, task) => {
    if (task.status === 'Done') {
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


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <h2 className="flex items-center gap-2 text-2xl font-bold font-headline">
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Hi, Louis Giang
              <span className="inline-block text-left w-12">{loadingDots}</span>
            </span>
          </h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleOpenDialog()} className="w-full">
                <Plus />
                <span>Nhiệm vụ mới</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator className="my-2" />
          <div className="px-2">
            <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FilterType)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-sidebar-accent/60">
                <TabsTrigger value="all" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Tất cả ({uncompletedTasksCount})
                </TabsTrigger>
                <TabsTrigger value="today" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Hôm nay ({todaysSubtaskCount})
                </TabsTrigger>
                <TabsTrigger value="week" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Xem tuần
                </TabsTrigger>
                <TabsTrigger value="stats" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
                  Thống kê
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
          {activeFilter !== 'stats' && (
            <RecentTasks 
              tasks={filteredTasksForSidebar} 
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              activeFilter={activeFilter}
            />
          )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <div className="absolute top-3 left-3 z-20">
            <SidebarTrigger className="md:hidden" />
          </div>
          <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
            {activeFilter === 'stats' ? (
              <StatsView tasks={tasks} />
            ) : selectedTask ? (
              <TaskDetail 
                task={selectedTask} 
                onEditTask={handleOpenDialog}
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
      <TaskDialog
        isOpen={isDialogOpen}
        onOpenChange={handleCloseDialog}
        taskToEdit={taskToEdit}
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
