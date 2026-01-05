
'use client';

import { createContext, useState, useCallback, useMemo, useContext, useEffect } from 'react';
import type { Task, TaskType } from '@/lib/types';

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

// Helper function to safely get data from localStorage
const getTasksFromLocalStorage = (): Task[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const item = window.localStorage.getItem('tasks');
    if (item) {
      // Need to parse dates back into Date objects
      const parsedTasks = JSON.parse(item).map((t: any) => {
        const task: Task = { 
            ...t, 
            createdAt: new Date(t.createdAt),
            taskType: t.taskType || 'deadline' // Default old tasks to 'deadline'
        };
        if (t.startDate) task.startDate = new Date(t.startDate);
        if (t.endDate) task.endDate = new Date(t.endDate);
        if (t.taskType === 'recurring' && t.recurringDay) {
          // Migration from single day to multiple days
          task.recurringDays = Array.isArray(t.recurringDay) ? t.recurringDay : [t.recurringDay];
          delete (task as any).recurringDay;
        }
        if (t.recurringDays) {
            task.recurringDays = t.recurringDays;
        }

        task.subtasks = t.subtasks.map((st: any) => {
          const subtask = { ...st };
          if (st.startDate) subtask.startDate = new Date(st.startDate);
          if (st.endDate) subtask.endDate = new Date(st.endDate);
          return subtask;
        });
        return task;
      });
      return parsedTasks;
    }
  } catch (error) {
    console.warn('Error reading localStorage "tasks":', error);
  }
  // If nothing in localStorage or an error occurs, return an empty array.
  return [];
};


export const TaskProvider = ({ children }: { children: React.ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const initialData = getTasksFromLocalStorage();
    setTasks(initialData);
    if (initialData.length > 0) {
      setSelectedTaskId(initialData[0].id)
    }
  }, []);

  useEffect(() => {
    try {
      // Avoid saving empty tasks array on initial server render if localStorage is already populated
      if (tasks.length > 0 || localStorage.getItem('tasks') !== null) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
      }
    } catch (error) {
      console.error('Failed to save tasks to localStorage:', error);
    }
  }, [tasks]);


  const addTask = useCallback((taskData: Task) => {
    setTasks(prevTasks => {
      const newTasks = [taskData, ...prevTasks];
      if (prevTasks.length === 0) {
        setSelectedTaskId(taskData.id);
      }
      return newTasks;
    });
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => {
        const newTasks = prevTasks.filter(task => task.id !== taskId);
        if (selectedTaskId === taskId) {
            setSelectedTaskId(newTasks.length > 0 ? newTasks[0].id : null);
        }
        return newTasks;
    });
  }, [selectedTaskId]);

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
