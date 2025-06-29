# Using the Dummy Data System

## Overview
Your Supabase database already includes a comprehensive dummy data insertion system that creates realistic test data for all tables in your healthcare management system.

## How to Insert Dummy Data

### Method 1: Using the SQL Function (Recommended)
1. **Log into your Supabase dashboard**
2. **Go to the SQL Editor**
3. **Run this command:**
   ```sql
   SELECT public.insert_dummy_data();
   ```

### Method 2: Using the Supabase Client
```javascript
// In your application code
const { data, error } = await supabase.rpc('insert_dummy_data');
console.log(data); // Will show success message
```

## What Data Gets Created

The dummy data function creates:

### 📋 **8 Patients** with complete profiles:
- Sarah Johnson (1985) - Blue Cross Blue Shield
- Michael Smith (1978) - Aetna  
- Emily Davis (1992) - Cigna
- Robert Brown (1965) - UnitedHealthcare
- Linda Wilson (1980) - Humana
- James Miller (1973) - Kaiser Permanente
- Jessica Garcia (1988) - Anthem
- David Martinez (1995) - Medicaid

### 👨‍⚕️ **5 Healthcare Providers:**
- Dr. Amanda Thompson - Family Medicine
- Dr. Richard Chen - Cardiology
- Dr. Maria Rodriguez - Orthopedics
- Dr. Kevin Park - Dermatology
- Dr. Sarah Williams - Pediatrics

### 📅 **8 Appointments** with various statuses:
- Confirmed appointments (upcoming)
- Completed appointments (past)
- Cancelled appointments
- No-show appointments
- Pending appointments

### 🏥 **6 Prior Authorizations:**
- Approved MRI scan
- Pending physical therapy
- Denied cardiology consult
- Submitted orthopedic surgery
- Approved specialist referral
- Pending cardiac catheterization

### 📄 **6 Intake Tasks:**
- OCR pending documents
- Documents needing validation
- Completed intake forms

### 🔍 **8 Insurance Eligibility Records:**
- Various statuses (Eligible, Pending, Ineligible, Error)
- Different insurance companies
- Realistic verification scenarios

### 📋 **8 Insurance Records:**
- Complete insurance information for each patient
- Policy numbers, group numbers, copays, deductibles

### 📄 **4 Document Templates:**
- New Patient Intake Form
- Consent for Treatment
- Referral Letter Template
- Discharge Instructions

### 📑 **6 Patient Documents:**
- Signed intake forms
- Treatment consents
- Referral letters
- Discharge instructions

### 🔔 **8 Notifications:**
- Appointment reminders
- Prior authorization updates
- Eligibility check results
- Document validation alerts

### 📊 **5 Audit Log Entries:**
- Appointment status changes
- Authorization approvals
- Patient record updates

## Data Characteristics

### ✅ **Realistic and Diverse:**
- Different age groups (1965-1995)
- Various insurance companies
- Multiple appointment types and statuses
- Different medical specialties
- Comprehensive contact information

### ✅ **Proper Relationships:**
- All foreign keys properly linked
- Appointments connected to patients and providers
- Insurance records linked to patients
- Documents associated with templates

### ✅ **Time-Based Data:**
- Historical data (past appointments, old records)
- Current data (today's appointments)
- Future data (upcoming appointments)
- Realistic timestamps and intervals

### ✅ **Status Variety:**
- All possible enum values represented
- Edge cases included (no-shows, denials, errors)
- Workflow states covered

## Safety Features

### 🔒 **User Isolation:**
- Data is only created for the authenticated user
- RLS policies ensure data separation
- No cross-user data contamination

### 🛡️ **Duplicate Prevention:**
- Function checks if user already has data
- Prevents accidental duplicate insertion
- Returns informative messages

### ⚡ **Performance Optimized:**
- Single transaction for all inserts
- Proper indexing maintained
- Statistics updated after insertion

## Verification

After running the function, you can verify the data was created:

```sql
-- Check patient count
SELECT COUNT(*) FROM patients WHERE user_id = auth.uid();

-- Check appointments
SELECT COUNT(*) FROM appointments WHERE user_id = auth.uid();

-- Check all tables
SELECT 
  'patients' as table_name, COUNT(*) as record_count 
FROM patients WHERE user_id = auth.uid()
UNION ALL
SELECT 'providers', COUNT(*) FROM providers WHERE user_id = auth.uid()
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments WHERE user_id = auth.uid()
UNION ALL
SELECT 'pre_authorizations', COUNT(*) FROM pre_authorizations WHERE user_id = auth.uid();
```

## Troubleshooting

### If the function returns an error:
1. **Ensure you're authenticated** - The function requires a valid user session
2. **Check RLS policies** - Make sure your user has proper permissions
3. **Verify schema** - Ensure all migrations have been applied

### If you need to reset the data:
```sql
-- Delete all data for current user (be careful!)
DELETE FROM patient_documents WHERE user_id = auth.uid();
DELETE FROM notifications WHERE user_id = auth.uid();
DELETE FROM audit_logs WHERE user_id = auth.uid();
DELETE FROM appointments_providers WHERE user_id = auth.uid();
DELETE FROM intake_tasks WHERE user_id = auth.uid();
DELETE FROM insurance_eligibility WHERE user_id = auth.uid();
DELETE FROM patient_insurance WHERE user_id = auth.uid();
DELETE FROM appointments WHERE user_id = auth.uid();
DELETE FROM pre_authorizations WHERE user_id = auth.uid();
DELETE FROM document_templates WHERE user_id = auth.uid();
DELETE FROM providers WHERE user_id = auth.uid();
DELETE FROM patients WHERE user_id = auth.uid();

-- Then run the insert function again
SELECT public.insert_dummy_data();
```

## Next Steps

Once you have the dummy data:

1. **Test your dashboard** - All cards should show realistic data
2. **Verify filtering** - Check that RLS is working properly
3. **Test CRUD operations** - Try creating, updating, and deleting records
4. **Check relationships** - Ensure joins and foreign keys work correctly
5. **Test edge cases** - Use the variety of statuses and scenarios provided

The dummy data is designed to provide comprehensive test coverage for your healthcare management system!