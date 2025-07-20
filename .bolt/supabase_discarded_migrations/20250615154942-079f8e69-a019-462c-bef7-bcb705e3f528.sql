
-- Create a custom type for eligibility status
CREATE TYPE public.eligibility_status AS ENUM ('Eligible', 'Ineligible', 'Pending', 'Error');

-- Create the insurance_eligibility table
CREATE TABLE public.insurance_eligibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  status public.eligibility_status NOT NULL DEFAULT 'Pending',
  verification_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comment on table and columns for clarity
COMMENT ON TABLE public.insurance_eligibility IS 'Stores insurance eligibility verification records for patients.';
COMMENT ON COLUMN public.insurance_eligibility.status IS 'The status of the eligibility check.';
COMMENT ON COLUMN public.insurance_eligibility.verification_date IS 'The timestamp when the eligibility was last verified.';

-- Enable Row Level Security
ALTER TABLE public.insurance_eligibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own eligibility records"
  ON public.insurance_eligibility FOR ALL
  USING (auth.uid() = user_id);

-- Function to update `updated_at` timestamp on changes
CREATE OR REPLACE FUNCTION public.handle_eligibility_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on row update
CREATE TRIGGER on_eligibility_update
  BEFORE UPDATE ON public.insurance_eligibility
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_eligibility_update();
