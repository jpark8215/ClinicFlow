/*
  # Insert Comprehensive Dummy Data

  1. Purpose
    - Populate all tables with realistic sample data
    - Create data that demonstrates all features of the clinic system
    - Ensure data relationships are properly maintained

  2. Data Created
    - 10 sample patients with complete demographics
    - 5 healthcare providers across different specialties
    - 15 appointments (past, present, and future)
    - 5 prior authorization requests in various states
    - 7 insurance eligibility records
    - 6 intake automation tasks
    - 5 patient insurance records
    - 5 system notifications
    - Provider-appointment relationships

  3. Data Visibility
    - All data will be visible to all authenticated users
    - Data is created by the current user but shared clinic-wide
    - Demonstrates the global access model
*/

-- Execute the dummy data insertion function
SELECT insert_dummy_data();