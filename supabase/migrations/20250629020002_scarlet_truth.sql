-- Remove demo account and clean up hardcoded demo data

-- Remove the hardcoded demo user
DELETE FROM auth.identities WHERE provider_id = 'admin@clinicflow.com';
DELETE FROM auth.users WHERE email = 'admin@clinicflow.com';

-- Remove the hardcoded demo user creation function
DROP FUNCTION IF EXISTS public.is_super_admin();

-- Update the insert_dummy_data function to remove hardcoded user creation
CREATE OR REPLACE FUNCTION public.insert_dummy_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_patients_count INTEGER;
    
    -- Patient IDs
    patient_1_id UUID := gen_random_uuid();
    patient_2_id UUID := gen_random_uuid();
    patient_3_id UUID := gen_random_uuid();
    patient_4_id UUID := gen_random_uuid();
    patient_5_id UUID := gen_random_uuid();
    patient_6_id UUID := gen_random_uuid();
    patient_7_id UUID := gen_random_uuid();
    patient_8_id UUID := gen_random_uuid();
    
    -- Provider IDs
    provider_1_id UUID := gen_random_uuid();
    provider_2_id UUID := gen_random_uuid();
    provider_3_id UUID := gen_random_uuid();
    provider_4_id UUID := gen_random_uuid();
    provider_5_id UUID := gen_random_uuid();
    
    -- Appointment IDs
    appointment_1_id UUID := gen_random_uuid();
    appointment_2_id UUID := gen_random_uuid();
    appointment_3_id UUID := gen_random_uuid();
    appointment_4_id UUID := gen_random_uuid();
    appointment_5_id UUID := gen_random_uuid();
    appointment_6_id UUID := gen_random_uuid();
    appointment_7_id UUID := gen_random_uuid();
    appointment_8_id UUID := gen_random_uuid();
    
    -- Template IDs
    template_1_id UUID := gen_random_uuid();
    template_2_id UUID := gen_random_uuid();
    template_3_id UUID := gen_random_uuid();
    template_4_id UUID := gen_random_uuid();

BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN 'Error: User must be authenticated to insert dummy data';
    END IF;
    
    -- Check if clinic already has data (not user-specific anymore)
    SELECT COUNT(*) INTO existing_patients_count 
    FROM public.patients;
    
    IF existing_patients_count > 0 THEN
        RETURN 'Clinic already has ' || existing_patients_count || ' patients. Dummy data not inserted to avoid duplicates.';
    END IF;

    -- Insert Patients (using current user as creator but data is shared)
    INSERT INTO public.patients (
        id, full_name, date_of_birth, phone, email, address, 
        emergency_contact_name, emergency_contact_phone, user_id, created_at, updated_at
    ) VALUES 
    (patient_1_id, 'Sarah Johnson', '1985-03-15', '(555) 123-4567', 'sarah.johnson@email.com', 
     '123 Main St, Anytown, ST 12345', 'John Johnson', '(555) 123-4568', current_user_id, now() - interval '30 days', now() - interval '30 days'),
    
    (patient_2_id, 'Michael Smith', '1978-07-22', '(555) 234-5678', 'michael.smith@email.com', 
     '456 Oak Ave, Somewhere, ST 23456', 'Lisa Smith', '(555) 234-5679', current_user_id, now() - interval '25 days', now() - interval '25 days'),
    
    (patient_3_id, 'Emily Davis', '1992-11-08', '(555) 345-6789', 'emily.davis@email.com', 
     '789 Pine Rd, Elsewhere, ST 34567', 'Robert Davis', '(555) 345-6790', current_user_id, now() - interval '20 days', now() - interval '20 days'),
    
    (patient_4_id, 'Robert Brown', '1965-05-30', '(555) 456-7890', 'robert.brown@email.com', 
     '321 Elm St, Nowhere, ST 45678', 'Mary Brown', '(555) 456-7891', current_user_id, now() - interval '15 days', now() - interval '15 days'),
    
    (patient_5_id, 'Linda Wilson', '1980-09-12', '(555) 567-8901', 'linda.wilson@email.com', 
     '654 Maple Dr, Anywhere, ST 56789', 'David Wilson', '(555) 567-8902', current_user_id, now() - interval '10 days', now() - interval '10 days'),
    
    (patient_6_id, 'James Miller', '1973-12-03', '(555) 678-9012', 'james.miller@email.com', 
     '987 Cedar Ln, Someplace, ST 67890', 'Jennifer Miller', '(555) 678-9013', current_user_id, now() - interval '8 days', now() - interval '8 days'),
    
    (patient_7_id, 'Jessica Garcia', '1988-04-18', '(555) 789-0123', 'jessica.garcia@email.com', 
     '147 Birch St, Everytown, ST 78901', 'Carlos Garcia', '(555) 789-0124', current_user_id, now() - interval '5 days', now() - interval '5 days'),
    
    (patient_8_id, 'David Martinez', '1995-08-25', '(555) 890-1234', 'david.martinez@email.com', 
     '258 Spruce Ave, Hometown, ST 89012', 'Maria Martinez', '(555) 890-1235', current_user_id, now() - interval '3 days', now() - interval '3 days');

    -- Insert Providers
    INSERT INTO public.providers (
        id, full_name, specialty, license_number, phone, email, is_active, user_id, created_at, updated_at
    ) VALUES 
    (provider_1_id, 'Dr. Amanda Thompson', 'Family Medicine', 'MD123456', '(555) 111-2222', 'dr.thompson@clinic.com', true, current_user_id, now() - interval '60 days', now() - interval '60 days'),
    
    (provider_2_id, 'Dr. Richard Chen', 'Cardiology', 'MD234567', '(555) 222-3333', 'dr.chen@clinic.com', true, current_user_id, now() - interval '55 days', now() - interval '55 days'),
    
    (provider_3_id, 'Dr. Maria Rodriguez', 'Orthopedics', 'MD345678', '(555) 333-4444', 'dr.rodriguez@clinic.com', true, current_user_id, now() - interval '50 days', now() - interval '50 days'),
    
    (provider_4_id, 'Dr. Kevin Park', 'Dermatology', 'MD456789', '(555) 444-5555', 'dr.park@clinic.com', true, current_user_id, now() - interval '45 days', now() - interval '45 days'),
    
    (provider_5_id, 'Dr. Sarah Williams', 'Pediatrics', 'MD567890', '(555) 555-6666', 'dr.williams@clinic.com', true, current_user_id, now() - interval '40 days', now() - interval '40 days');

    -- Insert Patient Insurance
    INSERT INTO public.patient_insurance (
        patient_id, insurance_company, policy_number, group_number, subscriber_name, 
        relationship_to_subscriber, effective_date, expiration_date, copay_amount, 
        deductible_amount, is_primary, user_id, created_at, updated_at
    ) VALUES 
    (patient_1_id, 'Blue Cross Blue Shield', 'BCBS123456789', 'GRP001', 'Sarah Johnson', 'Self', '2024-01-01', '2024-12-31', 25.00, 1500.00, true, current_user_id, now() - interval '30 days', now() - interval '30 days'),
    
    (patient_2_id, 'Aetna', 'AET987654321', 'GRP002', 'Michael Smith', 'Self', '2024-01-01', '2024-12-31', 30.00, 2000.00, true, current_user_id, now() - interval '25 days', now() - interval '25 days'),
    
    (patient_3_id, 'Cigna', 'CIG456789123', 'GRP003', 'Emily Davis', 'Self', '2024-01-01', '2024-12-31', 20.00, 1000.00, true, current_user_id, now() - interval '20 days', now() - interval '20 days'),
    
    (patient_4_id, 'UnitedHealthcare', 'UHC789123456', 'GRP004', 'Robert Brown', 'Self', '2024-01-01', '2024-12-31', 35.00, 2500.00, true, current_user_id, now() - interval '15 days', now() - interval '15 days'),
    
    (patient_5_id, 'Humana', 'HUM321654987', 'GRP005', 'Linda Wilson', 'Self', '2024-01-01', '2024-12-31', 25.00, 1500.00, true, current_user_id, now() - interval '10 days', now() - interval '10 days'),
    
    (patient_6_id, 'Kaiser Permanente', 'KP654987321', 'GRP006', 'James Miller', 'Self', '2024-01-01', '2024-12-31', 15.00, 500.00, true, current_user_id, now() - interval '8 days', now() - interval '8 days'),
    
    (patient_7_id, 'Anthem', 'ANT147258369', 'GRP007', 'Jessica Garcia', 'Self', '2024-01-01', '2024-12-31', 30.00, 2000.00, true, current_user_id, now() - interval '5 days', now() - interval '5 days'),
    
    (patient_8_id, 'Medicaid', 'MCD369258147', 'STATE', 'David Martinez', 'Self', '2024-01-01', '2024-12-31', 0.00, 0.00, true, current_user_id, now() - interval '3 days', now() - interval '3 days');

    -- Insert Appointments
    INSERT INTO public.appointments (
        id, patient_id, appointment_time, status, no_show_risk, notes, duration_minutes, 
        appointment_type, reminder_sent, user_id, created_at, updated_at
    ) VALUES 
    (appointment_1_id, patient_1_id, now() + interval '2 hours', 'Confirmed', 0.15, 'Annual checkup', 30, 'consultation', false, current_user_id, now() - interval '7 days', now() - interval '7 days'),
    
    (appointment_2_id, patient_2_id, now() + interval '1 day', 'Confirmed', 0.25, 'Follow-up for hypertension', 20, 'follow-up', true, current_user_id, now() - interval '5 days', now() - interval '5 days'),
    
    (appointment_3_id, patient_3_id, now() + interval '2 days', 'Pending', 0.35, 'Knee pain evaluation', 45, 'consultation', false, current_user_id, now() - interval '3 days', now() - interval '3 days'),
    
    (appointment_4_id, patient_4_id, now() - interval '1 day', 'Completed', 0.10, 'Cardiology consultation completed', 60, 'consultation', true, current_user_id, now() - interval '10 days', now() - interval '1 day'),
    
    (appointment_5_id, patient_5_id, now() - interval '3 days', 'No-Show', 0.80, 'Patient did not show up', 30, 'consultation', true, current_user_id, now() - interval '15 days', now() - interval '3 days'),
    
    (appointment_6_id, patient_6_id, now() + interval '3 days', 'Confirmed', 0.20, 'Skin lesion check', 30, 'consultation', false, current_user_id, now() - interval '2 days', now() - interval '2 days'),
    
    (appointment_7_id, patient_7_id, now() + interval '5 days', 'Pending', 0.40, 'New patient intake', 60, 'new-patient', false, current_user_id, now() - interval '1 day', now() - interval '1 day'),
    
    (appointment_8_id, patient_8_id, now() - interval '5 days', 'Cancelled', 0.30, 'Patient cancelled due to illness', 30, 'consultation', false, current_user_id, now() - interval '8 days', now() - interval '5 days');

    -- Insert Appointments Providers
    INSERT INTO public.appointments_providers (
        appointment_id, provider_id, role, user_id, created_at
    ) VALUES 
    (appointment_1_id, provider_1_id, 'Primary', current_user_id, now() - interval '7 days'),
    (appointment_2_id, provider_2_id, 'Primary', current_user_id, now() - interval '5 days'),
    (appointment_3_id, provider_3_id, 'Primary', current_user_id, now() - interval '3 days'),
    (appointment_4_id, provider_2_id, 'Primary', current_user_id, now() - interval '10 days'),
    (appointment_5_id, provider_1_id, 'Primary', current_user_id, now() - interval '15 days'),
    (appointment_6_id, provider_4_id, 'Primary', current_user_id, now() - interval '2 days'),
    (appointment_7_id, provider_5_id, 'Primary', current_user_id, now() - interval '1 day'),
    (appointment_8_id, provider_1_id, 'Primary', current_user_id, now() - interval '8 days');

    -- Insert Pre-authorizations
    INSERT INTO public.pre_authorizations (
        patient_name, service, payer, status, notes, authorization_number, 
        expiration_date, requested_amount, approved_amount, user_id, created_at, updated_at
    ) VALUES 
    ('Robert Brown', 'MRI Scan', 'UnitedHealthcare', 'Approved', 'Approved for cardiac MRI', 'AUTH001234', '2025-03-15', 2500.00, 2500.00, current_user_id, now() - interval '10 days', now() - interval '3 days'),
    
    ('Linda Wilson', 'Physical Therapy', 'Humana', 'Pending', 'Awaiting review for 12 sessions', null, null, 1800.00, null, current_user_id, now() - interval '5 days', now() - interval '5 days'),
    
    ('James Miller', 'Cardiology Consult', 'Kaiser Permanente', 'Denied', 'Not medically necessary per reviewer', null, null, 450.00, 0.00, current_user_id, now() - interval '8 days', now() - interval '2 days'),
    
    ('Emily Davis', 'Orthopedic Surgery', 'Cigna', 'Submitted', 'Submitted for knee arthroscopy', null, null, 15000.00, null, current_user_id, now() - interval '3 days', now() - interval '3 days'),
    
    ('Sarah Johnson', 'Specialist Referral', 'Blue Cross Blue Shield', 'Approved', 'Approved for endocrinology consult', 'AUTH005678', '2025-02-28', 350.00, 350.00, current_user_id, now() - interval '12 days', now() - interval '6 days'),
    
    ('Michael Smith', 'Cardiac Catheterization', 'Aetna', 'Pending', 'Under clinical review', null, null, 8500.00, null, current_user_id, now() - interval '7 days', now() - interval '7 days');

    -- Insert Intake Tasks
    INSERT INTO public.intake_tasks (
        patient_id, task_description, status, document_url, user_id, created_at, updated_at
    ) VALUES 
    (patient_7_id, 'New Patient Packet', 'Pending OCR', 'https://example.com/docs/patient7_intake.pdf', current_user_id, now() - interval '2 days', now() - interval '2 days'),
    
    (patient_8_id, 'Insurance Card', 'Needs Validation', 'https://example.com/docs/patient8_insurance.jpg', current_user_id, now() - interval '1 day', now() - interval '1 day'),
    
    (patient_6_id, 'Referral Letter', 'Complete', 'https://example.com/docs/patient6_referral.pdf', current_user_id, now() - interval '5 days', now() - interval '1 day'),
    
    (patient_3_id, 'Medical History Form', 'Needs Validation', 'https://example.com/docs/patient3_history.pdf', current_user_id, now() - interval '3 days', now() - interval '3 days'),
    
    (patient_1_id, 'Consent Forms', 'Complete', 'https://example.com/docs/patient1_consent.pdf', current_user_id, now() - interval '8 days', now() - interval '7 days'),
    
    (patient_4_id, 'Lab Results Upload', 'Pending OCR', 'https://example.com/docs/patient4_labs.pdf', current_user_id, now() - interval '4 days', now() - interval '4 days');

    -- Insert Insurance Eligibility
    INSERT INTO public.insurance_eligibility (
        patient_id, payer_name, status, verification_date, details, user_id, created_at, updated_at
    ) VALUES 
    (patient_1_id, 'Blue Cross Blue Shield', 'Eligible', now() - interval '2 days', 'Active coverage, $25 copay for office visits', current_user_id, now() - interval '2 days', now() - interval '2 days'),
    
    (patient_2_id, 'Aetna', 'Eligible', now() - interval '1 day', 'Active coverage, $30 copay, deductible not met', current_user_id, now() - interval '1 day', now() - interval '1 day'),
    
    (patient_3_id, 'Cigna', 'Pending', now() - interval '3 hours', 'Verification in progress', current_user_id, now() - interval '3 hours', now() - interval '3 hours'),
    
    (patient_4_id, 'UnitedHealthcare', 'Eligible', now() - interval '5 days', 'Active coverage, specialist copay $35', current_user_id, now() - interval '5 days', now() - interval '5 days'),
    
    (patient_5_id, 'Humana', 'Ineligible', now() - interval '3 days', 'Coverage terminated as of 12/31/2024', current_user_id, now() - interval '3 days', now() - interval '3 days'),
    
    (patient_6_id, 'Kaiser Permanente', 'Eligible', now() - interval '1 day', 'HMO coverage active, $15 copay', current_user_id, now() - interval '1 day', now() - interval '1 day'),
    
    (patient_7_id, 'Anthem', 'Error', now() - interval '4 hours', 'System timeout during verification', current_user_id, now() - interval '4 hours', now() - interval '4 hours'),
    
    (patient_8_id, 'Medicaid', 'Eligible', now() - interval '6 hours', 'Active Medicaid coverage, no copay required', current_user_id, now() - interval '6 hours', now() - interval '6 hours');

    -- Insert Document Templates
    INSERT INTO public.document_templates (
        id, name, description, template_content, category, is_active, user_id, created_at, updated_at
    ) VALUES 
    (template_1_id, 'New Patient Intake Form', 'Standard intake form for new patients', 
     'PATIENT INTAKE FORM

Patient Name: _______________
Date of Birth: _______________
Phone: _______________
Email: _______________
Address: _______________

Emergency Contact:
Name: _______________
Phone: _______________

Insurance Information:
Insurance Company: _______________
Policy Number: _______________
Group Number: _______________

Medical History:
_______________

Current Medications:
_______________

Allergies:
_______________

Patient Signature: _______________ Date: _______________', 
     'intake', true, current_user_id, now() - interval '30 days', now() - interval '30 days'),
    
    (template_2_id, 'Consent for Treatment', 'General consent form for medical treatment', 
     'CONSENT FOR TREATMENT

I, _____________, hereby consent to medical treatment by the healthcare providers at this facility.

I understand that:
1. No guarantee has been made regarding the outcome of treatment
2. I have the right to refuse treatment
3. I am responsible for payment of services

Patient Signature: _______________ Date: _______________
Witness Signature: _______________ Date: _______________', 
     'consent', true, current_user_id, now() - interval '25 days', now() - interval '25 days'),
    
    (template_3_id, 'Referral Letter Template', 'Template for specialist referrals', 
     'REFERRAL LETTER

Date: _______________

To: Dr. _______________
Specialty: _______________

Re: Patient _______________ (DOB: _______________)

Dear Dr. _______________,

I am referring the above patient for evaluation and management of _______________.

Relevant History:
_______________

Current Medications:
_______________

Thank you for your consultation.

Sincerely,
Dr. _______________', 
     'referral', true, current_user_id, now() - interval '20 days', now() - interval '20 days'),
    
    (template_4_id, 'Discharge Instructions', 'Post-visit discharge instructions template', 
     'DISCHARGE INSTRUCTIONS

Patient: _______________
Date: _______________
Diagnosis: _______________

Instructions:
1. _______________
2. _______________
3. _______________

Medications:
_______________

Follow-up:
_______________

When to call the office:
_______________

Provider: _______________', 
     'discharge', true, current_user_id, now() - interval '15 days', now() - interval '15 days');

    -- Insert Patient Documents
    INSERT INTO public.patient_documents (
        patient_id, template_id, document_name, document_content, document_url, 
        document_type, file_size, is_signed, signed_at, signed_by, user_id, created_at, updated_at
    ) VALUES 
    (patient_1_id, template_1_id, 'Sarah Johnson - Intake Form', 'Completed intake form with patient information', 'https://example.com/docs/sarah_intake.pdf', 'pdf', 245760, true, now() - interval '29 days', 'Sarah Johnson', current_user_id, now() - interval '30 days', now() - interval '29 days'),
    
    (patient_1_id, template_2_id, 'Sarah Johnson - Treatment Consent', 'Signed consent for treatment', 'https://example.com/docs/sarah_consent.pdf', 'pdf', 156432, true, now() - interval '29 days', 'Sarah Johnson', current_user_id, now() - interval '30 days', now() - interval '29 days'),
    
    (patient_2_id, template_1_id, 'Michael Smith - Intake Form', 'Completed intake form', 'https://example.com/docs/michael_intake.pdf', 'pdf', 267890, true, now() - interval '24 days', 'Michael Smith', current_user_id, now() - interval '25 days', now() - interval '24 days'),
    
    (patient_3_id, template_3_id, 'Emily Davis - Orthopedic Referral', 'Referral to orthopedic specialist', 'https://example.com/docs/emily_referral.pdf', 'pdf', 123456, false, null, null, current_user_id, now() - interval '19 days', now() - interval '19 days'),
    
    (patient_4_id, template_4_id, 'Robert Brown - Discharge Instructions', 'Post-visit instructions', 'https://example.com/docs/robert_discharge.pdf', 'pdf', 98765, true, now() - interval '1 day', 'Robert Brown', current_user_id, now() - interval '2 days', now() - interval '1 day'),
    
    (patient_7_id, template_1_id, 'Jessica Garcia - Intake Form', 'New patient intake in progress', null, 'pdf', null, false, null, null, current_user_id, now() - interval '2 days', now() - interval '2 days');

    -- Insert Notifications
    INSERT INTO public.notifications (
        user_id, type, title, message, status, related_table, related_id, 
        scheduled_for, created_at, read_at
    ) VALUES 
    (current_user_id, 'appointment_reminder', 'Upcoming Appointment', 'Sarah Johnson has an appointment in 2 hours', 'unread', 'appointments', appointment_1_id, now() + interval '2 hours', now() - interval '1 hour', null),
    
    (current_user_id, 'preauth_update', 'Prior Authorization Approved', 'MRI scan for Robert Brown has been approved', 'read', 'pre_authorizations', null, null, now() - interval '3 days', now() - interval '2 days'),
    
    (current_user_id, 'eligibility_check', 'Insurance Verification Complete', 'Eligibility verified for Blue Cross Blue Shield patient', 'read', 'insurance_eligibility', null, null, now() - interval '2 days', now() - interval '1 day'),
    
    (current_user_id, 'document_required', 'Document Needs Validation', 'Insurance card for David Martinez requires validation', 'unread', 'intake_tasks', null, null, now() - interval '1 day', null),
    
    (current_user_id, 'system_alert', 'No-Show Alert', 'Linda Wilson marked as no-show for appointment', 'read', 'appointments', appointment_5_id, null, now() - interval '3 days', now() - interval '3 days'),
    
    (current_user_id, 'appointment_reminder', 'Appointment Tomorrow', 'Michael Smith has an appointment tomorrow', 'unread', 'appointments', appointment_2_id, now() + interval '1 day', now() - interval '2 hours', null),
    
    (current_user_id, 'preauth_update', 'Prior Authorization Denied', 'Cardiology consult for James Miller was denied', 'unread', 'pre_authorizations', null, null, now() - interval '2 days', null),
    
    (current_user_id, 'eligibility_check', 'Eligibility Error', 'Error verifying insurance for Jessica Garcia', 'unread', 'insurance_eligibility', null, null, now() - interval '4 hours', null);

    -- Insert Audit Logs with proper JSONB formatting
    INSERT INTO public.audit_logs (
        table_name, record_id, action, old_values, new_values, user_id, created_at
    ) VALUES 
    ('appointments', appointment_5_id, 'UPDATE', 
     jsonb_build_object('status', 'Confirmed'), 
     jsonb_build_object('status', 'No-Show', 'updated_at', (now() - interval '3 days')::text), 
     current_user_id, now() - interval '3 days'),
    
    ('pre_authorizations', gen_random_uuid(), 'UPDATE', 
     jsonb_build_object('status', 'Pending'), 
     jsonb_build_object('status', 'Approved', 'authorization_number', 'AUTH001234', 'updated_at', (now() - interval '3 days')::text), 
     current_user_id, now() - interval '3 days'),
    
    ('patients', patient_7_id, 'INSERT', 
     null, 
     jsonb_build_object('full_name', 'Jessica Garcia', 'phone', '(555) 789-0123', 'email', 'jessica.garcia@email.com'), 
     current_user_id, now() - interval '5 days'),
    
    ('appointments', appointment_8_id, 'UPDATE', 
     jsonb_build_object('status', 'Confirmed'), 
     jsonb_build_object('status', 'Cancelled', 'notes', 'Patient cancelled due to illness', 'updated_at', (now() - interval '5 days')::text), 
     current_user_id, now() - interval '5 days'),
    
    ('insurance_eligibility', gen_random_uuid(), 'INSERT', 
     null, 
     jsonb_build_object('patient_id', patient_1_id::text, 'payer_name', 'Blue Cross Blue Shield', 'status', 'Eligible'), 
     current_user_id, now() - interval '2 days');

    RETURN 'Successfully inserted clinic-wide dummy data: 8 patients, 5 providers, 8 appointments, 6 pre-authorizations, 6 intake tasks, 8 insurance eligibility records, 8 insurance records, 4 document templates, 6 patient documents, 8 notifications, and 5 audit log entries. All data is accessible to all clinic staff.';

EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error inserting dummy data: ' || SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_dummy_data() TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.insert_dummy_data() IS 'Inserts comprehensive dummy data for clinic-wide access. All authenticated users can see and manage all data.';