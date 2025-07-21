/*
  # Remove admin@clinicflow.com from admin status and delete user

  1. Security Changes
    - Remove admin privileges from UID 550e8400-e29b-41d4-a716-446655440000
    - Update all RLS policies to remove admin user exception
    - Clean up any admin-specific data

  2. User Deletion
    - Delete user from public.users table
    - Delete user from auth.users table (cascades to all related data)
    - Remove all associated records across all tables

  3. Policy Updates
    - Update all RLS policies to remove admin user references
    - Ensure normal user access patterns remain intact
*/

-- First, remove admin user from all tables that reference them
-- This will cascade delete due to foreign key constraints

-- Delete from public.users (this will cascade to all related tables)
DELETE FROM public.users 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Delete from auth.users (this is the main user record)
DELETE FROM auth.users 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Update all RLS policies to remove admin user exceptions
-- This ensures no policies reference the deleted admin user

-- Update users table policies
DROP POLICY IF EXISTS "Admin user has full access" ON public.users;
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update patients table policies
DROP POLICY IF EXISTS "Admin user has full access to patients" ON public.patients;
CREATE POLICY "Clinic staff can view all patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own patients"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update appointments table policies
DROP POLICY IF EXISTS "Admin user has full access to appointments" ON public.appointments;
CREATE POLICY "Clinic staff can view all appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own appointments"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update pre_authorizations table policies
DROP POLICY IF EXISTS "Admin user has full access to pre_authorizations" ON public.pre_authorizations;
CREATE POLICY "Clinic staff can view all pre-authorizations"
  ON public.pre_authorizations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert pre-authorizations"
  ON public.pre_authorizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own pre-authorizations"
  ON public.pre_authorizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own pre-authorizations"
  ON public.pre_authorizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update insurance_eligibility table policies
DROP POLICY IF EXISTS "Admin user has full access to insurance_eligibility" ON public.insurance_eligibility;
CREATE POLICY "Clinic staff can view all insurance eligibility"
  ON public.insurance_eligibility
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert insurance eligibility"
  ON public.insurance_eligibility
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own insurance eligibility"
  ON public.insurance_eligibility
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own insurance eligibility"
  ON public.insurance_eligibility
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update intake_tasks table policies
DROP POLICY IF EXISTS "Admin user has full access to intake_tasks" ON public.intake_tasks;
CREATE POLICY "Clinic staff can view all intake tasks"
  ON public.intake_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert intake tasks"
  ON public.intake_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own intake tasks"
  ON public.intake_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own intake tasks"
  ON public.intake_tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update providers table policies
DROP POLICY IF EXISTS "Admin user has full access to providers" ON public.providers;
CREATE POLICY "Clinic staff can view all providers"
  ON public.providers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert providers"
  ON public.providers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own providers"
  ON public.providers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own providers"
  ON public.providers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update appointments_providers table policies
DROP POLICY IF EXISTS "Admin user has full access to appointments_providers" ON public.appointments_providers;
CREATE POLICY "Clinic staff can view all appointment providers"
  ON public.appointments_providers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert appointment providers"
  ON public.appointments_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own appointment providers"
  ON public.appointments_providers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own appointment providers"
  ON public.appointments_providers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update patient_insurance table policies
DROP POLICY IF EXISTS "Admin user has full access to patient_insurance" ON public.patient_insurance;
CREATE POLICY "Clinic staff can view all patient insurance"
  ON public.patient_insurance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert patient insurance"
  ON public.patient_insurance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own patient insurance"
  ON public.patient_insurance
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own patient insurance"
  ON public.patient_insurance
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update patient_documents table policies
DROP POLICY IF EXISTS "Admin user has full access to patient_documents" ON public.patient_documents;
CREATE POLICY "Clinic staff can view all patient documents"
  ON public.patient_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert patient documents"
  ON public.patient_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own patient documents"
  ON public.patient_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own patient documents"
  ON public.patient_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update document_templates table policies
DROP POLICY IF EXISTS "Admin user has full access to document_templates" ON public.document_templates;
CREATE POLICY "Clinic staff can view all document templates"
  ON public.document_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert document templates"
  ON public.document_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own document templates"
  ON public.document_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own document templates"
  ON public.document_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update notifications table policies
DROP POLICY IF EXISTS "Admin user has full access to notifications" ON public.notifications;
CREATE POLICY "Clinic staff can view all notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clinic staff can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update user_preferences table policies
DROP POLICY IF EXISTS "Admin user has full access to user_preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);