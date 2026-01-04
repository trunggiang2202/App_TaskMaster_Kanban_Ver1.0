
'use client';

import { useState, useEffect } from 'react';
import { initialTasks } from '@/lib/data';
import type { Task } from '@/lib/types';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus, Sparkles } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isToday, isAfter, isBefore, startOfDay, isSameDay, startOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetail from '@/components/tasks/task-detail';
import { ListChecks } from 'lucide-react';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { getDailyQuote } from '@/lib/daily-quotes';
import { WeekView } from '@/components/sidebar/week-view';

type FilterType = 'all' | 'today' | 'week';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks.map(t => {
    const task: Task = {...t, createdAt: new Date(t.createdAt) };
    if (t.startDate) task.startDate = new Date(t.startDate);
    if (t.endDate) task.endDate = new Date(t.endDate);
    task.subtasks = t.subtasks.map(st => {
        const subtask = {...st};
        if (st.startDate) subtask.startDate = new Date(st.startDate);
        if (st.endDate) subtask.endDate = new Date(st.endDate);
        return subtask;
    });
    return task;
  }));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id || null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setShowWelcomeDialog(true);
  }, []);

  const handleOpenDialog = (task?: Task) => {
    setTaskToEdit(task);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setTaskToEdit(undefined);
    setIsDialogOpen(false);
  };

  const handleSubmitTask = (taskData: Task) => {
    if (taskToEdit) {
      // Update existing task
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === taskData.id ? taskData : task))
      );
    } else {
      // Add new task
      setTasks(prevTasks => [taskData, ...prevTasks]);
    }
    handleCloseDialog();
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  };
  
  const handleTaskStatusChange = (taskId: string, status: Task['status']) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === taskId ? { ...task, status } : task))
    );
  };
  
  const handleSubtaskToggle = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          // First, toggle the specified subtask's completion status
          const updatedSubtasks = task.subtasks.map(subtask =>
            subtask.id === subtaskId
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          );

          // After updating, check if all subtasks are now completed
          const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);

          // Determine the new parent task status
          let newStatus = task.status;
          if (allSubtasksDone) {
            newStatus = 'Done';
          } else if (task.status === 'Done' && !allSubtasksDone) {
            // If the parent was 'Done' but now a subtask is not, revert it
            newStatus = 'In Progress';
          }

          return { ...task, subtasks: updatedSubtasks, status: newStatus };
        }
        return task;
      })
    );
  };

  const hasInProgressSubtasks = (task: Task) => {
    if (task.status === 'Done') return false;
    // A task is for "Today" if it has subtasks that are not completed,
    // and today's date is between the subtask's start and end date.
    return task.subtasks.some(st => 
      !st.completed && 
      st.startDate && 
      st.endDate &&
      isWithinInterval(startOfDay(new Date()), { start: startOfDay(st.startDate), end: startOfDay(st.endDate) })
    );
  };
  
  const todaysTasks = tasks.filter(hasInProgressSubtasks);
  const uncompletedTasksCount = tasks.filter(task => task.status !== 'Done').length;

  const getFilteredTasks = () => {
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
      default:
        return tasks;
    }
  };

  const filteredTasksForSidebar = getFilteredTasks();

  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  const todaysSubtaskCount = tasks.reduce((count, task) => {
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
  }, 0);


  const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const handleGoToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <h2 className="flex items-center gap-2 text-2xl font-bold font-headline bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
            <Sparkles className="text-amber-400" />
            Hi, Louis Giang
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
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onEditTask={handleOpenDialog}
                onSubtaskToggle={handleSubtaskToggle}
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
        onSubmit={handleSubmitTask}
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
