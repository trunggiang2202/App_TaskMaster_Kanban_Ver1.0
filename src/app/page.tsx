'use client';

import { useState } from 'react';
import { initialTasks } from '@/lib/data';
import type { Task } from '@/lib/types';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isToday, isAfter, isBefore, startOfDay } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskDetail from '@/components/tasks/task-detail';
import { ListChecks } from 'lucide-react';

type FilterType = 'all' | 'today';

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

  const filteredTasksForSidebar = tasks.filter(task => {
    if (activeFilter === 'today') {
      const today = startOfDay(new Date());
      const startDate = startOfDay(task.startDate);
      const endDate = startOfDay(task.endDate);

      return (
        task.status !== 'Done' &&
        (isToday(startDate) || isToday(endDate) || (isBefore(startDate, today) && isAfter(endDate, today)))
      );
    }
    return true;
  });

  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <h2 className="text-2xl font-bold text-sidebar-foreground font-headline">TaskMaster</h2>
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
              <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/60">
                <TabsTrigger value="all" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">Tất cả</TabsTrigger>
                <TabsTrigger value="today" className="text-sidebar-foreground/80 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">Hôm nay</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <RecentTasks 
            tasks={filteredTasksForSidebar} 
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {selectedTask ? (
              <TaskDetail 
                task={selectedTask} 
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
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
        onSubmit={handleSubmitTask}
        taskToEdit={taskToEdit}
      />
    </SidebarProvider>
  );
}
