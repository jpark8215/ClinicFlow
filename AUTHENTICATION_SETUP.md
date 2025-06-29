# How to Insert Dummy Data - Authentication Required

## The Issue
The error "No authenticated user found. Please log in first" occurs because the dummy data function requires an authenticated user session. This is by design for security - it ensures data is only created for the logged-in user.

## Solution: Log In First

### Step 1: Start Your Application
```bash
npm run dev
```

### Step 2: Sign Up or Sign In
1. Go to `http://localhost:8080`
2. You'll be redirected to the authentication page
3. Either:
   - **Sign up** with a new email/password
   - **Sign in** with existing credentials

### Step 3: Insert Dummy Data via Application
Once logged in, you can insert dummy data in several ways:

#### Option A: Using Browser Console (Easiest)
1. Open browser developer tools (F12)
2. Go to the Console tab
3. Run this code:
```javascript
// Import the supabase client (it's already available in the app)
const { data, error } = await window.supabase.rpc('insert_dummy_data');
if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
  window.location.reload(); // Refresh to see the data
}
```

#### Option B: Add a Button to Your App
Add this to your dashboard component temporarily:

```typescript
// Add this to src/pages/Index.tsx
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Inside your component:
const { toast } = useToast();

const insertDummyData = async () => {
  try {
    const { data, error } = await supabase.rpc('insert_dummy_data');
    if (error) throw error;
    
    toast({
      title: "Success!",
      description: data,
    });
    
    // Refresh the page to see new data
    window.location.reload();
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};

// Add this button to your JSX:
<Button onClick={insertDummyData}>Insert Dummy Data</Button>
```

#### Option C: Using Supabase Dashboard (Advanced)
1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Copy your user ID
4. Go to SQL Editor
5. Run this modified query:
```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
SET session.user_id = 'YOUR_USER_ID_HERE';
SELECT public.insert_dummy_data();
```

## Why Authentication is Required

The dummy data function is designed with security in mind:

1. **Data Isolation**: Each user gets their own data set
2. **RLS Compliance**: Respects Row Level Security policies
3. **No Cross-Contamination**: Users can't see each other's data
4. **Realistic Testing**: Mimics real-world usage patterns

## What Happens After Authentication

Once you're logged in and run the function, you'll get:

- ✅ 8 realistic patients with full profiles
- ✅ 5 healthcare providers across different specialties  
- ✅ 8 appointments with various statuses and times
- ✅ 6 prior authorization requests in different states
- ✅ 6 intake tasks for document processing
- ✅ 8 insurance eligibility records
- ✅ Complete insurance information for all patients
- ✅ Document templates and patient documents
- ✅ Notifications and audit logs

## Verification

After inserting data, your dashboard should immediately show:

- **Today's Appointments** card with real appointments
- **Prior Authorizations** card with actual requests
- **Intake Automation Queue** with pending tasks
- **Insurance Eligibility** card with verification results
- **No-Show Risk Forecast** chart with data

## Troubleshooting

### If you still get authentication errors:
1. **Clear browser cache** and try again
2. **Sign out and sign back in**
3. **Check browser console** for any JavaScript errors
4. **Verify your .env file** has correct Supabase credentials

### If the function says "User already has data":
This means dummy data was already inserted. The function prevents duplicates for safety.

### If you need to reset and try again:
You can delete your data first (be careful!):
```javascript
// In browser console, after logging in:
const tables = [
  'patient_documents', 'notifications', 'audit_logs', 
  'appointments_providers', 'intake_tasks', 'insurance_eligibility',
  'patient_insurance', 'appointments', 'pre_authorizations',
  'document_templates', 'providers', 'patients'
];

for (const table of tables) {
  await window.supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

// Then insert dummy data
const { data, error } = await window.supabase.rpc('insert_dummy_data');
console.log(data);
```

## Next Steps

Once you have dummy data:
1. **Explore the dashboard** - All cards should show real data
2. **Test functionality** - Try creating new appointments, patients, etc.
3. **Verify RLS** - Make sure you only see your own data
4. **Test the application** - Use it as a real user would

The authentication requirement ensures your testing environment is secure and realistic!