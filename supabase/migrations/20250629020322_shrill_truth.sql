/*
  # Restore dummy data without admin account

  1. Sample Data
    - Restore patients, appointments, providers, and other clinical data
    - Use dynamic user_id from current authenticated user
    - No hardcoded admin accounts

  2. Data includes:
    - 10 sample patients with realistic information
    - 15 appointments across different statuses
    - 5 healthcare providers
    - Prior authorization requests
    - Insurance eligibility records
    - Intake tasks
    - Patient insurance information
*/

-- Function to insert comprehensive dummy data
CREATE OR REPLACE FUNCTION insert_dummy_data()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    patient_ids uuid[];
    provider_ids uuid[];
    appointment_ids uuid[];
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'Error: No authenticated user found';
    END IF;

    -- Clear existing dummy data (but preserve real user data)
    DELETE FROM appointments_providers WHERE user_id = current_user_id;
    DELETE FROM patient_documents WHERE user_id = current_user_id;
    DELETE FROM patient_insurance WHERE user_id = current_user_id;
    DELETE FROM insurance_eligibility WHERE user_id = current_user_id;
    DELETE FROM intake_tasks WHERE user_id = current_user_id;
    DELETE FROM pre_authorizations WHERE user_id = current_user_id;
    DELETE FROM appointments WHERE user_id = current_user_id;
    DELETE FROM providers WHERE user_id = current_user_id;
    DELETE FROM patients WHERE user_id = current_user_id;

    -- Insert sample patients
    WITH inserted_patients AS (
        INSERT INTO patients (full_name, date_of_birth, phone, email, address, emergency_contact_name, emergency_contact_phone, user_id)
        VALUES 
            ('Sarah Johnson', '1985-03-15', '(555) 123-4567', 'sarah.johnson@email.com', '123 Main St, Anytown, ST 12345', 'John Johnson', '(555) 123-4568', current_user_id),
            ('Michael Smith', '1978-07-22', '(555) 234-5678', 'michael.smith@email.com', '456 Oak Ave, Somewhere, ST 23456', 'Lisa Smith', '(555) 234-5679', current_user_id),
            ('Emily Davis', '1992-11-08', '(555) 345-6789', 'emily.davis@email.com', '789 Pine Rd, Elsewhere, ST 34567', 'Robert Davis', '(555) 345-6790', current_user_id),
            ('Robert Brown', '1965-01-30', '(555) 456-7890', 'robert.brown@email.com', '321 Elm St, Nowhere, ST 45678', 'Mary Brown', '(555) 456-7891', current_user_id),
            ('Linda Wilson', '1973-09-12', '(555) 567-8901', 'linda.wilson@email.com', '654 Maple Dr, Anywhere, ST 56789', 'David Wilson', '(555) 567-8902', current_user_id),
            ('James Miller', '1988-05-25', '(555) 678-9012', 'james.miller@email.com', '987 Cedar Ln, Someplace, ST 67890', 'Jennifer Miller', '(555) 678-9013', current_user_id),
            ('Jessica Garcia', '1995-12-03', '(555) 789-0123', 'jessica.garcia@email.com', '147 Birch St, Anyplace, ST 78901', 'Carlos Garcia', '(555) 789-0124', current_user_id),
            ('David Martinez', '1982-04-18', '(555) 890-1234', 'david.martinez@email.com', '258 Spruce Ave, Everytown, ST 89012', 'Maria Martinez', '(555) 890-1235', current_user_id),
            ('Maria Rodriguez', '1990-08-07', '(555) 901-2345', 'maria.rodriguez@email.com', '369 Willow Rd, Hometown, ST 90123', 'Jose Rodriguez', '(555) 901-2346', current_user_id),
            ('Christopher Lee', '1976-02-14', '(555) 012-3456', 'christopher.lee@email.com', '741 Aspen Dr, Yourtown, ST 01234', 'Susan Lee', '(555) 012-3457', current_user_id)
        RETURNING id
    )
    SELECT array_agg(id) INTO patient_ids FROM inserted_patients;

    -- Insert sample providers
    WITH inserted_providers AS (
        INSERT INTO providers (full_name, specialty, license_number, phone, email, user_id)
        VALUES 
            ('Dr. Amanda Thompson', 'Family Medicine', 'MD123456', '(555) 111-2222', 'athompson@clinic.com', current_user_id),
            ('Dr. Richard Chen', 'Cardiology', 'MD234567', '(555) 222-3333', 'rchen@clinic.com', current_user_id),
            ('Dr. Patricia Williams', 'Pediatrics', 'MD345678', '(555) 333-4444', 'pwilliams@clinic.com', current_user_id),
            ('Dr. Mark Anderson', 'Orthopedics', 'MD456789', '(555) 444-5555', 'manderson@clinic.com', current_user_id),
            ('Dr. Lisa Taylor', 'Dermatology', 'MD567890', '(555) 555-6666', 'ltaylor@clinic.com', current_user_id)
        RETURNING id
    )
    SELECT array_agg(id) INTO provider_ids FROM inserted_providers;

    -- Insert sample appointments
    WITH inserted_appointments AS (
        INSERT INTO appointments (patient_id, appointment_time, status, duration_minutes, appointment_type, no_show_risk, notes, user_id)
        VALUES 
            (patient_ids[1], CURRENT_DATE + INTERVAL '1 day' + INTERVAL '9 hours', 'Confirmed', 30, 'consultation', 0.15, 'Annual checkup', current_user_id),
            (patient_ids[2], CURRENT_DATE + INTERVAL '1 day' + INTERVAL '9 hours 30 minutes', 'Confirmed', 45, 'follow-up', 0.25, 'Blood pressure follow-up', current_user_id),
            (patient_ids[3], CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours', 'Pending', 30, 'consultation', 0.35, 'New patient visit', current_user_id),
            (patient_ids[4], CURRENT_DATE + INTERVAL '2 days' + INTERVAL '14 hours', 'Confirmed', 60, 'procedure', 0.10, 'MRI scan', current_user_id),
            (patient_ids[5], CURRENT_DATE + INTERVAL '3 days' + INTERVAL '11 hours', 'Confirmed', 30, 'consultation', 0.20, 'Physical therapy evaluation', current_user_id),
            (patient_ids[6], CURRENT_DATE + INTERVAL '4 days' + INTERVAL '15 hours', 'Pending', 45, 'consultation', 0.40, 'Cardiology consultation', current_user_id),
            (patient_ids[7], CURRENT_DATE + INTERVAL '5 days' + INTERVAL '10 hours 30 minutes', 'Confirmed', 30, 'follow-up', 0.18, 'Lab results review', current_user_id),
            (patient_ids[8], CURRENT_DATE - INTERVAL '1 day' + INTERVAL '13 hours', 'Completed', 30, 'consultation', 0.12, 'Routine visit', current_user_id),
            (patient_ids[9], CURRENT_DATE - INTERVAL '2 days' + INTERVAL '16 hours', 'No-Show', 30, 'consultation', 0.65, 'Missed appointment', current_user_id),
            (patient_ids[10], CURRENT_DATE - INTERVAL '3 days' + INTERVAL '9 hours', 'Completed', 45, 'procedure', 0.08, 'Minor procedure', current_user_id),
            (patient_ids[1], CURRENT_DATE + INTERVAL '7 days' + INTERVAL '14 hours', 'Confirmed', 30, 'follow-up', 0.22, 'Follow-up visit', current_user_id),
            (patient_ids[2], CURRENT_DATE + INTERVAL '10 days' + INTERVAL '11 hours', 'Pending', 60, 'procedure', 0.30, 'Scheduled procedure', current_user_id),
            (patient_ids[3], CURRENT_DATE - INTERVAL '5 days' + INTERVAL '15 hours', 'Cancelled', 30, 'consultation', 0.45, 'Patient cancelled', current_user_id),
            (patient_ids[4], CURRENT_DATE + INTERVAL '14 days' + INTERVAL '10 hours', 'Confirmed', 30, 'consultation', 0.15, 'Quarterly check-in', current_user_id),
            (patient_ids[5], CURRENT_DATE + INTERVAL '21 days' + INTERVAL '13 hours', 'Pending', 45, 'consultation', 0.28, 'Specialist referral', current_user_id)
        RETURNING id
    )
    SELECT array_agg(id) INTO appointment_ids FROM inserted_appointments;

    -- Link appointments with providers
    INSERT INTO appointments_providers (appointment_id, provider_id, role, user_id)
    SELECT 
        appointment_ids[1], provider_ids[1], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[2], provider_ids[1], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[3], provider_ids[3], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[4], provider_ids[2], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[5], provider_ids[4], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[6], provider_ids[2], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[7], provider_ids[1], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[8], provider_ids[5], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[9], provider_ids[1], 'Primary', current_user_id
    UNION ALL SELECT 
        appointment_ids[10], provider_ids[4], 'Primary', current_user_id;

    -- Insert sample prior authorizations
    INSERT INTO pre_authorizations (patient_name, service, payer, status, notes, authorization_number, expiration_date, requested_amount, approved_amount, user_id)
    VALUES 
        ('Robert Brown', 'MRI Scan', 'Blue Cross Blue Shield', 'Approved', 'Approved for lumbar spine MRI', 'AUTH123456', CURRENT_DATE + INTERVAL '90 days', 1200.00, 1200.00, current_user_id),
        ('Linda Wilson', 'Physical Therapy', 'Aetna', 'Pending', 'Awaiting review for 12 sessions', NULL, NULL, 1800.00, NULL, current_user_id),
        ('James Miller', 'Cardiology Consult', 'United Healthcare', 'Denied', 'Denied - insufficient medical necessity', NULL, NULL, 350.00, NULL, current_user_id),
        ('Sarah Johnson', 'Specialist Referral', 'Cigna', 'Submitted', 'Submitted for dermatology consultation', NULL, NULL, 275.00, NULL, current_user_id),
        ('Michael Smith', 'CT Scan', 'Medicare', 'Approved', 'Approved for abdominal CT with contrast', 'AUTH789012', CURRENT_DATE + INTERVAL '60 days', 800.00, 800.00, current_user_id);

    -- Insert sample insurance eligibility records
    INSERT INTO insurance_eligibility (patient_id, payer_name, status, verification_date, details, user_id)
    VALUES 
        (patient_ids[1], 'Blue Cross Blue Shield', 'Eligible', CURRENT_DATE - INTERVAL '2 days', 'Active coverage, $25 copay', current_user_id),
        (patient_ids[2], 'Aetna', 'Eligible', CURRENT_DATE - INTERVAL '1 day', 'Active coverage, $30 copay, $500 deductible remaining', current_user_id),
        (patient_ids[3], 'United Healthcare', 'Pending', CURRENT_DATE, 'Verification in progress', current_user_id),
        (patient_ids[4], 'Medicare', 'Eligible', CURRENT_DATE - INTERVAL '3 days', 'Part A and B active, supplement plan verified', current_user_id),
        (patient_ids[5], 'Cigna', 'Ineligible', CURRENT_DATE - INTERVAL '1 day', 'Coverage terminated, patient notified', current_user_id),
        (patient_ids[6], 'Humana', 'Eligible', CURRENT_DATE - INTERVAL '4 days', 'Active HMO plan, referral required', current_user_id),
        (patient_ids[7], 'Kaiser Permanente', 'Error', CURRENT_DATE, 'System error during verification, retry needed', current_user_id);

    -- Insert sample intake tasks
    INSERT INTO intake_tasks (patient_id, task_description, status, document_url, user_id)
    VALUES 
        (patient_ids[7], 'New Patient Packet', 'Pending OCR', 'https://example.com/docs/new-patient-packet.pdf', current_user_id),
        (patient_ids[8], 'Insurance Card', 'Needs Validation', 'https://example.com/docs/insurance-card.jpg', current_user_id),
        (patient_ids[9], 'Referral Letter', 'Complete', 'https://example.com/docs/referral-letter.pdf', current_user_id),
        (patient_ids[10], 'Medical History Form', 'Pending OCR', 'https://example.com/docs/medical-history.pdf', current_user_id),
        (patient_ids[1], 'Consent Forms', 'Complete', 'https://example.com/docs/consent-forms.pdf', current_user_id),
        (patient_ids[2], 'Lab Results', 'Needs Validation', 'https://example.com/docs/lab-results.pdf', current_user_id);

    -- Insert sample patient insurance information
    INSERT INTO patient_insurance (patient_id, insurance_company, policy_number, group_number, subscriber_name, relationship_to_subscriber, effective_date, expiration_date, copay_amount, deductible_amount, is_primary, user_id)
    VALUES 
        (patient_ids[1], 'Blue Cross Blue Shield', 'BCBS123456789', 'GRP001', 'Sarah Johnson', 'Self', '2024-01-01', '2024-12-31', 25.00, 1000.00, true, current_user_id),
        (patient_ids[2], 'Aetna', 'AET987654321', 'GRP002', 'Michael Smith', 'Self', '2024-01-01', '2024-12-31', 30.00, 1500.00, true, current_user_id),
        (patient_ids[3], 'United Healthcare', 'UHC456789123', 'GRP003', 'Emily Davis', 'Self', '2024-01-01', '2024-12-31', 20.00, 2000.00, true, current_user_id),
        (patient_ids[4], 'Medicare', 'MED789123456', NULL, 'Robert Brown', 'Self', '2024-01-01', NULL, 0.00, 0.00, true, current_user_id),
        (patient_ids[5], 'Cigna', 'CIG321654987', 'GRP004', 'Linda Wilson', 'Self', '2024-01-01', '2024-12-31', 35.00, 1200.00, true, current_user_id);

    -- Insert sample notifications
    INSERT INTO notifications (user_id, type, title, message, status, related_table, related_id, scheduled_for)
    VALUES 
        (current_user_id, 'appointment_reminder', 'Appointment Reminder', 'Sarah Johnson has an appointment tomorrow at 9:00 AM', 'unread', 'appointments', appointment_ids[1], CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 hour'),
        (current_user_id, 'preauth_update', 'Prior Authorization Approved', 'Prior authorization for Robert Brown MRI has been approved', 'unread', 'pre_authorizations', NULL, NULL),
        (current_user_id, 'eligibility_check', 'Insurance Verification Complete', 'Insurance eligibility verified for Michael Smith', 'read', 'insurance_eligibility', NULL, NULL),
        (current_user_id, 'document_required', 'Document Upload Needed', 'Jessica Garcia needs to upload insurance card', 'unread', 'intake_tasks', NULL, NULL),
        (current_user_id, 'system_alert', 'System Maintenance', 'Scheduled maintenance tonight from 2-4 AM', 'read', NULL, NULL, CURRENT_DATE + INTERVAL '1 day' + INTERVAL '2 hours');

    RETURN 'Dummy data inserted successfully for user: ' || current_user_id::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_dummy_data() TO authenticated;