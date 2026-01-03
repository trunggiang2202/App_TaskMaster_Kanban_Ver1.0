'use client';

import { useState } from 'react';
import { initialTasks } from '@/lib/data';
import type { Task } from '@/lib/types';
import { SidebarProvider, Sidebar, SidebarRail, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import KanbanBoard from '@/components/kanban/kanban-board';
import { TaskDialog } from '@/components/kanban/task-dialog';
import { Plus } from 'lucide-react';
import { RecentTasks } from '@/components/sidebar/recent-tasks';
import { Separator } from '@/components/ui/separator';
import { isToday } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterType = 'all' | 'today';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks.map(t => ({...t, startDate: new Date(t.startDate), endDate: new Date(t.endDate), createdAt: new Date(t.createdAt) })));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
      return isToday(task.endDate);
    }
    return true;
  });

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className="p-4">
          <h2 className="text-2xl font-bold text-sidebar-foreground font-headline">TaskMaster</h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleOpenDialog()} className="w-full">
                <Plus />
                <span>New Task</span>
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
            onEditTask={handleOpenDialog}
            onDeleteTask={deleteTask}
          />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <KanbanBoard tasks={tasks} onUpdateTask={updateTask} onTaskStatusChange={handleTaskStatusChange} onEditTask={handleOpenDialog} />
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
