/*
  # Fix Database Schema Functions

  This migration adds the missing database functions that are required for:
  1. Supabase authentication to work properly
  2. Trigger functions that are referenced but may be missing
  3. User ID helper functions

  ## Functions Added
  - `uid()` - Helper function to get current user ID
  - All trigger handler functions for update timestamps and audit logging
  - `insert_dummy_data()` - Function to insert test data
*/

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Generic audit log creation function
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Specific trigger handler functions
CREATE OR REPLACE FUNCTION public.handle_appointment_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_eligibility_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_intake_task_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_patient_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_pre_auth_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_provider_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_patient_insurance_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_document_template_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_patient_document_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to insert comprehensive dummy data
CREATE OR REPLACE FUNCTION public.insert_dummy_data()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  patient_ids uuid[];
  provider_ids uuid[];
  appointment_ids uuid[];
  template_ids uuid[];
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'Error: No authenticated user found';
  END IF;

  -- Check if user already has data
  IF EXISTS (SELECT 1 FROM patients WHERE user_id = current_user_id LIMIT 1) THEN
    RETURN 'Dummy data already exists for this user';
  END IF;

  -- Insert patients
  WITH inserted_patients AS (
    INSERT INTO patients (full_name, date_of_birth, phone, email, address, emergency_contact_name, emergency_contact_phone, user_id)
    VALUES 
      ('Sarah Johnson', '1985-03-15', '555-0101', 'sarah.johnson@email.com', '123 Main St, Anytown, ST 12345', 'John Johnson', '555-0102'),
      ('Michael Smith', '1978-07-22', '555-0103', 'michael.smith@email.com', '456 Oak Ave, Somewhere, ST 12346', 'Lisa Smith', '555-0104'),
      ('Emily Davis', '1992-11-08', '555-0105', 'emily.davis@email.com', '789 Pine Rd, Elsewhere, ST 12347', 'Robert Davis', '555-0106'),
      ('Robert Brown', '1965-05-30', '555-0107', 'robert.brown@email.com', '321 Elm St, Nowhere, ST 12348', 'Mary Brown', '555-0108'),
      ('Linda Wilson', '1980-09-12', '555-0109', 'linda.wilson@email.com', '654 Maple Dr, Anywhere, ST 12349', 'Tom Wilson', '555-0110'),
      ('James Miller', '1973-01-25', '555-0111', 'james.miller@email.com', '987 Cedar Ln, Someplace, ST 12350', 'Susan Miller', '555-0112'),
      ('Jessica Garcia', '1988-06-18', '555-0113', 'jessica.garcia@email.com', '147 Birch Way, Othertown, ST 12351', 'Carlos Garcia', '555-0114'),
      ('David Martinez', '1995-12-03', '555-0115', 'david.martinez@email.com', '258 Spruce St, Newtown, ST 12352', 'Maria Martinez', '555-0116')
    RETURNING id
  )
  SELECT array_agg(id) INTO patient_ids FROM inserted_patients;

  -- Insert providers
  WITH inserted_providers AS (
    INSERT INTO providers (full_name, specialty, license_number, phone, email, user_id)
    VALUES 
      ('Dr. Amanda Thompson', 'Family Medicine', 'MD123456', '555-0201', 'athompson@clinic.com'),
      ('Dr. Richard Chen', 'Cardiology', 'MD123457', '555-0202', 'rchen@clinic.com'),
      ('Dr. Maria Rodriguez', 'Orthopedics', 'MD123458', '555-0203', 'mrodriguez@clinic.com'),
      ('Dr. Kevin Park', 'Dermatology', 'MD123459', '555-0204', 'kpark@clinic.com'),
      ('Dr. Sarah Williams', 'Pediatrics', 'MD123460', '555-0205', 'swilliams@clinic.com')
    RETURNING id
  )
  SELECT array_agg(id) INTO provider_ids FROM inserted_providers;

  -- Insert appointments
  WITH inserted_appointments AS (
    INSERT INTO appointments (patient_id, appointment_time, status, duration_minutes, appointment_type, notes, no_show_risk, user_id)
    VALUES 
      (patient_ids[1], now() + interval '1 day', 'Confirmed', 30, 'consultation', 'Annual checkup', 0.1),
      (patient_ids[2], now() + interval '3 days', 'Pending', 45, 'follow-up', 'Blood pressure follow-up', 0.3),
      (patient_ids[3], now() - interval '1 week', 'Completed', 30, 'consultation', 'Routine visit completed', 0.0),
      (patient_ids[4], now() - interval '3 days', 'No-Show', 30, 'consultation', 'Patient did not show up', 0.8),
      (patient_ids[5], now() + interval '2 weeks', 'Confirmed', 60, 'procedure', 'Minor procedure scheduled', 0.2),
      (patient_ids[6], now() - interval '2 weeks', 'Cancelled', 30, 'consultation', 'Patient cancelled', 0.0),
      (patient_ids[7], now() + interval '5 days', 'Confirmed', 30, 'consultation', 'New patient visit', 0.4),
      (patient_ids[8], now() + interval '1 week', 'Pending', 45, 'follow-up', 'Test results review', 0.2)
    RETURNING id
  )
  SELECT array_agg(id) INTO appointment_ids FROM inserted_appointments;

  -- Insert appointment-provider relationships
  INSERT INTO appointments_providers (appointment_id, provider_id, role, user_id)
  SELECT 
    appointment_ids[i], 
    provider_ids[((i-1) % array_length(provider_ids, 1)) + 1], 
    'Primary',
    current_user_id
  FROM generate_series(1, array_length(appointment_ids, 1)) AS i;

  -- Insert prior authorizations
  INSERT INTO pre_authorizations (patient_name, service, payer, status, notes, authorization_number, expiration_date, requested_amount, approved_amount, user_id)
  VALUES 
    ('Sarah Johnson', 'MRI Scan', 'Blue Cross Blue Shield', 'Approved', 'Approved for lower back MRI', 'AUTH001234', current_date + interval '6 months', 1200.00, 1200.00),
    ('Michael Smith', 'Physical Therapy', 'Aetna', 'Pending', 'Awaiting review for 12 sessions', NULL, NULL, 1800.00, NULL),
    ('Emily Davis', 'Cardiology Consult', 'Cigna', 'Denied', 'Not medically necessary per reviewer', NULL, NULL, 350.00, 0.00),
    ('Robert Brown', 'Orthopedic Surgery', 'UnitedHealthcare', 'Submitted', 'Knee replacement surgery request', NULL, NULL, 45000.00, NULL),
    ('Linda Wilson', 'Specialist Referral', 'Humana', 'Approved', 'Endocrinology referral approved', 'AUTH001235', current_date + interval '3 months', 250.00, 250.00),
    ('James Miller', 'Cardiac Catheterization', 'Kaiser Permanente', 'Pending', 'Under clinical review', NULL, NULL, 8500.00, NULL);

  -- Insert intake tasks
  INSERT INTO intake_tasks (patient_id, task_description, status, document_url, user_id)
  VALUES 
    (patient_ids[1], 'Process insurance verification documents', 'Pending OCR', 'https://example.com/doc1.pdf'),
    (patient_ids[2], 'Validate patient demographics', 'Needs Validation', NULL),
    (patient_ids[3], 'Complete medical history intake', 'Complete', 'https://example.com/doc2.pdf'),
    (patient_ids[4], 'Review emergency contact information', 'Needs Validation', NULL),
    (patient_ids[5], 'Process consent forms', 'Pending OCR', 'https://example.com/doc3.pdf'),
    (patient_ids[6], 'Validate insurance information', 'Complete', NULL);

  -- Insert insurance eligibility records
  INSERT INTO insurance_eligibility (patient_id, payer_name, status, verification_date, details, user_id)
  VALUES 
    (patient_ids[1], 'Blue Cross Blue Shield', 'Eligible', now() - interval '1 day', 'Active coverage, $25 copay'),
    (patient_ids[2], 'Aetna', 'Eligible', now() - interval '2 days', 'Active coverage, $30 copay'),
    (patient_ids[3], 'Cigna', 'Pending', now() - interval '1 hour', 'Verification in progress'),
    (patient_ids[4], 'UnitedHealthcare', 'Eligible', now() - interval '3 days', 'Active coverage, $20 copay'),
    (patient_ids[5], 'Humana', 'Ineligible', now() - interval '1 week', 'Coverage terminated'),
    (patient_ids[6], 'Kaiser Permanente', 'Eligible', now() - interval '5 days', 'Active HMO coverage'),
    (patient_ids[7], 'Anthem', 'Error', now() - interval '2 hours', 'System timeout during verification'),
    (patient_ids[8], 'Medicaid', 'Eligible', now() - interval '1 day', 'Active state coverage');

  -- Insert patient insurance records
  INSERT INTO patient_insurance (patient_id, insurance_company, policy_number, group_number, subscriber_name, relationship_to_subscriber, effective_date, expiration_date, copay_amount, deductible_amount, is_primary, user_id)
  VALUES 
    (patient_ids[1], 'Blue Cross Blue Shield', 'BCBS123456789', 'GRP001', 'Sarah Johnson', 'Self', '2024-01-01', '2024-12-31', 25.00, 1000.00, true),
    (patient_ids[2], 'Aetna', 'AET987654321', 'GRP002', 'Michael Smith', 'Self', '2024-01-01', '2024-12-31', 30.00, 1500.00, true),
    (patient_ids[3], 'Cigna', 'CIG456789123', 'GRP003', 'Emily Davis', 'Self', '2024-01-01', '2024-12-31', 20.00, 2000.00, true),
    (patient_ids[4], 'UnitedHealthcare', 'UHC789123456', 'GRP004', 'Robert Brown', 'Self', '2024-01-01', '2024-12-31', 20.00, 1200.00, true),
    (patient_ids[5], 'Humana', 'HUM321654987', 'GRP005', 'Linda Wilson', 'Self', '2024-01-01', '2024-12-31', 35.00, 1800.00, true),
    (patient_ids[6], 'Kaiser Permanente', 'KP654987321', 'GRP006', 'James Miller', 'Self', '2024-01-01', '2024-12-31', 15.00, 500.00, true),
    (patient_ids[7], 'Anthem', 'ANT147258369', 'GRP007', 'Jessica Garcia', 'Self', '2024-01-01', '2024-12-31', 25.00, 1000.00, true),
    (patient_ids[8], 'Medicaid', 'MCD369258147', NULL, 'David Martinez', 'Self', '2024-01-01', '2024-12-31', 0.00, 0.00, true);

  -- Insert document templates
  WITH inserted_templates AS (
    INSERT INTO document_templates (name, description, template_content, category, user_id)
    VALUES 
      ('New Patient Intake Form', 'Standard intake form for new patients', 'Patient Name: {{patient_name}}\nDate of Birth: {{dob}}\nInsurance: {{insurance}}', 'Intake'),
      ('Consent for Treatment', 'General consent form for medical treatment', 'I, {{patient_name}}, consent to treatment by {{provider_name}} on {{date}}.', 'Consent'),
      ('Referral Letter Template', 'Template for specialist referrals', 'Dear {{specialist_name}},\n\nI am referring {{patient_name}} for {{reason}}.', 'Referral'),
      ('Discharge Instructions', 'Post-visit discharge instructions', 'Patient: {{patient_name}}\nDiagnosis: {{diagnosis}}\nInstructions: {{instructions}}', 'Discharge')
    RETURNING id
  )
  SELECT array_agg(id) INTO template_ids FROM inserted_templates;

  -- Insert patient documents
  INSERT INTO patient_documents (patient_id, template_id, document_name, document_content, document_type, is_signed, signed_at, signed_by, user_id)
  VALUES 
    (patient_ids[1], template_ids[1], 'Sarah Johnson - Intake Form', 'Completed intake form for Sarah Johnson', 'PDF', true, now() - interval '1 week', 'Sarah Johnson'),
    (patient_ids[2], template_ids[2], 'Michael Smith - Treatment Consent', 'Signed consent for cardiac evaluation', 'PDF', true, now() - interval '5 days', 'Michael Smith'),
    (patient_ids[3], template_ids[3], 'Emily Davis - Referral Letter', 'Referral to orthopedic specialist', 'PDF', false, NULL, NULL),
    (patient_ids[4], template_ids[4], 'Robert Brown - Discharge Instructions', 'Post-visit instructions for hypertension', 'PDF', false, NULL, NULL),
    (patient_ids[5], template_ids[1], 'Linda Wilson - Intake Form', 'New patient intake completed', 'PDF', true, now() - interval '2 weeks', 'Linda Wilson'),
    (patient_ids[6], template_ids[2], 'James Miller - Treatment Consent', 'Consent for preventive care', 'PDF', true, now() - interval '1 month', 'James Miller');

  -- Insert notifications
  INSERT INTO notifications (user_id, type, title, message, status, related_table, related_id, scheduled_for)
  VALUES 
    (current_user_id, 'appointment_reminder', 'Appointment Reminder', 'You have an appointment tomorrow with Dr. Thompson', 'unread', 'appointments', appointment_ids[1], now() + interval '1 day'),
    (current_user_id, 'preauth_update', 'Prior Authorization Approved', 'MRI scan authorization has been approved', 'read', 'pre_authorizations', NULL, NULL),
    (current_user_id, 'eligibility_check', 'Insurance Verification Complete', 'Insurance eligibility verified for Sarah Johnson', 'read', 'insurance_eligibility', NULL, NULL),
    (current_user_id, 'document_required', 'Document Validation Needed', 'Patient demographics require validation', 'unread', 'intake_tasks', NULL, NULL),
    (current_user_id, 'system_alert', 'High No-Show Risk', 'Patient has high probability of no-show', 'unread', 'appointments', appointment_ids[4], NULL),
    (current_user_id, 'appointment_reminder', 'Upcoming Procedure', 'Minor procedure scheduled for next week', 'unread', 'appointments', appointment_ids[5], now() + interval '1 week'),
    (current_user_id, 'preauth_update', 'Prior Authorization Denied', 'Cardiology consult authorization denied', 'read', 'pre_authorizations', NULL, NULL),
    (current_user_id, 'eligibility_check', 'Verification Error', 'Unable to verify insurance for Jessica Garcia', 'unread', 'insurance_eligibility', NULL, NULL);

  -- Insert audit log entries
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
  VALUES 
    ('appointments', appointment_ids[3], 'UPDATE', '{"status": "Pending"}', '{"status": "Completed"}', current_user_id),
    ('pre_authorizations', NULL, 'INSERT', NULL, '{"status": "Approved", "service": "MRI Scan"}', current_user_id),
    ('patients', patient_ids[1], 'UPDATE', '{"phone": "555-0000"}', '{"phone": "555-0101"}', current_user_id),
    ('insurance_eligibility', NULL, 'INSERT', NULL, '{"status": "Eligible", "payer_name": "Blue Cross"}', current_user_id),
    ('appointments', appointment_ids[6], 'UPDATE', '{"status": "Confirmed"}', '{"status": "Cancelled"}', current_user_id);

  RETURN 'Successfully inserted comprehensive dummy data for user: ' || current_user_id::text;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.insert_dummy_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.uid() TO authenticated;