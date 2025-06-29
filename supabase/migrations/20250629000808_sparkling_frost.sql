/*
  # Enhanced Healthcare Management Schema

  1. New Tables
    - `providers` - Healthcare providers and doctors
    - `patient_insurance` - Patient insurance information
    - `appointments_providers` - Many-to-many relationship for appointments and providers
    - `audit_logs` - System audit trail
    - `notifications` - User notification system
    - `document_templates` - Reusable document templates
    - `patient_documents` - Patient-specific documents

  2. Enhanced Existing Tables
    - Added demographics to patients (DOB, phone, email, address, emergency contacts)
    - Added duration, type, and reminder tracking to appointments
    - Added authorization numbers, expiration dates, and amounts to pre-authorizations

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data isolation
    - Create audit logging functions

  4. Performance
    - Add strategic indexes on frequently queried columns
    - Create views for common queries
*/

-- Create providers table for healthcare providers
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  specialty TEXT,
  license_number TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.providers IS 'Healthcare providers and doctors in the system';
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own providers"
  ON public.providers FOR ALL
  USING (auth.uid() = user_id);

-- Create patient insurance information table
CREATE TABLE IF NOT EXISTS public.patient_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  insurance_company TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  subscriber_name TEXT,
  relationship_to_subscriber TEXT DEFAULT 'Self',
  effective_date DATE,
  expiration_date DATE,
  copay_amount DECIMAL(10,2),
  deductible_amount DECIMAL(10,2),
  is_primary BOOLEAN DEFAULT true,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.patient_insurance IS 'Patient insurance information and coverage details';
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their patients insurance"
  ON public.patient_insurance FOR ALL
  USING (auth.uid() = user_id);

-- Create appointments_providers junction table
CREATE TABLE IF NOT EXISTS public.appointments_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Primary', -- Primary, Consulting, Assisting
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.appointments_providers IS 'Many-to-many relationship between appointments and providers';
ALTER TABLE public.appointments_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their appointment providers"
  ON public.appointments_providers FOR ALL
  USING (auth.uid() = user_id);

-- Create audit logs table for system tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'System audit trail for all data changes';
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create notification enums if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('appointment_reminder', 'preauth_update', 'eligibility_check', 'document_required', 'system_alert');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE public.notification_status AS ENUM ('unread', 'read', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.notification_status DEFAULT 'unread',
  related_table TEXT,
  related_id UUID,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

COMMENT ON TABLE public.notifications IS 'User notifications and alerts system';
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- Create document templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  category TEXT, -- intake, consent, referral, etc.
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.document_templates IS 'Reusable document templates for various purposes';
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own document templates"
  ON public.document_templates FOR ALL
  USING (auth.uid() = user_id);

-- Create patient documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_content TEXT,
  document_url TEXT,
  document_type TEXT, -- pdf, image, text, etc.
  file_size INTEGER,
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.patient_documents IS 'Patient-specific documents and forms';
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their patients documents"
  ON public.patient_documents FOR ALL
  USING (auth.uid() = user_id);

-- Add additional fields to existing tables
DO $$
BEGIN
  -- Add fields to patients table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN date_of_birth DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'emergency_contact_name'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN emergency_contact_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'emergency_contact_phone'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN emergency_contact_phone TEXT;
  END IF;

  -- Add fields to appointments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_type TEXT DEFAULT 'consultation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
  END IF;

  -- Add fields to pre_authorizations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_authorizations' AND column_name = 'authorization_number'
  ) THEN
    ALTER TABLE public.pre_authorizations ADD COLUMN authorization_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_authorizations' AND column_name = 'expiration_date'
  ) THEN
    ALTER TABLE public.pre_authorizations ADD COLUMN expiration_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_authorizations' AND column_name = 'requested_amount'
  ) THEN
    ALTER TABLE public.pre_authorizations ADD COLUMN requested_amount DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_authorizations' AND column_name = 'approved_amount'
  ) THEN
    ALTER TABLE public.pre_authorizations ADD COLUMN approved_amount DECIMAL(10,2);
  END IF;
END $$;

-- Create update trigger functions for new tables
CREATE OR REPLACE FUNCTION public.handle_provider_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_patient_insurance_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_document_template_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_patient_document_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_provider_update') THEN
    CREATE TRIGGER on_provider_update
      BEFORE UPDATE ON public.providers
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_provider_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_patient_insurance_update') THEN
    CREATE TRIGGER on_patient_insurance_update
      BEFORE UPDATE ON public.patient_insurance
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_patient_insurance_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_document_template_update') THEN
    CREATE TRIGGER on_document_template_update
      BEFORE UPDATE ON public.document_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_document_template_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_patient_document_update') THEN
    CREATE TRIGGER on_patient_document_update
      BEFORE UPDATE ON public.patient_documents
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_patient_document_update();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_time ON public.appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

CREATE INDEX IF NOT EXISTS idx_pre_authorizations_patient_name ON public.pre_authorizations(patient_name);
CREATE INDEX IF NOT EXISTS idx_pre_authorizations_status ON public.pre_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_pre_authorizations_user_id ON public.pre_authorizations(user_id);

CREATE INDEX IF NOT EXISTS idx_intake_tasks_patient_id ON public.intake_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_intake_tasks_status ON public.intake_tasks(status);
CREATE INDEX IF NOT EXISTS idx_intake_tasks_user_id ON public.intake_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_insurance_eligibility_patient_id ON public.insurance_eligibility(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_eligibility_status ON public.insurance_eligibility(status);
CREATE INDEX IF NOT EXISTS idx_insurance_eligibility_user_id ON public.insurance_eligibility(user_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON public.patients(full_name);

CREATE INDEX IF NOT EXISTS idx_providers_user_id ON public.providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_specialty ON public.providers(specialty);

CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient_id ON public.patient_insurance(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_user_id ON public.patient_insurance(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_user_id ON public.patient_documents(user_id);

-- Create a view for appointment details with patient and provider information
CREATE OR REPLACE VIEW public.appointment_details AS
SELECT 
  a.id,
  a.appointment_time,
  a.status,
  a.duration_minutes,
  a.appointment_type,
  a.no_show_risk,
  a.notes,
  a.reminder_sent,
  p.full_name as patient_name,
  p.phone as patient_phone,
  p.email as patient_email,
  pr.full_name as provider_name,
  pr.specialty as provider_specialty,
  a.user_id,
  a.created_at,
  a.updated_at
FROM public.appointments a
JOIN public.patients p ON a.patient_id = p.id
LEFT JOIN public.appointments_providers ap ON a.id = ap.appointment_id
LEFT JOIN public.providers pr ON ap.provider_id = pr.id
WHERE ap.role = 'Primary' OR ap.role IS NULL;

-- Create a function to automatically create audit log entries
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to send appointment reminders (placeholder for future implementation)
CREATE OR REPLACE FUNCTION public.schedule_appointment_reminder(appointment_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_table,
    related_id,
    scheduled_for
  )
  SELECT 
    a.user_id,
    'appointment_reminder'::public.notification_type,
    'Appointment Reminder',
    'You have an appointment scheduled for ' || to_char(a.appointment_time, 'YYYY-MM-DD HH24:MI'),
    'appointments',
    a.id,
    a.appointment_time - INTERVAL '1 day'
  FROM public.appointments a
  WHERE a.id = appointment_id
    AND a.status = 'Confirmed'
    AND a.reminder_sent = false;
    
  UPDATE public.appointments 
  SET reminder_sent = true 
  WHERE id = appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;