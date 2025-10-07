import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, FileText, Tag, CheckCircle, Clock, Building, Banknote, Camera, Timer, AlertTriangle, Trash2, XCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isValid } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

// Component to display dispatcher info
const DispatcherInfo = ({ dispatcherId, dispatcherPercentage }: { dispatcherId: string, dispatcherPercentage?: number }) => {
  const { data: dispatcher } = useQuery({
    queryKey: ['dispatcher', dispatcherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('uuid_user', dispatcherId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!dispatcherId
  });

  return (
    <div className="flex items-start sm:items-center space-x-3">
      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground">Проверяет диспетчер</p>
        <p className="font-semibold text-sm sm:text-base break-words">
          {dispatcher?.full_name || '—'}
          {dispatcherPercentage && <span className="text-xs sm:text-sm text-muted-foreground ml-2">({dispatcherPercentage}%)</span>}
        </p>
      </div>
    </div>
  );
};
interface Task {
  id_zadachi: number;
  uuid_zadachi: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  execution_time_seconds?: number;
  responsible_user_name?: string;
  responsible_user_id?: string;
  order_title?: string;
  zakaz_id?: number;
  salary?: number;
  checklist_photo?: string;
  is_locked?: boolean;
  dispatcher_id?: string;
  dispatcher_percentage?: number;
  dispatcher_reward_amount?: number;
  dispatcher_reward_applied?: boolean;
  review_returns?: any;
  original_deadline?: string;
  penalty_applied?: boolean;
}
interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}
const getPriorityColor = (priority: string) => {
  const colors = {
    low: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    high: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
};
const getPriorityText = (priority: string) => {
  const texts = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };
  return texts[priority as keyof typeof texts] || priority;
};
const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-warning text-warning-foreground',
    in_progress: 'bg-status-progress text-white',
    completed: 'bg-status-done text-white',
    under_review: 'bg-warning/70 text-warning-foreground'
  };
  return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
};
const getStatusText = (status: string) => {
  const texts = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Выполнено',
    under_review: 'На проверке'
  };
  return texts[status as keyof typeof texts] || status;
};
const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

