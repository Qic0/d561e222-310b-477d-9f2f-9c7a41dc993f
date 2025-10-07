-- Add DELETE policy for admin_penalty_log table
CREATE POLICY "Admins can delete penalty log entries"
ON public.admin_penalty_log
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.uuid_user = auth.uid()
    AND users.role = 'admin'
  )
);