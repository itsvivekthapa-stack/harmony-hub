-- Add pending_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pending_admin';