const formatRemainingTime = (task: Task) => {
  // Для завершенных задач показываем время выполнения
  if (task.status === 'completed' && task.execution_time_seconds) {
    const hours = Math.floor(task.execution_time_seconds / 3600);
    const minutes = Math.floor((task.execution_time_seconds % 3600) / 60);
    
    if (hours > 0) {
      return `Выполнено за ${hours}ч ${minutes}м`;
    } else {
      return `Выполнено за ${minutes}м`;
    }
  }
  
  // Для незавершенных задач показываем оставшееся время
  if (!task.created_at || !task.due_date) return '—';
  
  try {
    const createdDate = new Date(task.created_at);
    const dueDate = new Date(task.due_date);
    
    if (!isValid(createdDate) || !isValid(dueDate)) return '—';
    
    const totalMs = dueDate.getTime() - createdDate.getTime();
    const currentMs = Date.now() - createdDate.getTime();
    const remainingMs = totalMs - currentMs;
    
    if (remainingMs <= 0) {
      const overdueMs = Math.abs(remainingMs);
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
      const overdueMinutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let overdueText = '';
      if (overdueHours > 0) {
        overdueText = `${overdueHours}ч ${overdueMinutes}м`;
      } else {
        overdueText = `${overdueMinutes}м`;
      }
      
      return `Просрочено на ${overdueText}`;
    }
    
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${remainingHours}ч ${remainingMinutes}м`;
  } catch {
    return '—';
  }
};
const TaskDetailsDialog = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}: TaskDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPenalizing, setIsPenalizing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  if (!task) return null;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File, taskId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}-${Date.now()}.${fileExt}`;
      const filePath = `task-completion/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };
  
  const handleCompleteTask = async () => {
    if (!photo) {
      toast({
        title: "Требуется фото",
        description: "Необходимо прикрепить фото выполненной работы",
        variant: "destructive",
      });
      setShowPhotoUpload(true);
      return;
    }

    setIsCompleting(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Completing task:', task.id_zadachi, 'responsible_user_id:', task.responsible_user_id, 'salary:', task.salary);
      }

      // Upload photo
      const photoUrl = await uploadPhoto(photo, task.uuid_zadachi);
      
      if (!photoUrl) {
        throw new Error('Failed to upload photo');
      }
      
      // Prepare update data
      const updateData: any = {
        status: 'under_review',
        is_locked: true,
        checklist_photo: photoUrl
      };

      // Save original_deadline if not set yet (for penalty calculation)
      if (!task.original_deadline && task.due_date) {
        updateData.original_deadline = task.due_date;
      }

      // Get dispatcher info from automation_settings if not already assigned
      if (!task.dispatcher_id && task.zakaz_id) {
        // Get order status to find the right automation setting
        const { data: orderData, error: orderError } = await supabase
          .from('zakazi')
          .select('status')
          .eq('id_zakaza', task.zakaz_id)
          .single();

        if (!orderError && orderData) {
          // Get automation settings for this stage
          const { data: settingsData, error: settingsError } = await supabase
            .from('automation_settings')
            .select('dispatcher_id, dispatcher_percentage')
            .eq('stage_id', orderData.status)
            .single();

          if (!settingsError && settingsData) {
            updateData.dispatcher_id = settingsData.dispatcher_id;
            updateData.dispatcher_percentage = settingsData.dispatcher_percentage;
          }
        }
      }

      // Update task to under_review status
      const { error: taskError } = await supabase
        .from('zadachi')
        .update(updateData)
        .eq('id_zadachi', task.id_zadachi);

      if (taskError) throw taskError;

      // Salary will be paid after dispatcher approval, not here
      
      toast({
        title: "Задача отправлена на проверку",
        description: "Задача отправлена диспетчеру на проверку. Зарплата будет начислена после подтверждения."
      });
      
      setPhoto(null);
      setPhotoPreview(null);
      setShowPhotoUpload(false);
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось завершить задачу. Попробуйте еще раз."
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Если задача была завершена, вернуть зарплату пользователю
      if (task.status === 'completed' && task.responsible_user_id && task.salary && task.salary > 0) {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('salary, completed_tasks')
          .eq('uuid_user', task.responsible_user_id)
          .single();

        if (!userFetchError && userData) {
          const currentSalary = userData?.salary || 0;
          const newSalary = Math.max(0, currentSalary - task.salary);
          
          // Удалить задачу из completed_tasks
          const currentCompletedTasks = (userData as any)?.completed_tasks || [];
          const updatedCompletedTasks = currentCompletedTasks.filter(
            (t: any) => t.task_id !== task.id_zadachi
          );

          await supabase
            .from('users')
            .update({ 
              salary: newSalary,
              completed_tasks: updatedCompletedTasks
            } as any)
            .eq('uuid_user', task.responsible_user_id);
        }
      }

      // 1b. Если был применён штраф диспетчера, вернуть штраф обратно
      if (task.penalty_applied && task.dispatcher_id && task.dispatcher_reward_amount) {
        const { data: dispatcherData, error: dispatcherFetchError } = await supabase
          .from('users')
          .select('salary')
          .eq('uuid_user', task.dispatcher_id)
          .single();

        if (!dispatcherFetchError && dispatcherData) {
          const penaltyAmount = task.dispatcher_reward_amount * 2;
          const currentSalary = dispatcherData?.salary || 0;
          const newSalary = currentSalary + penaltyAmount;

          await supabase
            .from('users')
            .update({ salary: newSalary })
            .eq('uuid_user', task.dispatcher_id);
        }
      }

      // 2. Удалить задачу из массива vse_zadachi в заказе
      if (task.zakaz_id) {
        const { data: zakazData, error: zakazFetchError } = await supabase
          .from('zakazi')
          .select('vse_zadachi')
          .eq('id_zakaza', task.zakaz_id)
          .single();

        if (!zakazFetchError && zakazData) {
          const currentTasks = zakazData?.vse_zadachi || [];
          const updatedTasks = currentTasks.filter((id: number) => id !== task.id_zadachi);

          await supabase
            .from('zakazi')
            .update({ vse_zadachi: updatedTasks })
            .eq('id_zakaza', task.zakaz_id);
        }
      }

      // 2b. Отменить штраф диспетчера, если он был применен
      if (task.penalty_applied && task.dispatcher_id && task.dispatcher_reward_amount) {
        // Найти запись в completed_tasks и обновить has_penalty на false
        const { data: dispatcherData } = await supabase
          .from('users')
          .select('completed_tasks, salary')
          .eq('uuid_user', task.dispatcher_id)
          .single();

        if (dispatcherData) {
          const completedTasks = (dispatcherData.completed_tasks || []) as any[];
          const taskIndex = completedTasks.findIndex((t: any) => t.task_id === task.id_zadachi);
          
          if (taskIndex !== -1 && completedTasks[taskIndex].has_penalty) {
            // Вернуть штраф (payment * 2)
            const penaltyAmount = completedTasks[taskIndex].payment * 2;
            const newSalary = (dispatcherData.salary || 0) + penaltyAmount;
            
            // Обновить has_penalty обратно на false
            completedTasks[taskIndex].has_penalty = false;
            
            await supabase
              .from('users')
              .update({ 
                salary: newSalary,
                completed_tasks: completedTasks
              } as any)
              .eq('uuid_user', task.dispatcher_id);
          }
        }
      }

      // 3. Удалить саму задачу
      const { error: deleteError } = await supabase
        .from('zadachi')
        .delete()
        .eq('id_zadachi', task.id_zadachi);

      if (deleteError) throw deleteError;

      toast({
        title: "Задача удалена",
        description: "Задача успешно удалена из системы."
      });

      // Инвалидировать все связанные запросы
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['zadachi'] });
      queryClient.invalidateQueries({ queryKey: ['zakazi'] });
      queryClient.invalidateQueries({ queryKey: ['zakazi-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['orderTasks'] });
      
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить задачу. Попробуйте еще раз."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDispatcherPenalty = async () => {
    if (!task.dispatcher_reward_applied || !task.dispatcher_reward_amount) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Невозможно применить штраф. Начисление диспетчеру не производилось."
      });
      return;
    }

    if (task.penalty_applied) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Штраф уже был применён для этой задачи."
      });
      return;
    }

    if (!confirm(`Вы уверены, что хотите оштрафовать диспетчера на ${(task.dispatcher_reward_amount * 2).toFixed(2)} ₽?`)) {
      return;
    }

    setIsPenalizing(true);
    try {
      // Обновить completed_tasks диспетчера с has_penalty = true и вычесть штраф из salary
      const { error: penaltyError } = await supabase.rpc('update_completed_task_penalty', {
        p_user_id: task.dispatcher_id,
        p_task_id: task.id_zadachi,
        p_penalty_multiplier: 2
      });

      if (penaltyError) throw penaltyError;

      // Обновить задачу
      const { error: taskError } = await supabase
        .from('zadachi')
        .update({ penalty_applied: true })
        .eq('id_zadachi', task.id_zadachi);

      if (taskError) throw taskError;

      const penaltyAmount = task.dispatcher_reward_amount * 2;

      toast({
        title: "Штраф применён",
        description: `Диспетчер оштрафован на ${penaltyAmount.toFixed(2)} ₽`
      });

      queryClient.invalidateQueries({ queryKey: ['zadachi'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error applying penalty:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось применить штраф"
      });
    } finally {
      setIsPenalizing(false);
    }
  };

  const isCompleted = task.status === 'completed' || task.completed_at;
  const isUnderReview = task.status === 'under_review';
  const reviewReturns = Array.isArray(task.review_returns) ? task.review_returns : [];
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl sm:text-2xl tracking-tight pr-8">
            {task.title}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={`${getPriorityColor(task.priority)} font-display font-bold text-xs sm:text-sm`}>
              {getPriorityText(task.priority)} приоритет
            </Badge>
            <Badge variant="secondary" className={`${getStatusColor(task.status)} font-medium text-xs sm:text-sm`}>
              {getStatusText(task.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6 flex-1 overflow-y-auto">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display font-bold text-base sm:text-lg">Информация о задаче</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {task.order_title && <div className="flex items-start sm:items-center space-x-3">
                    <Building className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Заказ</p>
                      <p className="font-semibold text-sm sm:text-base break-words">{task.order_title}</p>
                    </div>
                  </div>}

                <div className="flex items-start sm:items-center space-x-3">
                  <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Зарплата</p>
                    {task.salary ? (
                      task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date() ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-sm sm:text-base text-muted-foreground line-through">{task.salary} ₽</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">Штраф 10%</Badge>
                            <p className="font-semibold text-sm sm:text-base text-destructive">{Math.round(task.salary * 0.9)} ₽</p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-semibold text-sm sm:text-base">{task.salary} ₽</p>
                      )
                    ) : (
                      <p className="font-semibold text-sm sm:text-base">—</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start sm:items-center space-x-3">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Ответственный</p>
                    <p className="font-semibold text-sm sm:text-base break-words">{task.responsible_user_name || '—'}</p>
                  </div>
                </div>

                {/* Dispatcher info - shown for admin and when task is under review or completed */}
                {(isAdmin || isUnderReview || isCompleted) && task.dispatcher_id && (
                  <DispatcherInfo dispatcherId={task.dispatcher_id} dispatcherPercentage={task.dispatcher_percentage} />
                )}

                <div className="flex items-start sm:items-center space-x-3">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Срок выполнения</p>
                    <p className="font-semibold text-sm sm:text-base">{formatDate(task.due_date)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {task.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    task.due_date && new Date(task.due_date) < new Date() ? (
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                    )
                  )}
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {task.status === 'completed' ? 'Время выполнения' : 'Осталось времени'}
                    </p>
                    <p className={`font-semibold text-sm sm:text-base ${
                      task.status === 'completed' 
                        ? 'text-green-600' 
                        : task.due_date && new Date(task.due_date) < new Date() 
                          ? 'text-destructive' 
                          : 'text-muted-foreground'
                    }`}>
                      {formatRemainingTime(task)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start sm:items-center space-x-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Создана</p>
                    <p className="font-semibold text-sm sm:text-base">{formatDate(task.created_at)}</p>
                  </div>
                </div>

                {task.completed_at && <div className="flex items-start sm:items-center space-x-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Завершена</p>
                      <p className="font-semibold text-sm sm:text-base text-green-600">{formatDate(task.completed_at)}</p>
                    </div>
                  </div>}
              </div>

              {task.description && <div className="pt-3 sm:pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Описание</p>
                      <p className="text-xs sm:text-sm leading-relaxed mt-1 break-words">{task.description}</p>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Completion Photo */}
          {task.checklist_photo && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                  Фото выполненной работы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={task.checklist_photo}
                  alt="Фото выполненной работы"
                  className="w-full max-w-md h-48 sm:h-64 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(task.checklist_photo, '_blank')}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Нажмите для увеличения
                </p>
              </CardContent>
            </Card>
          )}

          {/* История возвратов на доработку */}
          {reviewReturns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                  История возвратов на доработку
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewReturns.map((returnItem: any) => (
                  <div key={returnItem.return_number} className="border-l-4 border-warning pl-3 sm:pl-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                      <span className="font-semibold text-sm sm:text-base">Возврат #{returnItem.return_number}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(returnItem.returned_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm break-words">{returnItem.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Сообщение о проверке */}
          {isUnderReview && (
            <Card className="bg-warning/10 border-warning">
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-start sm:items-center gap-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-warning-foreground text-sm sm:text-base break-words">Задача на проверке у диспетчера</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Зарплата будет начислена после подтверждения диспетчером
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Действия */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-6 mt-6 border-t bg-background">
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteTask}
                disabled={isDeleting}
                className="text-xs sm:text-sm"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {isDeleting ? "Удаление..." : "Удалить"}
              </Button>
            )}
            
            {/* Кнопка штрафа диспетчера (только для админов и завершенных задач) */}
            {isAdmin && isCompleted && task.dispatcher_reward_applied && !task.penalty_applied && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDispatcherPenalty}
                disabled={isPenalizing}
                className="text-xs sm:text-sm"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {isPenalizing ? "Применение..." : "Ошибка диспетчера"}
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full">
            {!isCompleted && !isUnderReview && (
              <div className="w-full space-y-3 order-first">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    <span>Фото выполненной работы *</span>
                  </div>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  
                  {photoPreview && (
                    <div className="mt-3">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button variant="outline" onClick={onClose} size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">
                Закрыть
              </Button>
              {!isCompleted && !isUnderReview && (
                <Button 
                  onClick={handleCompleteTask}
                  disabled={isCompleting || !photo}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isCompleting ? "Отправка..." : "Отправить на проверку"}
                </Button>
              )}
            </div>
          </div>
        </div>
        
      </DialogContent>
    </Dialog>;
};
export default TaskDetailsDialog;