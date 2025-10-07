-- 1. Создать функцию для обновления completed_tasks с штрафами
CREATE OR REPLACE FUNCTION public.update_completed_task_penalty(
  p_user_id uuid,
  p_task_id numeric,
  p_penalty_multiplier numeric DEFAULT 2
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_completed_tasks jsonb[];
  v_task_index integer;
  v_task jsonb;
  v_payment numeric;
  v_penalty_amount numeric;
  v_current_salary numeric;
BEGIN
  -- Получить completed_tasks и salary пользователя
  SELECT completed_tasks, salary
  INTO v_completed_tasks, v_current_salary
  FROM public.users
  WHERE uuid_user = p_user_id;

  -- Проверить существование пользователя
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Инициализировать массив если null
  IF v_completed_tasks IS NULL THEN
    v_completed_tasks := ARRAY[]::jsonb[];
  END IF;

  -- Найти задачу в массиве completed_tasks
  FOR v_task_index IN 1..array_length(v_completed_tasks, 1) LOOP
    v_task := v_completed_tasks[v_task_index];
    
    IF (v_task->>'task_id')::numeric = p_task_id THEN
      -- Если has_penalty уже true, выйти
      IF (v_task->>'has_penalty')::boolean = true THEN
        RETURN;
      END IF;
      
      -- Обновить has_penalty на true
      v_completed_tasks[v_task_index] := jsonb_set(v_task, '{has_penalty}', 'true'::jsonb);
      
      -- Вычислить штраф (payment * multiplier)
      v_payment := (v_task->>'payment')::numeric;
      v_penalty_amount := v_payment * p_penalty_multiplier;
      
      -- Обновить salary (вычесть штраф)
      UPDATE public.users
      SET 
        completed_tasks = v_completed_tasks,
        salary = v_current_salary - v_penalty_amount,
        updated_at = now()
      WHERE uuid_user = p_user_id;
      
      RETURN;
    END IF;
  END LOOP;

  -- Если задача не найдена, выбросить ошибку
  RAISE EXCEPTION 'Task % not found in completed_tasks for user %', p_task_id, p_user_id;
END;
$$;

-- 2. Создать функцию для добавления completed_task для диспетчера
CREATE OR REPLACE FUNCTION public.add_dispatcher_completed_task(
  p_dispatcher_id uuid,
  p_task_id numeric,
  p_payment numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_salary numeric;
  v_completed_tasks jsonb[];
  v_task_exists boolean;
BEGIN
  -- Получить текущие данные диспетчера
  SELECT salary, completed_tasks
  INTO v_current_salary, v_completed_tasks
  FROM public.users
  WHERE uuid_user = p_dispatcher_id;

  -- Проверить существование диспетчера
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispatcher not found';
  END IF;

  -- Инициализировать completed_tasks если null
  IF v_completed_tasks IS NULL THEN
    v_completed_tasks := ARRAY[]::jsonb[];
  END IF;

  -- Проверить, есть ли уже эта задача в completed_tasks
  SELECT EXISTS (
    SELECT 1 
    FROM unnest(v_completed_tasks) AS task
    WHERE task->>'task_id' = p_task_id::text
  ) INTO v_task_exists;

  -- Только обновить если задачи нет
  IF NOT v_task_exists THEN
    -- Добавить новую completed task
    v_completed_tasks := array_append(
      v_completed_tasks,
      jsonb_build_object(
        'task_id', p_task_id,
        'payment', p_payment,
        'has_penalty', false
      )
    );

    -- Обновить диспетчера
    UPDATE public.users
    SET 
      salary = COALESCE(v_current_salary, 0) + p_payment,
      completed_tasks = v_completed_tasks,
      updated_at = now()
    WHERE uuid_user = p_dispatcher_id;
  END IF;
END;
$$;

-- 3. Удалить таблицу admin_penalty_log
DROP TABLE IF EXISTS public.admin_penalty_log CASCADE;