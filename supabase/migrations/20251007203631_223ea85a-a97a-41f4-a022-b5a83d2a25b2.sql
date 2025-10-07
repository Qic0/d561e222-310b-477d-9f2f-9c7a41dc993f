-- Функция для удаления задачи из completed_tasks всех пользователей
CREATE OR REPLACE FUNCTION public.remove_task_from_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Удаляем задачу из completed_tasks всех пользователей
  UPDATE public.users
  SET completed_tasks = (
    SELECT array_agg(task)
    FROM unnest(completed_tasks) AS task
    WHERE (task->>'task_id')::numeric != OLD.id_zadachi
  ),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM unnest(completed_tasks) AS task
    WHERE (task->>'task_id')::numeric = OLD.id_zadachi
  );
  
  RETURN OLD;
END;
$function$;

-- Создаем триггер на удаление задачи
DROP TRIGGER IF EXISTS trigger_remove_task_from_completed ON public.zadachi;
CREATE TRIGGER trigger_remove_task_from_completed
AFTER DELETE ON public.zadachi
FOR EACH ROW
EXECUTE FUNCTION public.remove_task_from_completed();