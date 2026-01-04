
'use client';

import { createContext, useState, useCallback, useMemo, useContext } from 'react';
import type { Task } from '@/lib/types';
import { initialTasks } from '@/lib/data';

interface TaskContextType {
  tasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: React.ReactNode }) => {
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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id || null);

  const addTask = useCallback((taskData: Task) => {
    setTasks(prevTasks => [taskData, ...prevTasks]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    if (selectedTaskId === taskId) {
      const remainingTasks = tasks.filter(task => task.id !== taskId);
      setSelectedTaskId(remainingTasks.length > 0 ? remainingTasks[0].id : null);
    }
  }, [selectedTaskId, tasks]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map(subtask =>
            subtask.id === subtaskId
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          );

          const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);

          let newStatus = task.status;
          if (allSubtasksDone) {
            newStatus = 'Done';
          } else if (task.status === 'Done' && !allSubtasksDone) {
            newStatus = 'In Progress';
          }

          return { ...task, subtasks: updatedSubtasks, status: newStatus };
        }
        return task;
      })
    );
  }, []);

  const value = useMemo(() => ({
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    addTask,
    updateTask,
    deleteTask,
    toggleSubtask,
  }), [tasks, selectedTaskId, addTask, updateTask, deleteTask, toggleSubtask]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
