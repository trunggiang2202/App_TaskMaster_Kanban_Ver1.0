

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Plus, Trash2, Paperclip, X, Zap, ArrowRightCircle, Save, PlusCircle, ArrowLeft } from 'lucide-react';
import type { Task, Subtask, TaskType } from '@/lib/types';
import { isAfter, addDays, startOfDay, getDay, isWithinInterval } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, WEEKDAY_ABBREVIATIONS, WEEKDAY_INDICES, parseDate } from '@/lib/utils';
import { DateSegmentInput } from '@/components/ui/date-segment-input';
import { useTasks } from '@/contexts/TaskContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TaskTypeDialog } from './task-type-dialog';
import { Separator } from '../ui/separator';

type Idea = { id: string; title: string; };
const IDEAS_STORAGE_KEY = 'taskmaster-ideas';

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(['image', 'file']).optional(),
});

const subtaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(), // This will be the single date for the subtask
  attachments: z.array(attachmentSchema).optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, 'Lộ trình phải có tên.'),
  description: z.string().optional(),
  taskType: z.custom<TaskType>(),
  recurringDays: z.array(z.number()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  subtasks: z.array(subtaskSchema).optional(),
}).refine(data => {
  if (data.taskType === 'recurring') {
    return data.recurringDays && data.recurringDays.length > 0;
  }
  return true;
}, {
  message: "Vui lòng chọn ít nhất một ngày lặp lại.",
  path: ["recurringDays"],
}).refine(data => {
  if (data.taskType === 'deadline') {
    return data.startDate && data.startDate.match(/^\d{2}-\d{2}-\d{4}$/);
  }
  return true;
}, {
  message: " ",
  path: ["startDate"],
}).refine(data => {
  if (data.taskType === 'deadline') {
    return data.endDate && data.endDate.match(/^\d{2}-\d{2}-\d{4}\d*$/);
  }
  return true;
}, {
  message: " ",
  path: ["endDate"],
}).refine(data => {
    if (data.taskType === 'deadline' && data.subtasks) {
        for (const subtask of data.subtasks) {
            if (subtask.title && subtask.title.trim() !== '') {
                if (!subtask.startDate) {
                    return false; 
                }
            }
        }
    }
    return true;
}, {
  message: "Công việc con có tiêu đề phải có ngày hợp lệ.",
  path: ["subtasks"],
}).refine(data => {
    if (data.taskType !== 'deadline' || !data.startDate || !data.endDate) return true;

    const taskStartDate = parseDate(data.startDate);
    const taskEndDate = parseDate(data.endDate);

    if (!taskStartDate || !taskEndDate || !data.subtasks) return true;

    for (const subtask of data.subtasks) {
        if (subtask.title && subtask.title.trim() !== '' && subtask.startDate) {
            const subtaskDate = parseDate(subtask.startDate);
            if (!subtaskDate) continue;
            if (subtaskDate < taskStartDate || subtaskDate > taskEndDate) return false;
        }
    }
    return true;
}, {
    message: "Ngày của công việc con phải nằm trong khoảng thời gian của lộ trình cha.",
    path: ["subtasks"],
}).refine((data) => {
    if (data.taskType !== 'deadline' || !data.startDate || !data.endDate) return true;
    const start = parseDate(data.startDate);
    const end = parseDate(data.endDate);
    if (start && end) {
      return end >= start;
    }
    return true;
}, {
    message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.",
    path: ["endDate"], 
}).refine((data) => {
    if (data.taskType === 'recurring' || data.taskType === 'deadline') {
        const hasTitledSubtask = (data.subtasks || []).some(st => st.title && st.title.trim() !== '');
        if ((data.subtasks || []).length === 0 || !hasTitledSubtask) {
            return false;
        }
    }
    return true;
}, {
    message: "Lộ trình phải có ít nhất một công việc.",
    path: ["subtasks"],
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taskToEdit?: Task;
  initialTaskType: TaskType;
  taskToConvert?: { title: string, id: string } | null;
  onConvertToTask: (title: string, id: string) => void;
}

export function TaskDialog({ isOpen, onOpenChange, taskToEdit, initialTaskType, taskToConvert, onConvertToTask }: TaskDialogProps) {
  const { addTask, updateTask } = useTasks();
  const subtaskAttachmentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const subtaskTitleRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState('task');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    mode: 'all',
    defaultValues: {
      title: '',
      description: '',
      taskType: initialTaskType,
      recurringDays: [],
      subtasks: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });
  
  const taskType = form.watch('taskType');

  useEffect(() => {
    form.setValue('taskType', initialTaskType);
  }, [initialTaskType, form]);

  useEffect(() => {
    if (taskType === 'idea' && isOpen) {
      try {
        const storedIdeas = localStorage.getItem(IDEAS_STORAGE_KEY);
        if (storedIdeas) {
          setIdeas(JSON.parse(storedIdeas));
        }
      } catch (error) {
        console.error("Failed to load ideas from localStorage:", error);
      }
    }
  }, [taskType, isOpen]);

  useEffect(() => {
    if (taskType === 'idea') {
      try {
        localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
      } catch (error) {
        console.error("Failed to save ideas to localStorage:", error);
      }
    }
  }, [ideas, taskType]);


  useEffect(() => {
    if (isOpen) {
      form.clearErrors(); // Clear previous validation errors
      setActiveTab('task');
      replace([]); // IMPORTANT: Safely clear the field array

      let defaultValues: TaskFormData;
      const formatDate = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

      if (taskToEdit) {
        defaultValues = {
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          taskType: taskToEdit.taskType,
          startDate: taskToEdit.startDate ? formatDate(new Date(taskToEdit.startDate)) : '',
          endDate: taskToEdit.endDate ? formatDate(new Date(taskToEdit.endDate)) : '',
          recurringDays: taskToEdit.recurringDays || [],
          subtasks: taskToEdit.subtasks.map(st => ({
              id: st.id,
              title: st.title,
              description: st.description || '',
              startDate: st.startDate ? formatDate(new Date(st.startDate)) : '',
              attachments: st.attachments || [],
          })),
        };
      } else {
        const now = new Date();
        const tomorrow = addDays(now, 1);
        
        defaultValues = {
          title: taskToConvert?.title || '',
          description: '',
          taskType: initialTaskType,
          startDate: formatDate(now),
          endDate: formatDate(tomorrow),
          recurringDays: [],
          subtasks: initialTaskType === 'idea' ? [] : [],
        };
      }
      form.reset(defaultValues);
      
      if (initialTaskType !== 'idea' && !taskToEdit) {
          append({ 
            title: "", 
            description: "", 
            attachments: [] 
          });
      }

    }
  }, [taskToEdit, isOpen, initialTaskType, taskToConvert, append, replace, form]);

  const addEmptySubtask = (shouldFocus = true) => {
    const newSubtask: Partial<Subtask> = { 
        title: "", 
        description: "", 
        attachments: [] 
    };
    if (taskType === 'deadline') {
        const now = new Date();
        const formatDate = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        newSubtask.startDate = formatDate(now);
    }
    append(newSubtask as any); // Cast to any to bypass strict type checking for the partial subtask

    if (shouldFocus) {
        setTimeout(() => {
            const lastIndex = fields.length;
            const lastInput = subtaskTitleRefs.current[lastIndex];
            if (lastInput) {
                lastInput.focus();
            }
        }, 0);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'subtasks' && fields.length === 1 && !taskToEdit) {
      setTimeout(() => {
        const firstInput = subtaskTitleRefs.current[0];
        if (firstInput) {
          firstInput.focus();
        }
      }, 0);
    }
  }, [activeTab, fields.length, taskToEdit]);


  const handleIdeaSubmit = useCallback(form.handleSubmit((data: TaskFormData) => {
    const newIdea: Idea = {
        id: crypto.randomUUID(),
        title: data.title,
    };
    setIdeas(prev => [...prev, newIdea]);
    form.reset({
        ...form.getValues(),
        title: '',
        description: '',
    });
    form.setFocus('title');
  }), [form, setIdeas]);


  const removeIdea = (id: string) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
  };


  const handleSubmit = useCallback((data: TaskFormData) => {
    if (taskType === 'idea') {
      const ideaTasks = ideas.map(idea => ({
        id: idea.id,
        title: idea.title,
        taskType: 'idea' as TaskType,
        status: 'To Do' as 'To Do',
        createdAt: new Date(),
        subtasks: []
      }));
      ideaTasks.forEach(task => addTask(task));
      setIdeas([]);
      onOpenChange(false);
      return;
    }
    
    // Final validation for non-idea tasks
    if (data.taskType !== 'idea') {
      const hasTitledSubtask = (data.subtasks || []).some(st => st.title && st.title.trim() !== '');
      if ((data.subtasks || []).length > 0 && !hasTitledSubtask) {
        form.setError("subtasks", { type: "manual", message: "Lộ trình phải có ít nhất một công việc." });
        return;
      }
    }

    const task: Omit<Task, 'id' | 'createdAt' | 'status'> & { id?: string, createdAt?: Date, status?: any, convertedFrom?: string } = {
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        subtasks: [],
    };
    
    if (taskToConvert) {
      task.convertedFrom = taskToConvert.id;
    }


    if (data.taskType === 'deadline') {
        const taskStartDate = parseDate(data.startDate);
        const taskEndDate = parseDate(data.endDate);
        if (!taskStartDate || !taskEndDate) return;
        task.startDate = taskStartDate;
        task.endDate = taskEndDate;
        task.subtasks = data.subtasks ? data.subtasks
            .filter(st => st.title && st.title.trim() !== '')
            .map((st) => {
                const originalSubtask = taskToEdit?.subtasks.find(original => original.id === st.id);
                const subtaskDate = parseDate(st.startDate);
                return {
                    id: st.id || crypto.randomUUID(),
                    title: st.title ?? '',
                    description: st.description,
                    completed: originalSubtask?.completed || false,
                    isManuallyStarted: originalSubtask?.isManuallyStarted || false,
                    startDate: subtaskDate as Date,
                    endDate: subtaskDate as Date, // Set end date same as start date
                    attachments: st.attachments,
                };
            }) : [];
    } else if (data.taskType === 'recurring') {
        task.recurringDays = data.recurringDays;
        task.subtasks = data.subtasks ? data.subtasks
            .filter(st => st.title && st.title.trim() !== '')
            .map((st) => {
                const originalSubtask = taskToEdit?.subtasks.find(original => original.id === st.id);
                return {
                    id: st.id || crypto.randomUUID(),
                    title: st.title ?? '',
                    description: st.description,
                    completed: originalSubtask?.completed || false,
                    isManuallyStarted: originalSubtask?.isManuallyStarted || false,
                    attachments: st.attachments,
                };
            }) : [];
    }
    
    const finalTask: Task = {
        ...task,
        id: taskToEdit?.id || crypto.randomUUID(),
        status: taskToEdit?.status || 'To Do',
        createdAt: taskToEdit?.createdAt || new Date(),
    } as Task;

    if (taskToEdit) {
      updateTask(finalTask);
    } else {
      addTask(finalTask);
    }
    onOpenChange(false);
  }, [taskToEdit, addTask, updateTask, onOpenChange, form, taskType, ideas, taskToConvert]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const file = e.target.files?.[0];
      if (file) {
          const isImage = file.type.startsWith('image/');
          if (isImage) {
            const reader = new FileReader();
            reader.onload = (readEvent) => {
                const newAttachment = { name: file.name, url: readEvent.target?.result as string, type: 'image' as const };
                const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
                form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment], { shouldValidate: true });
            };
            reader.readAsDataURL(file);
          } else {
            const newAttachment = { name: file.name, url: URL.createObjectURL(file), type: 'file' as const };
            const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
            form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment], { shouldValidate: true });
          }
      }
  };

  const triggerValidationAndSwitchTab = async () => {
    const result = await form.trigger(["title", "startDate", "endDate", "description", "recurringDays"]);
    if (result) {
        setActiveTab('subtasks');
    }
  };

  const subtasksFromForm = form.watch('subtasks');
  
  const uncompletedSubtasksCount = useMemo(() => {
    if (taskType === 'idea') return 0;
    return (subtasksFromForm || []).filter((st) => {
      const originalSubtask = taskToEdit?.subtasks.find(original => original.id === st.id);
      return originalSubtask ? !originalSubtask.completed : (st.title && st.title.trim() !== '');
    }).length;
  }, [subtasksFromForm, taskToEdit, taskType]);


  const getSubtaskBorderColor = (index: number) => {
    const subtask = form.watch(`subtasks.${index}`);
    if (!subtask) return 'border-muted';
    const now = new Date();

    const originalSubtask = taskToEdit?.subtasks.find(original => original.id === subtask.id);
    const isCompleted = originalSubtask ? originalSubtask.completed : false;

    if (isCompleted) return 'border-chart-2';
    
    if (taskType === 'recurring') {
        const recurringDays = form.watch('recurringDays');
        return recurringDays?.includes(getDay(now)) ? 'border-amber-500' : 'border-primary';
    }

    const subtaskDate = parseDate(subtask.startDate);
    if (!subtaskDate) return 'border-muted';
    
    if (isSameDay(now, subtaskDate)) {
        return 'border-amber-500';
    }
    if (isAfter(now, subtaskDate)) { 
        return 'border-destructive';
    }
    if (isAfter(subtaskDate, now)) {
        return 'border-primary';
    }
    
    return 'border-muted';
  };
  
  const isTaskTabInvalid = useMemo(() => {
    const { title, startDate, endDate, recurringDays } = form.getValues();
    const errors = form.formState.errors;

    if (errors.title || errors.description) return true;
    
    if (taskType === 'deadline') {
        if (errors.startDate || errors.endDate || errors.root) return true;
        if (!startDate || !endDate) return true;
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        if (!start || !end || end < start) return true;
    }
    if (taskType === 'recurring') {
        if (errors.recurringDays) return true;
        if (!recurringDays || recurringDays.length === 0) return true;
    }
    
    return false;
  }, [form.watch(), form.formState.errors, taskType]);


  const renderSubtasks = () => (
    <div className="space-y-2">
      <div className="px-1 pt-4 text-sm font-medium text-muted-foreground">
        Danh sách công việc ({uncompletedSubtasksCount})
      </div>
      <div className="py-2 space-y-4">
        <div className="space-y-2">
            <Accordion type="multiple" className="w-full space-y-2">
              {fields.map((field, index) => {
                  const subtaskAttachments = form.watch(`subtasks.${index}.attachments`) || [];
                  const subtaskTitle = form.watch(`subtasks.${index}.title`);
                  const hasTitle = subtaskTitle && subtaskTitle.trim() !== '';

                  return (
                    <AccordionItem 
                      value={`item-${index}`} 
                      key={field.id} 
                      className={cn(
                        "border rounded-md border-l-4",
                        // getSubtaskBorderColor(index) // Simplified for now
                      )}
                    >
                        <div className="flex items-center w-full p-1 pr-2">
                          <FormField
                            control={form.control}
                            name={`subtasks.${index}.title`}
                            render={({ field: { ref, ...fieldProps } }) => (
                              <FormItem className="flex-grow">
                                <FormControl>
                                  <Input 
                                    placeholder="Nhập tên công việc" 
                                    {...fieldProps}
                                    ref={(el) => {
                                      ref(el);
                                      subtaskTitleRefs.current[index] = el;
                                    }}
                                    className="border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" 
                                  />
                                </FormControl>
                                <FormMessage className="pl-3" />
                              </FormItem>
                            )}
                            />
                            <AccordionTrigger className="p-2 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                            </AccordionTrigger>

                            {hasTitle ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 transition-transform hover:scale-125 hover:bg-transparent border border-transparent hover:border-destructive/50 rounded-full">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Hành động này sẽ xóa công việc <span className="font-bold">{subtaskTitle}</span> vĩnh viễn.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={() => remove(index)}>
                                      Xóa
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 transition-transform hover:scale-125 hover:bg-transparent border border-transparent hover:border-destructive/50 rounded-full" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                        </div>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-4 p-4 rounded-md border bg-background">
                            <FormField
                              control={form.control}
                              name={`subtasks.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Thêm chi tiết cho công việc..." {...field} className="bg-primary/5" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                                control={form.control}
                                name={`subtasks.${index}.attachments`}
                                render={() => (
                                    <FormItem>
                                        <Button type="button" size="sm" onClick={() => subtaskAttachmentRefs.current[index]?.click()} className="bg-primary/10 hover:bg-primary/20 text-foreground">
                                            <Paperclip className="mr-2 h-4 w-4" />
                                            Đính kèm tệp
                                        </Button>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                className="hidden"
                                                ref={(el) => { subtaskAttachmentRefs.current[index] = el; }}
                                                onChange={(e) => handleFileChange(e, index)}
                                            />
                                        </FormControl>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {subtaskAttachments.map((attachment, attachmentIndex) => (
                                                <div key={attachmentIndex} className="relative group">
                                                  {attachment.type === 'image' ? (
                                                    <Image src={attachment.url} alt={attachment.name} width={100} height={100} className="w-full h-24 object-cover rounded-md" />
                                                  ) : (
                                                    <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center p-2">
                                                      <p className="text-xs text-center text-muted-foreground truncate">{attachment.name}</p>
                                                    </div>
                                                  )}
                                                  <Button 
                                                      type="button" 
                                                      variant="destructive" 
                                                      size="icon" 
                                                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                      onClick={() => {
                                                          const current = form.getValues(`subtasks.${index}.attachments`) || [];
                                                          form.setValue(`subtasks.${index}.attachments`, current.filter((_, i) => i !== attachmentIndex), { shouldValidate: true });
                                                      }}>
                                                      <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {taskType === 'deadline' && (
                              <div className="space-y-2">
                                <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                <FormField
                                  control={form.control}
                                  name={`subtasks.${index}.startDate`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <DateSegmentInput
                                        value={field.value ?? ''}
                                        onChange={field.onChange}
                                        className="bg-primary/5"
                                      />
                                    </FormControl>
                                  )}
                                />
                                <FormMessage />
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                  )
                })}
            </Accordion>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="mt-2"
            onClick={() => addEmptySubtask()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm Công việc
          </Button>
        </div>
        {form.formState.errors.subtasks && <FormMessage>{form.formState.errors.subtasks.root?.message || form.formState.errors.subtasks.message}</FormMessage>}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="pb-0">
          <DialogTitle>{taskToEdit ? 'Chỉnh sửa lộ trình' : (taskType === 'idea' ? 'Thêm ý tưởng mới' : 'Tạo lộ trình mới')}</DialogTitle>
          {taskToEdit ? null : taskType === 'recurring' ? null : null}
        </DialogHeader>

        <Form {...form}>
          <div className="flex-1 overflow-y-auto custom-scrollbar -mr-6 pr-6">
            {taskType === 'deadline' ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 bg-primary/10 p-1">
                  <TabsTrigger value="task" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground">Lộ trình</TabsTrigger>
                  <TabsTrigger
                    value="subtasks"
                    disabled={isTaskTabInvalid}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground"
                  >
                    Công việc
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="task" className="mt-0 py-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên lộ trình</FormLabel>
                          <FormControl>
                            <Input placeholder="Tên lộ trình" {...field} autoFocus className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Thêm chi tiết về lộ trình..." {...field} className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <FormLabel>Ngày bắt đầu (DD-MM-YYYY)</FormLabel>
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                <FormControl>
                                    <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} className="bg-primary/5"/>
                                </FormControl>
                                )}
                            />
                            <FormMessage />
                        </div>
                        <div className="space-y-2">
                            <FormLabel>Ngày kết thúc (DD-MM-YYYY)</FormLabel>
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                <FormControl>
                                    <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} className="bg-primary/5"/>
                                </FormControl>
                                )}
                            />
                            <FormMessage />
                        </div>
                    </div>
                     {form.formState.errors.startDate && <FormMessage>{form.formState.errors.startDate.message}</FormMessage>}
                     {form.formState.errors.endDate && <FormMessage>{form.formState.errors.endDate.message}</FormMessage>}
                     {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}
                </TabsContent>
                <TabsContent value="subtasks" className="mt-0 space-y-2">
                  {renderSubtasks()}
                </TabsContent>
              </Tabs>
            ) : taskType === 'recurring' ? ( // Recurring Task View
              <div className="py-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên lộ trình</FormLabel>
                          <FormControl>
                            <Input placeholder="Tên lộ trình" {...field} autoFocus className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Thêm chi tiết về lộ trình..." {...field} className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="recurringDays"
                        render={({ field }) => (
                          <FormItem>
                              <FormLabel>Lặp lại vào</FormLabel>
                              <FormControl>
                                  <ToggleGroup
                                      type="multiple"
                                      variant="outline"
                                      value={field.value?.map(String) || []}
                                      onValueChange={(value) => field.onChange(value.map(Number))}
                                      className="grid grid-cols-4 sm:grid-cols-7 gap-2"
                                  >
                                      {WEEKDAY_INDICES.map((dayIndex, arrayIndex) => (
                                          <ToggleGroupItem 
                                            key={dayIndex} 
                                            value={String(dayIndex)} 
                                            aria-label={`Toggle ${WEEKDAY_ABBREVIATIONS[arrayIndex]}`}
                                            className="bg-primary/5 border-primary/20 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:scale-110 transform transition-transform hover:bg-primary/10 hover:text-foreground"
                                          >
                                              {WEEKDAY_ABBREVIATIONS[arrayIndex]}
                                          </ToggleGroupItem>
                                      ))}
                                  </ToggleGroup>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                        )}
                    />
                    {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}
                  {renderSubtasks()}
              </div>
            ) : ( // Idea Task View
              <div className="py-4 space-y-4">
                <form onSubmit={handleIdeaSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên ý tưởng</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nhập ý tưởng của bạn..." 
                            {...field} 
                            autoFocus 
                            className="bg-primary/5"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleIdeaSubmit();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
                
                {ideas.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Ý tưởng đã lưu ({ideas.length})</h3>
                        <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                        {ideas.map((idea) => (
                            <div key={idea.id} className="flex items-center justify-between p-2 bg-primary/5 rounded-md transition-colors">
                                <p className="font-medium text-foreground flex-1 truncate pr-2">{idea.title}</p>
                                <div className="flex items-center">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => onConvertToTask(idea.title, idea.id)}>
                                      <ArrowRightCircle className="h-4 w-4 text-primary"/>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => removeIdea(idea.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive"/>
                                  </Button>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 mt-auto">
            {taskType === 'deadline' ? (
              activeTab === 'task' ? (
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" />Hủy</Button>
                  <Button type="button" onClick={triggerValidationAndSwitchTab} className={cn(!isTaskTabInvalid && "bg-primary hover:bg-primary/90 text-primary-foreground")} disabled={isTaskTabInvalid}>Tiếp tục <ArrowRightCircle className="ml-2 h-4 w-4" /></Button>
                </>
              ) : (
                <>
                    <Button type="button" variant="outline" onClick={() => { setActiveTab('task'); }}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
                    <Button type="button" disabled={!form.formState.isValid} onClick={form.handleSubmit(handleSubmit)}>
                        {taskToEdit ? <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</> : <><PlusCircle className="mr-2 h-4 w-4" />Tạo lộ trình</>}
                    </Button>
                </>
              )
            ) : taskType === 'idea' ? (
                 <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="mr-2 h-4 w-4" />
                        {ideas.length > 0 ? 'Đóng' : 'Hủy'}
                    </Button>
                    <Button type="button" disabled={!form.getValues('title')} onClick={handleIdeaSubmit}>
                        <Save className="mr-2 h-4 w-4" />
                        Lưu ý tưởng
                    </Button>
                </>
            ) : ( // Recurring task footer
               <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" />Hủy</Button>
                <Button type="button" disabled={!form.formState.isValid} onClick={form.handleSubmit(handleSubmit)}>
                    {taskToEdit ? <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</> : <><PlusCircle className="mr-2 h-4 w-4" />Tạo lộ trình</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    

    
