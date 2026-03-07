-- Pipeline clients table (internal CRM, not per-client)
CREATE TABLE public.pipeline_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  company     TEXT NOT NULL DEFAULT '',
  phase       TEXT NOT NULL DEFAULT 'lead',
  value       TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (internal team tool)
CREATE POLICY "Authenticated users can view pipeline"
ON public.pipeline_clients FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert pipeline clients"
ON public.pipeline_clients FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update pipeline clients"
ON public.pipeline_clients FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete pipeline clients"
ON public.pipeline_clients FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));
