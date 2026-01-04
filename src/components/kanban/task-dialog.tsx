
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Paperclip, X, Clock } from 'lucide-react';
import type { Task, Subtask, Attachment } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, isBefore, parse, addHours } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils';
import { DateSegmentInput } from '@/components/ui/date-segment-input';


const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(['image', 'file']).optional(),
});

const subtaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return null;
    try {
        const [day, month, year] = dateStr.split('-').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1000) return null;
        const [hour, minute] = timeStr.split(':').map(Number);
        if (isNaN(hour) || isNaN(minute)) return null;
        return new Date(year, month - 1, day, hour, minute);
    } catch {
        return null;
    }
};

const taskSchema = z.object({
  title: z.string().min(3, 'Nhiệm vụ phải có ít nhất 3 ký tự.'),
  description: z.string().optional(),
  startDate: z.string().refine(val => val && val.match(/^\d{2}-\d{2}-\d{4}$/), {
    message: " ",
  }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, " "),
  endDate: z.string().refine(val => val && val.match(/^\d{2}-\d{2}-\d{4}$/), {
    message: " ",
  }),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, " "),
  subtasks: z.array(subtaskSchema).optional(),
}).refine(data => {
    const startDateTime = parseDateTime(data.startDate, data.startTime);
    const endDateTime = parseDateTime(data.endDate, data.endTime);
    return endDateTime && startDateTime && endDateTime > startDateTime;
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endDate"],
}).refine(data => {
  if (data.subtasks) {
    for (const subtask of data.subtasks) {
      if (subtask.title && subtask.title.trim() !== '') {
        if (!subtask.startDate || !subtask.startTime || !subtask.endDate || !subtask.endTime) {
          return false; // Invalid if a subtask with a title is missing any deadline field
        }
        const startSubtaskTime = parseDateTime(subtask.startDate, subtask.startTime);
        const endSubtaskTime = parseDateTime(subtask.endDate, subtask.endTime);
        if (!startSubtaskTime || !endSubtaskTime || endSubtaskTime <= startSubtaskTime) {
            return false; // Subtask end time must be after start time
        }
      }
    }
  }
  return true;
}, {
  message: "Công việc con có tiêu đề phải có deadline hợp lệ (ngày/giờ bắt đầu và kết thúc, và thời gian kết thúc phải sau thời gian bắt đầu).",
  path: ["subtasks"],
}).refine(data => {
    const taskStartDateTime = parseDateTime(data.startDate, data.startTime);
    const taskEndDateTime = parseDateTime(data.endDate, data.endTime);

    if (!taskStartDateTime || !taskEndDateTime || !data.subtasks) {
        return true; // Cannot validate if parent dates are invalid or no subtasks
    }

    for (const subtask of data.subtasks) {
        if (subtask.title && subtask.title.trim() !== '' && subtask.startDate && subtask.startTime && subtask.endDate && subtask.endTime) {
            const subtaskStartDateTime = parseDateTime(subtask.startDate, subtask.startTime);
            const subtaskEndDateTime = parseDateTime(subtask.endDate, subtask.endTime);

            if (!subtaskStartDateTime || !subtaskEndDateTime) {
                continue; // Already handled by previous refine
            }

            if (subtaskStartDateTime < taskStartDateTime || subtaskEndDateTime > taskEndDateTime) {
                return false; // Subtask deadline is outside parent task's deadline
            }
        }
    }
    return true;
}, {
    message: "Deadline của công việc con phải nằm trong khoảng thời gian của nhiệm vụ cha.",
    path: ["subtasks"],
}).refine(data => {
    const hasAtLeastOneSubtask = data.subtasks && data.subtasks.filter(st => st.title && st.title.trim() !== '').length > 0;
    return hasAtLeastOneSubtask;
}, {
    message: "Nhiệm vụ phải có ít nhất một công việc.",
    path: ["subtasks"],
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task) => void;
  taskToEdit?: Task;
}

