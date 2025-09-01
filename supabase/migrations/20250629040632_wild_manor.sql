/*
  # Add Notification Seed Data

  1. New Data
    - Adds sample notifications for demonstration purposes
    - Creates different notification types and statuses
    - Links notifications to existing users
*/

-- Insert sample notifications for the first user
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user from the users table
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  -- Only proceed if we found a user
  IF first_user_id IS NOT NULL THEN
    -- Insert appointment reminder notifications
    INSERT INTO notifications (user_id, type, title, message, status, created_at)
    VALUES
      (first_user_id, 'appointment_reminder', 'Upcoming Appointment', 'You have an appointment with Dr. Smith tomorrow at 10:00 AM.', 'unread', now() - interval '1 hour'),
      (first_user_id, 'appointment_reminder', 'Appointment Confirmation', 'Your appointment with Dr. Johnson has been confirmed for Friday at 2:30 PM.', 'unread', now() - interval '3 hours');
    
    -- Insert document required notifications
    INSERT INTO notifications (user_id, type, title, message, status, created_at)
    VALUES
      (first_user_id, 'document_required', 'Insurance Card Needed', 'Please upload a copy of Sarah Johnson''s updated insurance card.', 'unread', now() - interval '5 hours'),
      (first_user_id, 'document_required', 'Medical History Form', 'New patient Michael Smith needs to complete his medical history form.', 'read', now() - interval '2 days');
    
    -- Insert eligibility check notifications
    INSERT INTO notifications (user_id, type, title, message, status, created_at)
    VALUES
      (first_user_id, 'eligibility_check', 'Eligibility Verified', 'Insurance eligibility for Emily Davis has been verified successfully.', 'read', now() - interval '3 days'),
      (first_user_id, 'eligibility_check', 'Eligibility Issue', 'There was a problem verifying insurance for Robert Brown. Please review.', 'read', now() - interval '4 days');
    
    -- Insert preauth update notifications
    INSERT INTO notifications (user_id, type, title, message, status, created_at)
    VALUES
      (first_user_id, 'preauth_update', 'Authorization Approved', 'Prior authorization for Linda Wilson''s MRI has been approved.', 'unread', now() - interval '6 hours'),
      (first_user_id, 'preauth_update', 'Authorization Denied', 'Prior authorization for James Miller''s procedure was denied. Additional information required.', 'archived', now() - interval '5 days');
    
    -- Insert system alert notifications
    INSERT INTO notifications (user_id, type, title, message, status, created_at)
    VALUES
      (first_user_id, 'system_alert', 'System Maintenance', 'The system will be undergoing maintenance tonight from 2:00 AM to 4:00 AM.', 'read', now() - interval '1 day'),
      (first_user_id, 'system_alert', 'New Feature Available', 'Check out our new Smart Scheduling feature with AI-powered no-show prediction!', 'archived', now() - interval '7 days');
  END IF;
END $$;