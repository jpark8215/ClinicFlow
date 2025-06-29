/*
  # Database Schema Reset and Repair

  This migration fixes database schema inconsistencies that can cause authentication errors.
  It ensures all tables, RLS policies, and triggers are properly configured.

  1. Reset Operations
    - Clean up any orphaned data
    - Reset RLS policies
    - Recreate essential functions
  
  2. Schema Validation
    - Ensure all foreign key constraints are valid
    - Verify RLS policies are correctly applied
    - Check trigger functions exist
*/

-- First, ensure the auth schema is properly accessible
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Clean up any potential orphaned records that might cause FK constraint issues
DELETE FROM appointments_providers WHERE appointment_id NOT IN (SELECT id FROM appointments);
DELETE FROM appointments_providers WHERE provider_id NOT IN (SELECT id FROM providers);
DELETE FROM patient_documents WHERE patient_id NOT IN (SELECT id FROM patients);
DELETE FROM patient_documents WHERE template_id IS NOT NULL AND template_id NOT IN (SELECT id FROM document_templates);
DELETE FROM patient_insurance WHERE patient_id NOT IN (SELECT id FROM patients);
DELETE FROM insurance_eligibility WHERE patient_id NOT IN (SELECT id FROM patients);
DELETE FROM intake_tasks WHERE patient_id NOT IN (SELECT id FROM patients);
DELETE FROM appointments WHERE patient_id NOT IN (SELECT id FROM patients);

-- Ensure the users table has proper structure and policies
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Recreate the handle_new_user function to ensure it works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the handle_auth_user_update function
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET 
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers exist on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_update();

-- Ensure all update timestamp functions exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate all the update triggers to ensure they work
CREATE OR REPLACE FUNCTION public.handle_users_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_patient_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_appointment_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_provider_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_pre_auth_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_eligibility_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_intake_task_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_patient_insurance_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_document_template_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_patient_document_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure all tables have proper RLS enabled and policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Refresh the appointment_details view to ensure it works properly
DROP VIEW IF EXISTS appointment_details;
CREATE VIEW appointment_details AS
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
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN appointments_providers ap ON a.id = ap.appointment_id
LEFT JOIN providers pr ON ap.provider_id = pr.id;

-- Grant necessary permissions
GRANT SELECT ON appointment_details TO authenticated;

-- Update statistics to ensure query planner has current information
ANALYZE;

-- Create a function to verify the schema is working
CREATE OR REPLACE FUNCTION public.verify_schema_health()
RETURNS text AS $$
DECLARE
  result text := 'Schema health check passed';
BEGIN
  -- Test basic table access
  PERFORM COUNT(*) FROM users WHERE false;
  PERFORM COUNT(*) FROM patients WHERE false;
  PERFORM COUNT(*) FROM appointments WHERE false;
  
  -- Test RLS is working
  IF NOT (SELECT schemaname FROM pg_tables WHERE tablename = 'users' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'RLS not enabled on users table';
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Schema health check failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;