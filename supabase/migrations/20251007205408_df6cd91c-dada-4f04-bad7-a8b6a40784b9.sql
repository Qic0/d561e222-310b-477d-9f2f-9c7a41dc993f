-- Add penalty_percentage column to users table
ALTER TABLE public.users 
ADD COLUMN penalty_percentage numeric DEFAULT 10 NOT NULL;

-- Update penalty percentage for dispatchers to 200%
UPDATE public.users 
SET penalty_percentage = 200 
WHERE role = 'dispatcher';

-- Update penalty percentage for all other roles to 10%
UPDATE public.users 
SET penalty_percentage = 10 
WHERE role != 'dispatcher';

-- Add comment to explain the column
COMMENT ON COLUMN public.users.penalty_percentage IS 'Процент штрафа для сотрудника при ошибках (10% для работников, 200% для диспетчеров)';