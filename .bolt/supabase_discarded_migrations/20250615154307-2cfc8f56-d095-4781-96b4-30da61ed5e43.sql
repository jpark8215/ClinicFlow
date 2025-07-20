
-- Create patients table to store patient information centrally
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.patients IS 'Stores patient records for the clinic.';
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own patients" ON public.patients FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_patient_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_patient_update
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_patient_update();

-- Create appointments table for scheduling
CREATE TYPE public.appointment_status AS ENUM ('Confirmed', 'Pending', 'Cancelled', 'Completed', 'No-Show');
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'Pending',
  no_show_risk REAL,
  notes TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.appointments IS 'Stores patient appointments and their statuses.';
COMMENT ON COLUMN public.appointments.no_show_risk IS 'Predicted probability of a no-show, between 0 and 1.';
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own appointments" ON public.appointments FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_appointment_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_update();


-- Create intake_tasks table for intake documentation automation
CREATE TYPE public.intake_status AS ENUM ('Pending OCR', 'Needs Validation', 'Complete');
CREATE TABLE public.intake_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  status public.intake_status NOT NULL DEFAULT 'Needs Validation',
  document_url TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.intake_tasks IS 'Stores intake automation tasks for patients.';
COMMENT ON COLUMN public.intake_tasks.document_url IS 'A URL to the associated document, if any.';
ALTER TABLE public.intake_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own intake tasks" ON public.intake_tasks FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_intake_task_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_intake_task_update
  BEFORE UPDATE ON public.intake_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_intake_task_update();
