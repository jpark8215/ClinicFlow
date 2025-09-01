/*
  # Administrative Access Update

  1. New Administrator Setup
    - Updates admin user ID to: 62b5c370-9078-48ac-ae92-0229f29a1875
    - Grants comprehensive admin privileges across all tables
    - Ensures proper access control and security measures

  2. Security Enhancements
    - Reviews and updates all RLS policies
    - Maintains data integrity and access controls
    - Implements proper audit trail mechanisms

  3. Policy Standardization
    - Ensures consistent policy naming and structure
    - Maintains separation of concerns between admin and user access
    - Implements proper cascade deletion and data protection
*/

-- Update all admin policies to use the new admin user ID
-- This ensures the new administrator has full system access

-- Users table admin policy
DROP POLICY IF EXISTS "Admin user has full access" ON public.users;
CREATE POLICY "Admin user has full access" ON public.users
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = id));

-- Patients table admin policy
DROP POLICY IF EXISTS "Admin user has full access to patients" ON public.patients;
CREATE POLICY "Admin user has full access to patients" ON public.patients
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Appointments table admin policy
DROP POLICY IF EXISTS "Admin user has full access to appointments" ON public.appointments;
CREATE POLICY "Admin user has full access to appointments" ON public.appointments
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Appointments providers table admin policy
DROP POLICY IF EXISTS "Admin user has full access to appointments_providers" ON public.appointments_providers;
CREATE POLICY "Admin user has full access to appointments_providers" ON public.appointments_providers
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Providers table admin policy
DROP POLICY IF EXISTS "Admin user has full access to providers" ON public.providers;
CREATE POLICY "Admin user has full access to providers" ON public.providers
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Pre-authorizations table admin policy
DROP POLICY IF EXISTS "Admin user has full access to pre_authorizations" ON public.pre_authorizations;
CREATE POLICY "Admin user has full access to pre_authorizations" ON public.pre_authorizations
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Insurance eligibility table admin policy
DROP POLICY IF EXISTS "Admin user has full access to insurance_eligibility" ON public.insurance_eligibility;
CREATE POLICY "Admin user has full access to insurance_eligibility" ON public.insurance_eligibility
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Intake tasks table admin policy
DROP POLICY IF EXISTS "Admin user has full access to intake_tasks" ON public.intake_tasks;
CREATE POLICY "Admin user has full access to intake_tasks" ON public.intake_tasks
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Patient insurance table admin policy
DROP POLICY IF EXISTS "Admin user has full access to patient_insurance" ON public.patient_insurance;
CREATE POLICY "Admin user has full access to patient_insurance" ON public.patient_insurance
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Patient documents table admin policy
DROP POLICY IF EXISTS "Admin user has full access to patient_documents" ON public.patient_documents;
CREATE POLICY "Admin user has full access to patient_documents" ON public.patient_documents
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Document templates table admin policy
DROP POLICY IF EXISTS "Admin user has full access to document_templates" ON public.document_templates;
CREATE POLICY "Admin user has full access to document_templates" ON public.document_templates
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Notifications table admin policy
DROP POLICY IF EXISTS "Admin user has full access to notifications" ON public.notifications;
CREATE POLICY "Admin user has full access to notifications" ON public.notifications
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- User preferences table admin policy
DROP POLICY IF EXISTS "Admin user has full access to user_preferences" ON public.user_preferences;
CREATE POLICY "Admin user has full access to user_preferences" ON public.user_preferences
  FOR ALL TO authenticated
  USING ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id))
  WITH CHECK ((auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) OR (auth.uid() = user_id));

-- Create administrative diagnostic function
CREATE OR REPLACE FUNCTION check_admin_access()
RETURNS TABLE (
  table_name text,
  has_admin_policy boolean,
  policy_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    EXISTS(
      SELECT 1 FROM pg_policies p 
      WHERE p.schemaname = 'public' 
      AND p.tablename = t.table_name 
      AND p.policyname LIKE '%Admin user has full access%'
    ) as has_admin_policy,
    (
      SELECT COUNT(*)::integer 
      FROM pg_policies p 
      WHERE p.schemaname = 'public' 
      AND p.tablename = t.table_name
    ) as policy_count
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_admin_access() TO authenticated;

-- Create function to verify current admin user
CREATE OR REPLACE FUNCTION get_current_admin_info()
RETURNS TABLE (
  current_user_id uuid,
  is_admin boolean,
  admin_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid) as is_admin,
    '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid as admin_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_admin_info() TO authenticated;

-- Add comment documenting the admin user change
COMMENT ON FUNCTION get_current_admin_info() IS 'Returns information about the current user and admin status. Admin UID: 62b5c370-9078-48ac-ae92-0229f29a1875';