export function TaskDialog({ isOpen, onOpenChange, onSubmit, taskToEdit }: TaskDialogProps) {
  const subtaskAttachmentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState('task');
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      subtasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });
  
  useEffect(() => {
    if (isOpen) {
      setActiveTab('task'); // Reset to the first tab whenever the dialog opens
      if (taskToEdit) {
        form.reset({
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          startDate: format(taskToEdit.startDate, 'dd-MM-yyyy'),
          startTime: format(taskToEdit.startDate, 'HH:mm'),
          endDate: format(taskToEdit.endDate, 'dd-MM-yyyy'),
          endTime: format(taskToEdit.endDate, 'HH:mm'),
          subtasks: taskToEdit.subtasks.map(st => ({
              title: st.title,
              description: st.description || '',
              startDate: st.startDate ? format(st.startDate, 'dd-MM-yyyy') : '',
              startTime: st.startDate ? format(st.startDate, 'HH:mm') : '',
              endDate: st.endDate ? format(st.endDate, 'dd-MM-yyyy') : '',
              endTime: st.endDate ? format(st.endDate, 'HH:mm') : '',
              attachments: st.attachments || [],
          })),
        });
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        const endDateDefault = addHours(now, 1);
        form.reset({
          title: '',
          description: '',
          startDate: `_-_-${currentYear}`,
          startTime: format(now, 'HH:mm'),
          endDate: `_-_-${currentYear}`,
          endTime: format(endDateDefault, 'HH:mm'),
          subtasks: [{ 
            title: "", 
            description: "", 
            startDate: format(now, 'dd-MM-yyyy'), 
            startTime: format(now, 'HH:mm'), 
            endDate: format(endDateDefault, 'dd-MM-yyyy'), 
            endTime: format(endDateDefault, 'HH:mm'), 
            attachments: [] 
          }],
        });
      }
    }
  }, [taskToEdit, form, isOpen]);


  function handleSubmit(data: TaskFormData) {
    const taskStartDate = parseDateTime(data.startDate, data.startTime);
    const taskEndDate = parseDateTime(data.endDate, data.endTime);

    if (!taskStartDate || !taskEndDate) return;


    const newSubtasks: Subtask[] = data.subtasks ? data.subtasks
      .filter(st => st.title && st.title.trim() !== '') // Only include subtasks with a title
      .map((st, index) => {
        const subtaskStartDate = parseDateTime(st.startDate, st.startTime);
        const subtaskEndDate = parseDateTime(st.endDate, st.endTime);
        return {
          id: taskToEdit?.subtasks[index]?.id || crypto.randomUUID(),
          title: st.title,
          description: st.description,
          completed: taskToEdit?.subtasks[index]?.completed || false,
          startDate: subtaskStartDate,
          endDate: subtaskEndDate,
          attachments: st.attachments,
        };
    }) : [];

    const task: Task = {
      id: taskToEdit?.id || crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: taskToEdit?.status || 'To Do',
      createdAt: taskToEdit?.createdAt || new Date(),
      startDate: taskStartDate,
      endDate: taskEndDate,
      subtasks: newSubtasks,
    };
    onSubmit(task);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any, index: number) => {
      const file = e.target.files?.[0];
      if (file) {
          const isImage = file.type.startsWith('image/');
          if (isImage) {
            const reader = new FileReader();
            reader.onload = (readEvent) => {
                const newAttachment = { name: file.name, url: readEvent.target?.result as string, type: 'image' as const };
                const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
                form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment]);
            };
            reader.readAsDataURL(file);
          } else {
            const newAttachment = { name: file.name, url: URL.createObjectURL(file), type: 'file' as const };
            const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
            form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment]);
          }
      }
  };

  const triggerValidationAndSwitchTab = async () => {
    const result = await form.trigger(["title", "startDate", "startTime", "endDate", "endTime", "description"]);
    if (result) {
        setActiveTab('subtasks');
    }
  };

  const subtasksFromForm = form.watch('subtasks');
  const uncompletedSubtasksCount = taskToEdit
    ? taskToEdit.subtasks.filter((st, index) => {
        const formSubtask = subtasksFromForm?.[index];
        // A subtask is uncompleted if it's not marked as completed AND it exists in the form with a title
        return !st.completed && formSubtask && formSubtask.title && formSubtask.title.trim() !== '';
      }).length
    : (subtasksFromForm || []).filter(st => st.title && st.title.trim() !== '').length;

  const getSubtaskBorderColor = (index: number) => {
    const subtask = form.watch(`subtasks.${index}`);
    const now = new Date();

    const isCompleted = taskToEdit?.subtasks[index]?.completed || false;
    if (isCompleted) return 'border-emerald-500';

    const startDate = parseDateTime(subtask.startDate, subtask.startTime);
    const endDate = parseDateTime(subtask.endDate, subtask.endTime);

    if (!startDate || !endDate) return 'border-muted';

    if (isAfter(now, startDate)) { // In Progress
        if (isBefore(endDate, now)) { // Overdue
            return 'border-destructive';
        }
        return 'border-amber-500'; // In Progress
    }

    if (isBefore(now, startDate)) { // Not started
        return 'border-sky-500';
    }
    
    return 'border-muted';
  };


  const isTaskTabInvalid = Object.keys(form.formState.errors).some(key =>
    ['title', 'startDate', 'startTime', 'endDate', 'endTime', 'root'].includes(key)
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.clearErrors();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Chỉnh sửa nhiệm vụ' : 'Thêm nhiệm vụ mới'}</DialogTitle>
          <DialogDescription>
            {taskToEdit ? 'Cập nhật chi tiết nhiệm vụ của bạn.' : 'Điền vào các chi tiết cho nhiệm vụ mới của bạn. Bạn có thể thêm các công việc để chia nhỏ nó ra.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 bg-primary/10 p-1">
              <TabsTrigger value="task" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nhiệm vụ</TabsTrigger>
              <TabsTrigger value="subtasks" disabled={isTaskTabInvalid} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Công việc</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-6 pr-6">
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
                          <div className="border p-3 rounded-md space-y-3">
                              <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field, fieldState }) => (
                                  <FormItem>
                                    <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                    <FormControl>
                                        <DateSegmentInput value={field.value} onChange={field.onChange} />
                                      </FormControl>
                                    <FormMessage className="h-4" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field, fieldState }) => (
                                  <FormItem>
                                    <FormLabel>Giờ</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} className="bg-primary/5" />
                                      </FormControl>
                                    <FormMessage className="h-4" />
                                  </FormItem>
                                )}
                              />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>Kết thúc</FormLabel>
                          <div className="border p-3 rounded-md space-y-3">
                              <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field, fieldState }) => (
                                  <FormItem>
                                    <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                    <FormControl>
                                      <DateSegmentInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage className="h-4" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="endTime"
                                render={({ field, fieldState }) => (
                                  <FormItem>
                                    <FormLabel>Giờ</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} className="bg-primary/5" />
                                      </FormControl>
                                    <FormMessage className="h-4" />
                                  </FormItem>
                                )}
                              />
                          </div>
                        </div>
                    </div>
                     {form.formState.errors.endDate && <FormMessage>{form.formState.errors.endDate.message}</FormMessage>}
                  </Form>
              </TabsContent>

              <TabsContent value="subtasks" className="mt-0 space-y-2">
                <Form {...form}>
                  <div className="px-1 pt-4 text-sm font-medium text-muted-foreground">
                    Danh sách công việc ({uncompletedSubtasksCount})
                  </div>
                  <div className="py-2 space-y-4">
                    <div className="space-y-2">
                        <Accordion type="multiple" className="w-full space-y-2">
                          {fields.map((field, index) => {
                              const subtaskAttachments = form.watch(`subtasks.${index}.attachments`) || [];
                              return (
                                <AccordionItem 
                                  value={`item-${index}`} 
                                  key={field.id} 
                                  className={cn(
                                    "bg-muted/30 rounded-md border border-l-4",
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
                                                placeholder={`Công việc ${index + 1}`} 
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
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <AccordionContent className="px-3 pb-3">
                                      <div className="space-y-4 p-4 rounded-md border bg-background">
                                        <FormField
                                          control={form.control}
                                          name={`subtasks.${index}.description`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <h4 className="text-xs font-medium text-muted-foreground">Mô tả (Tùy chọn)</h4>
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
                                            render={({ field: subtaskField }) => (
                                                <FormItem>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => subtaskAttachmentRefs.current[index]?.click()}>
                                                        <Paperclip className="mr-2 h-4 w-4" />
                                                        Đính kèm tệp
                                                    </Button>
                                                    <FormControl>
                                                        <Input
                                                            type="file"
                                                            className="hidden"
                                                            ref={(el) => { subtaskAttachmentRefs.current[index] = el; }}
                                                            onChange={(e) => handleFileChange(e, subtaskField, index)}
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
                                                                      form.setValue(`subtasks.${index}.attachments`, current.filter((_, i) => i !== attachmentIndex));
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                              <FormLabel>Bắt đầu</FormLabel>
                                              <div className="border p-3 rounded-md space-y-3">
                                                  <FormField
                                                    control={form.control}
                                                    name={`subtasks.${index}.startDate`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                                        <FormControl>
                                                          <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={form.control}
                                                    name={`subtasks.${index}.startTime`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Giờ</FormLabel>
                                                        <FormControl>
                                                          <Input type="time" {...field} className="w-full bg-primary/5" />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                              </div>
                                          </div>
                                          <div className="space-y-2">
                                            <FormLabel>Kết thúc</FormLabel>
                                            <div className="border p-3 rounded-md space-y-3">
                                                <FormField
                                                  control={form.control}
                                                  name={`subtasks.${index}.endDate`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                                      <FormControl>
                                                        <DateSegmentInput value={field.value ?? ''} onChange={field.onChange} />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`subtasks.${index}.endTime`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Giờ</FormLabel>
                                                      <FormControl>
                                                        <Input type="time" {...field} className="w-full bg-primary/5" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                            </div>
                                          </div>
                                        </div>
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
                            const now = new Date();
                            const endDateDefault = addHours(now, 1);
                            append({ 
                                title: "", 
                                description: "", 
                                startDate: format(now, 'dd-MM-yyyy'), 
                                startTime: format(now, 'HH:mm'), 
                                endDate: format(endDateDefault, 'dd-MM-yyyy'), 
                                endTime: format(endDateDefault, 'HH:mm'), 
                                attachments: [] 
                            })
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm Công việc
                      </Button>
                    </div>
                    {form.formState.errors.subtasks && <FormMessage>{form.formState.errors.subtasks.root?.message || form.formState.errors.subtasks.message}</FormMessage>}
                  </div>
                </Form>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <DialogFooter className="pt-4 mt-auto">
          {activeTab === 'task' ? (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="button" onClick={triggerValidationAndSwitchTab}>Tiếp tục</Button>
            </>
          ) : (
            <>
                <Button type="button" variant="outline" onClick={() => { setActiveTab('task'); }}>Quay lại</Button>
                <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={!form.formState.isValid}>{taskToEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
