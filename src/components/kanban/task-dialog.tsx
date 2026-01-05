
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
import { Plus, Trash2, Paperclip, X, Zap, Calendar as CalendarIcon } from 'lucide-react';
import type { Task, Subtask, TaskType } from '@/lib/types';
import { isAfter } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, WEEKDAY_ABBREVIATIONS, WEEKDAY_INDICES, parseDateTime } from '@/lib/utils';
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


const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(['image', 'file']).optional(),
});

const subtaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const taskSchema = z.object({
  title: z.string().min(3, 'Nhiệm vụ phải có ít nhất 3 ký tự.'),
  description: z.string().optional(),
  taskType: z.custom<TaskType>(),
  recurringDays: z.array(z.number()).optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
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
    return data.startTime && data.startTime.match(/^\d{2}:\d{2}$/);
  }
  return true;
}, {
  message: " ",
  path: ["startTime"],
}).refine(data => {
  if (data.taskType === 'deadline') {
    return data.endDate && data.endDate.match(/^\d{2}-\d{2}-\d{4}$/);
  }
  return true;
}, {
  message: " ",
  path: ["endDate"],
}).refine(data => {
  if (data.taskType === 'deadline') {
    return data.endTime && data.endTime.match(/^\d{2}:\d{2}$/);
  }
  return true;
}, {
  message: " ",
  path: ["endTime"],
}).refine(data => {
    if (data.taskType === 'deadline' && data.subtasks) {
        for (const subtask of data.subtasks) {
            if (subtask.title && subtask.title.trim() !== '') {
                if (!subtask.startDate || !subtask.startTime || !subtask.endDate || !subtask.endTime) {
                    return false; 
                }
                const startSubtaskTime = parseDateTime(subtask.startDate, subtask.startTime);
                const endSubtaskTime = parseDateTime(subtask.endDate, subtask.endTime);
                if (!startSubtaskTime || !endSubtaskTime || endSubtaskTime <= startSubtaskTime) {
                    return false;
                }
            }
        }
    }
    return true;
}, {
  message: "Công việc con có tiêu đề phải có deadline hợp lệ.",
  path: ["subtasks"],
}).refine(data => {
    if (data.taskType !== 'deadline' || !data.startDate || !data.startTime || !data.endDate || !data.endTime) return true;

    const taskStartDateTime = parseDateTime(data.startDate, data.startTime);
    const taskEndDateTime = parseDateTime(data.endDate, data.endTime);

    if (!taskStartDateTime || !taskEndDateTime || !data.subtasks) return true;

    for (const subtask of data.subtasks) {
        if (subtask.title && subtask.title.trim() !== '' && subtask.startDate && subtask.startTime && subtask.endDate && subtask.endTime) {
            const subtaskStartDateTime = parseDateTime(subtask.startDate, subtask.startTime);
            const subtaskEndDateTime = parseDateTime(subtask.endDate, subtask.endTime);

            if (!subtaskStartDateTime || !subtaskEndDateTime) continue;
            if (subtaskStartDateTime < taskStartDateTime || subtaskEndDateTime > taskEndDateTime) return false;
        }
    }
    return true;
}, {
    message: "Deadline của công việc con phải nằm trong khoảng thời gian của nhiệm vụ cha.",
    path: ["subtasks"],
}).refine((data) => {
    if (data.taskType !== 'deadline' || !data.startDate || !data.startTime || !data.endDate || !data.endTime) return true;
    const start = parseDateTime(data.startDate, data.startTime);
    const end = parseDateTime(data.endDate, data.endTime);
    if (start && end) {
      return end > start;
    }
    return true;
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endDate"], 
}).refine((data) => {
    if (data.subtasks && data.subtasks.length > 0) {
      return data.subtasks.some(st => st.title && st.title.trim() !== '');
    }
    return true;
}, {
    message: "Nhiệm vụ phải có ít nhất một công việc.",
    path: ["subtasks"],
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taskToEdit?: Task;
  initialTaskType: TaskType;
}

export function TaskDialog({ isOpen, onOpenChange, taskToEdit, initialTaskType }: TaskDialogProps) {
  const { addTask, updateTask } = useTasks();
  const subtaskAttachmentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState('task');
  
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
    if (isOpen) {
      replace([]); // IMPORTANT: Safely clear the field array
      form.clearErrors();
      setActiveTab('task');
      if (taskToEdit) {
        form.reset({
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          taskType: taskToEdit.taskType,
          startDate: taskToEdit.startDate ? new Date(taskToEdit.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
          startTime: taskToEdit.startDate ? new Date(taskToEdit.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          endDate: taskToEdit.endDate ? new Date(taskToEdit.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
          endTime: taskToEdit.endDate ? new Date(taskToEdit.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          recurringDays: taskToEdit.recurringDays || [],
          subtasks: taskToEdit.subtasks.map(st => ({
              title: st.title,
              description: st.description || '',
              startDate: st.startDate ? new Date(st.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
              startTime: st.startDate ? new Date(st.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
              endDate: st.endDate ? new Date(st.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
              endTime: st.endDate ? new Date(st.endDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
              attachments: st.attachments || [],
          })),
        });
      } else {
        const currentYear = String(new Date().getFullYear());
        const dateWithYearOnly = `__-__-${currentYear}`;
        form.reset({
          title: '',
          description: '',
          taskType: initialTaskType,
          startDate: dateWithYearOnly,
          startTime: '04:00',
          endDate: dateWithYearOnly,
          endTime: '23:59',
          recurringDays: [],
          subtasks: [{ 
            title: "", 
            description: "", 
            startDate: dateWithYearOnly,
            startTime: '04:00', 
            endDate: dateWithYearOnly,
            endTime: '23:59', 
            attachments: [] 
          }],
        });
      }
    }
  }, [taskToEdit, isOpen, initialTaskType, replace, form.reset, form.clearErrors]);


  const handleSubmit = useCallback((data: TaskFormData) => {
    const task: Omit<Task, 'id' | 'createdAt' | 'status'> & { id?: string, createdAt?: Date, status?: any } = {
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        subtasks: [],
    };

    if (data.taskType === 'deadline') {
        const taskStartDate = parseDateTime(data.startDate, data.startTime);
        const taskEndDate = parseDateTime(data.endDate, data.endTime);
        if (!taskStartDate || !taskEndDate) return;
        task.startDate = taskStartDate;
        task.endDate = taskEndDate;
        task.subtasks = data.subtasks ? data.subtasks
            .filter(st => st.title && st.title.trim() !== '')
            .map((st, index) => ({
                id: taskToEdit?.subtasks[index]?.id || crypto.randomUUID(),
                title: st.title ?? '',
                description: st.description,
                completed: taskToEdit?.subtasks[index]?.completed || false,
                startDate: parseDateTime(st.startDate, st.startTime) as Date,
                endDate: parseDateTime(st.endDate, st.endTime) as Date,
                attachments: st.attachments,
            })) : [];
    } else { // recurring
        task.recurringDays = data.recurringDays;
        task.subtasks = data.subtasks ? data.subtasks
            .filter(st => st.title && st.title.trim() !== '')
            .map((st, index) => ({
                id: taskToEdit?.subtasks[index]?.id || crypto.randomUUID(),
                title: st.title ?? '',
                description: st.description,
                completed: taskToEdit?.subtasks[index]?.completed || false,
                attachments: st.attachments,
            })) : [];
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
  }, [taskToEdit, addTask, updateTask, onOpenChange]);

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
    const result = await form.trigger(["title", "startDate", "startTime", "endDate", "endTime", "description", "recurringDays"]);
    if (result) {
        setActiveTab('subtasks');
    }
  };

  const subtasksFromForm = form.watch('subtasks');
  
  const uncompletedSubtasksCount = useMemo(() => {
    const allSubtasks = taskToEdit?.subtasks || [];
    return (subtasksFromForm || []).filter((st, index) => {
      const originalSubtask = allSubtasks[index];
      const isCompleted = originalSubtask ? originalSubtask.completed : false;
      return !isCompleted && st.title && st.title.trim() !== '';
    }).length;
  }, [subtasksFromForm, taskToEdit]);


  const getSubtaskBorderColor = (index: number) => {
    if (taskType === 'recurring') return 'border-muted';

    const subtask = form.watch(`subtasks.${index}`);
    const now = new Date();

    const isCompleted = taskToEdit?.subtasks[index]?.completed || false;
    if (isCompleted) return 'border-chart-2';

    const startDate = parseDateTime(subtask.startDate, subtask.startTime);
    const endDate = parseDateTime(subtask.endDate, subtask.endTime);

    if (!startDate || !endDate) return 'border-muted';

    if (isAfter(now, startDate)) { 
        if (isAfter(now, endDate)) { 
            return 'border-destructive';
        }
        return 'border-accent';
    }

    if (isAfter(startDate, now)) {
        return 'border-primary';
    }
    
    return 'border-muted';
  };

  const isTaskTabInvalid = Object.keys(form.formState.errors).some(key =>
    ['title', 'startDate', 'startTime', 'endDate', 'endTime', 'root', 'description', 'recurringDays'].includes(key) || (form.formState.errors as any)[key]?.type === 'custom'
  );


  const renderSubtasks = () => (
    <Form {...form}>
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
                        getSubtaskBorderColor(index)
                      )}
                    >
                        <div className="flex items-center w-full p-1 pr-2">
                          <FormField
                            control={form.control}
                            name={`subtasks.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormControl>
                                  <Input 
                                    placeholder="Nhập tên công việc" 
                                    {...field}
                                    className="border-none bg-transparent shadow-none focus-visible:ring-0" 
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
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
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
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}>
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
                                        <Button type="button" variant="ghost" size="sm" onClick={() => subtaskAttachmentRefs.current[index]?.click()} className="bg-muted text-foreground hover:bg-muted/80">
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormLabel>Bắt đầu</FormLabel>
                                    <div className="border p-3 rounded-md grid gap-4">
                                        <FormItem>
                                          <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                          <FormField
                                            control={form.control}
                                            name={`subtasks.${index}.startDate`}
                                            render={({ field }) => (
                                              <FormControl>
                                                <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} className="bg-primary/5" />
                                              </FormControl>
                                            )}
                                          />
                                          <FormMessage />
                                        </FormItem>
                                        <FormItem>
                                          <FormLabel>Giờ</FormLabel>
                                          <FormField
                                            control={form.control}
                                            name={`subtasks.${index}.startTime`}
                                            render={({ field }) => (
                                              <FormControl>
                                                <Input type="time" {...field} className="w-full bg-primary/5" />
                                              </FormControl>
                                            )}
                                          />
                                          <FormMessage />
                                        </FormItem>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                  <FormLabel>Kết thúc</FormLabel>
                                  <div className="border p-3 rounded-md grid gap-4">
                                      <FormItem>
                                        <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                        <FormField
                                          control={form.control}
                                          name={`subtasks.${index}.endDate`}
                                          render={({ field }) => (
                                            <FormControl>
                                              <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} className="bg-primary/5" />
                                            </FormControl>
                                          )}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                      <FormItem>
                                        <FormLabel>Giờ</FormLabel>
                                        <FormField
                                          control={form.control}
                                          name={`subtasks.${index}.endTime`}
                                          render={({ field }) => (
                                            <FormControl>
                                              <Input type="time" {...field} className="w-full bg-primary/5" />
                                            </FormControl>
                                          )}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                  </div>
                                </div>
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
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
                const currentYear = String(new Date().getFullYear());
                const dateWithYearOnly = `__-__-${currentYear}`;
                const newSubtask: any = { 
                    title: "", 
                    description: "", 
                    attachments: [] 
                };
                if (taskType === 'deadline') {
                    newSubtask.startDate = dateWithYearOnly;
                    newSubtask.startTime = '04:00';
                    newSubtask.endDate = dateWithYearOnly;
                    newSubtask.endTime = '23:59';
                }
                append(newSubtask);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm Công việc
          </Button>
        </div>
        {form.formState.errors.subtasks && <FormMessage>{form.formState.errors.subtasks.root?.message || form.formState.errors.subtasks.message}</FormMessage>}
      </div>
    </Form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Chỉnh sửa nhiệm vụ' : 'Thêm nhiệm vụ mới'}</DialogTitle>
          <DialogDescription>
             {taskToEdit ? 'Cập nhật chi tiết nhiệm vụ của bạn.' : (taskType === 'deadline' ? 'Nhiệm vụ với ngày bắt đầu và kết thúc cụ thể.' : 'Nhiệm vụ lặp lại vào các ngày cố định trong tuần.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-6 pr-6">
          {taskType === 'deadline' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 bg-primary/10 p-1">
                <TabsTrigger value="task" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nhiệm vụ</TabsTrigger>
                <TabsTrigger value="subtasks" disabled={isTaskTabInvalid} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Công việc</TabsTrigger>
              </TabsList>
              
              <TabsContent value="task" className="mt-0 py-4 space-y-4">
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên nhiệm vụ</FormLabel>
                          <FormControl>
                            <Input placeholder="Tên nhiệm vụ" {...field} className="bg-primary/5"/>
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
                            <Textarea placeholder="Thêm chi tiết về nhiệm vụ..." {...field} className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>Bắt đầu</FormLabel>
                          <div className="border p-3 rounded-md grid gap-4">
                                <FormItem>
                                <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
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
                                </FormItem>
                                <FormItem>
                                <FormLabel>Giờ</FormLabel>
                                <FormField
                                    control={form.control}
                                    name="startTime"
                                    render={({ field }) => (
                                    <FormControl>
                                        <Input type="time" {...field} className="bg-primary/5" />
                                    </FormControl>
                                    )}
                                />
                                <FormMessage />
                                </FormItem>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Kết thúc</FormLabel>
                          <div className="border p-3 rounded-md grid gap-4">
                                <FormItem>
                                <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
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
                                </FormItem>
                                <FormItem>
                                <FormLabel>Giờ</FormLabel>
                                <FormField
                                    control={form.control}
                                    name="endTime"
                                    render={({ field }) => (
                                    <FormControl>
                                        <Input type="time" {...field} className="bg-primary/5" />
                                    </FormControl>
                                    )}
                                />
                                <FormMessage />
                                </FormItem>
                          </div>
                        </div>
                    </div>
                     {form.formState.errors.endDate && <FormMessage>{form.formState.errors.endDate.message}</FormMessage>}
                     {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}
                  </Form>
              </TabsContent>
              <TabsContent value="subtasks" className="mt-0 space-y-2">
                {renderSubtasks()}
              </TabsContent>
            </Tabs>
          ) : ( // Recurring Task View
            <div className="py-4 space-y-4">
               <Form {...form}>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên nhiệm vụ</FormLabel>
                        <FormControl>
                          <Input placeholder="Tên nhiệm vụ" {...field} className="bg-primary/5"/>
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
                                        <ToggleGroupItem key={dayIndex} value={String(dayIndex)} aria-label={`Toggle ${WEEKDAY_ABBREVIATIONS[arrayIndex]}`}>
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
                </Form>
                {renderSubtasks()}
            </div>
          )}
        </div>
        
        <DialogFooter className="pt-4 mt-auto">
          {taskType === 'deadline' && activeTab === 'task' ? (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="button" onClick={triggerValidationAndSwitchTab}>Tiếp tục</Button>
            </>
          ) : taskType === 'deadline' && activeTab === 'subtasks' ? (
            <>
                <Button type="button" variant="outline" onClick={() => { setActiveTab('task'); }}>Quay lại</Button>
                <Button type="button" disabled={!form.formState.isValid} onClick={form.handleSubmit(handleSubmit)}>{taskToEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button>
            </>
          ) : ( // Recurring task footer
             <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="button" disabled={!form.formState.isValid} onClick={form.handleSubmit(handleSubmit)}>{taskToEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    

    

    