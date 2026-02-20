
-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_users table (links users to clients)
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Create metrics table
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers_count INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER NOT NULL DEFAULT 0,
  follower_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Secure definer function to check if a user belongs to a client
CREATE OR REPLACE FUNCTION public.user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_users WHERE user_id = _user_id LIMIT 1;
$$;

-- Secure definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.user_is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) FROM public.client_users WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS policies for clients
CREATE POLICY "Users can view their own client"
ON public.clients FOR SELECT
TO authenticated
USING (
  id = public.user_client_id(auth.uid())
  OR public.user_is_admin(auth.uid())
);

-- RLS policies for client_users
CREATE POLICY "Users can view their own client_users record"
ON public.client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.user_is_admin(auth.uid()));

-- RLS policies for metrics
CREATE POLICY "Users can view metrics for their client"
ON public.metrics FOR SELECT
TO authenticated
USING (
  client_id = public.user_client_id(auth.uid())
  OR public.user_is_admin(auth.uid())
);

-- Admin insert/update/delete on metrics
CREATE POLICY "Admins can insert metrics"
ON public.metrics FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update metrics"
ON public.metrics FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete metrics"
ON public.metrics FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Admin can manage clients
CREATE POLICY "Admins can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Admin can manage client_users
CREATE POLICY "Admins can insert client_users"
ON public.client_users FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update client_users"
ON public.client_users FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()));
