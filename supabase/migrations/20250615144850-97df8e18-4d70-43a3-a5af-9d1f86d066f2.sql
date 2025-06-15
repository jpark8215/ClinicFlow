
-- Create a custom type for pre-authorization status
CREATE TYPE public.preauth_status AS ENUM ('Pending', 'Approved', 'Denied', 'Submitted');

-- Create the pre_authorizations table
CREATE TABLE public.pre_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  service TEXT NOT NULL,
  payer TEXT NOT NULL,
  status public.preauth_status NOT NULL DEFAULT 'Pending',
  notes TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comment on table and columns for clarity
COMMENT ON TABLE public.pre_authorizations IS 'Stores prior authorization requests and their statuses.';
COMMENT ON COLUMN public.pre_authorizations.patient_name IS 'The name of the patient requiring preauthorization.';
COMMENT ON COLUMN public.pre_authorizations.service IS 'The medical service or procedure requiring authorization.';
COMMENT ON COLUMN public.pre_authorizations.payer IS 'The insurance company or payer.';
COMMENT ON COLUMN public.pre_authorizations.status IS 'The current status of the preauthorization request.';

-- Enable Row Level Security
ALTER TABLE public.pre_authorizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pre-authorizations"
  ON public.pre_authorizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pre-authorizations"
  ON public.pre_authorizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pre-authorizations"
  ON public.pre_authorizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pre-authorizations"
  ON public.pre_authorizations FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update `updated_at` timestamp on changes
CREATE OR REPLACE FUNCTION public.handle_pre_auth_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on row update
CREATE TRIGGER on_pre_auth_update
  BEFORE UPDATE ON public.pre_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pre_auth_update();
