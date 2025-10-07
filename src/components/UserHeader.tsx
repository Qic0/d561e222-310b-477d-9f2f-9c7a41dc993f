import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { WorkerDetailsDialog } from '@/components/WorkerDetailsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const UserHeader = () => {
  const { user, signOut, isAdmin } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isMobile = useIsMobile();

  // Загружаем полные данные пользователя из таблицы users
  const { data: fullUserData } = useQuery({
    queryKey: ['user-full-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uuid_user', user.id)
        .single();
      
      if (error) throw error;
      
      // Обогащаем completed_tasks деталями о задачах
      let enrichedCompletedTasks = [];
      if (data.completed_tasks && data.completed_tasks.length > 0) {
        const taskIds = data.completed_tasks.map((task: any) => task.task_id);
        
        const { data: tasks, error: tasksError } = await supabase
          .from('zadachi')
          .select(`
            id_zadachi,
            title,
            completed_at,
            execution_time_seconds,
            zakaz_id,
            zakazi!inner(title)
          `)
          .in('id_zadachi', taskIds);

        if (!tasksError && tasks) {
          enrichedCompletedTasks = data.completed_tasks.map((completedTask: any) => {
            const taskDetails = tasks?.find(task => task.id_zadachi === completedTask.task_id);
            return {
              ...completedTask,
              task_title: taskDetails?.title,
              order_title: taskDetails?.zakazi?.title,
              completed_date: taskDetails?.completed_at,
              execution_time_seconds: taskDetails?.execution_time_seconds,
              is_review: data.role === 'dispatcher'
            };
          });
        }
      }
      
      return {
        ...data,
        completed_tasks: enrichedCompletedTasks
      };
    },
    enabled: !!user?.id && isProfileDialogOpen,
  });

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {isMobile ? (
        // Мобильная версия: имя + аватар
        <>
          <span className={`text-sm font-medium transition-colors duration-300 ${isHomePage ? "text-white" : "text-foreground"}`}>
            {user.full_name?.split(' ')[0] || 'Пользователь'}
          </span>
        </>
      ) : (
        // Десктопная версия: роль
        <span className={`text-sm transition-colors duration-300 ${isHomePage ? "text-white" : "text-muted-foreground"}`}>
          {isAdmin ? 'Администратор' : 'Сотрудник'}
        </span>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.full_name || ''} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">
              {user.full_name || user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto p-2"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              <User className="mr-2 h-4 w-4" />
              Профиль
            </Button>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto p-2" 
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <WorkerDetailsDialog 
        worker={fullUserData || {
          uuid_user: user.id,
          full_name: user.full_name || user.email || 'Пользователь',
          email: user.email || '',
          phone: undefined,
          role: user.role || 'worker',
          salary: 0,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at || new Date().toISOString(),
          last_seen: undefined,
          current_task: undefined,
          completed_tasks: [],
          penalty_percentage: undefined
        }}
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
};

export default UserHeader;