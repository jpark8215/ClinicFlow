# ClinicFlow - AI-Powered Clinical Operations

Welcome to ClinicFlow, a comprehensive web application designed to streamline clinical operations using AI and automation. This project was bootstrapped with Lovable and powered by Supabase.

## 🚀 Recent Updates & Changes

### **Latest Features (January 2025)**
- **📋 Prior Authorization Management**: Complete prior authorization workflow with status tracking, financial details, and payer integration
- **🛡️ Insurance Eligibility Verification**: Real-time insurance coverage verification with detailed status tracking and re-verification capabilities
- **📄 Intake Automation Queue**: Document processing pipeline with OCR simulation, validation workflows, and task management
- **📅 Comprehensive Appointments System**: Full appointment management with detailed views, status tracking, and scheduling
- **➕ Add New Appointment**: Complete appointment creation with patient selection, provider assignment, and scheduling
- **📊 Today's Appointments Page**: Detailed view of daily appointments with statistics, filtering, and management tools
- **✨ User Settings System**: Comprehensive settings page with profile management, security controls, and notification preferences
- **🎨 Simplified Header Design**: Consistent "ClinicFlow" branding across all pages with improved navigation
- **🔧 Enhanced Navigation**: Easy dashboard access from any page with improved user experience
- **🔐 Password Management**: Secure password change functionality with validation
- **🔔 Notification Preferences**: Granular control over email notifications, appointment reminders, and system alerts
- **👤 Profile Management**: User profile updates with real-time synchronization
- **📱 Fully Responsive Design**: All pages optimized for mobile, tablet, and desktop devices

### **Prior Authorization Features**
- **📋 Authorization Creation**: Full-featured prior auth request creation with:
  - Patient name and insurance payer selection
  - Service/procedure specification
  - Requested and approved amount tracking
  - Medical justification notes
  - Authorization number and expiration date management
- **📈 Real-time Statistics**: Live dashboard showing authorization counts by status
- **🔍 Advanced Filtering**: Search and filter by patient, service, payer, or authorization number
- **📱 Detailed View Modal**: Complete authorization information including:
  - Patient and payer details
  - Financial information (requested vs approved amounts)
  - Timeline tracking (created, updated, expiration)
  - Status management with quick actions
- **⚡ Quick Actions**: Status updates, editing, and authorization management
- **🎯 Status Tracking**: Visual indicators for Pending, Submitted, Approved, and Denied statuses

### **Insurance Eligibility Features**
- **🛡️ Eligibility Verification**: Comprehensive insurance verification with:
  - Patient selection from existing database
  - Insurance payer specification
  - Coverage details and notes
  - Real-time verification status tracking
- **📊 Verification Dashboard**: Live statistics showing eligibility counts by status
- **🔄 Re-verification**: One-click re-verification for updated coverage information
- **📋 Detailed Coverage Info**: Complete eligibility information including:
  - Patient contact details
  - Insurance payer information
  - Verification dates and status history
  - Coverage details and limitations
- **⚡ Status Management**: Quick status updates for Eligible, Ineligible, Pending, and Error states
- **🔍 Advanced Search**: Filter by patient name, payer, or coverage details

### **Intake Automation Features**
- **📄 Document Processing**: Automated intake workflow with:
  - Patient document upload and tracking
  - OCR processing simulation
  - Validation workflow management
  - Task completion tracking
- **📈 Processing Statistics**: Live dashboard showing task counts by processing stage
- **🔍 Task Management**: Advanced filtering and search capabilities
- **📱 Document Viewer**: Integrated document viewing and download functionality
- **⚡ Workflow Actions**: OCR processing, validation marking, and completion tracking
- **🎯 Status Pipeline**: Visual indicators for Pending OCR, Needs Validation, and Complete statuses

### **Appointment Management Features**
- **📋 Appointment Creation**: Full-featured appointment scheduling with:
  - Patient selection from existing database
  - Date and time picker with available slots
  - Duration and appointment type selection
  - Healthcare provider assignment
  - Notes and special instructions
- **📈 Real-time Statistics**: Live dashboard showing appointment counts by status
- **🔍 Advanced Filtering**: Search and filter appointments by patient name, status, type, or notes
- **📱 Detailed View Modal**: Complete appointment information including:
  - Patient contact details and address
  - Provider information and specialties
  - Risk assessment and status tracking
  - Quick action buttons for status updates
- **⚡ Quick Actions**: Status updates, reminder sending, and appointment management
- **🎯 No-Show Risk Assessment**: Visual indicators for appointment risk levels

### **UI/UX Improvements**
- **Consistent Branding**: "ClinicFlow" logo prominently displayed in header across all pages
- **Streamlined Navigation**: Removed dynamic page titles for cleaner, more consistent experience
- **Settings Integration**: Dedicated settings page accessible from both sidebar and user dropdown
- **Dashboard Quick Access**: Easy return to main dashboard from any page
- **Responsive Design**: Optimized for all device sizes with mobile-first approach
- **Loading States**: Skeleton loaders for smooth user experience
- **Error Handling**: Graceful error messages and retry options
- **Touch Optimization**: Larger touch targets and proper spacing on mobile devices
- **Visual Consistency**: Consistent spacing, typography, and color schemes across all pages

## 📋 Project Overview

ClinicFlow aims to be a comprehensive solution for healthcare providers, featuring:

- **📋 Prior Authorization**: Automated system for handling prior authorizations with payers
- **📅 Smart Scheduling**: Intelligent appointment scheduler with forecasting capabilities  
- **📄 Intake Automation**: Tool to digitize patient intake forms using OCR and integrate with EHRs
- **🎯 No-Show Assistant**: Predictive model to mitigate patient no-shows and optimize calendar availability
- **👥 Patient Management**: Comprehensive patient records and insurance tracking
- **🔍 Insurance Eligibility**: Real-time verification of patient insurance coverage

## 🏗️ Current Implementation Status

### **✅ Completed Features**
- **Dashboard**: Central hub with real-time metrics and task overview
- **Authentication System**: Secure login/signup with Supabase Auth
- **Prior Authorization Management**: Complete workflow for authorization requests and tracking
- **Insurance Eligibility Verification**: Real-time coverage verification with detailed status management
- **Intake Automation Queue**: Document processing pipeline with OCR and validation workflows
- **Appointment Management**: Complete appointment scheduling and management system
- **Today's Appointments**: Comprehensive daily appointment view with statistics and filtering
- **User Settings**: Complete profile and preference management
- **Database Integration**: Full Supabase integration with RLS policies
- **Responsive UI**: Modern design with shadcn/ui components optimized for all devices
- **Navigation System**: Intuitive sidebar and header navigation

### **🚧 In Development**
- Smart Scheduling interface with calendar view
- Advanced reporting and analytics
- Patient management pages with comprehensive records
- Document templates and automated form generation

## 🛠️ Tech Stack

### **Frontend**
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **React Router** - Client-side routing
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **React Query** - Data fetching and caching
- **Recharts** - Data visualization
- **Lucide React** - Beautiful icons
- **date-fns** - Date manipulation and formatting

### **Backend & Database**
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL** - Robust relational database
- **Row Level Security (RLS)** - Database-level security
- **Real-time subscriptions** - Live data updates
- **Edge Functions** - Serverless functions (ready for future use)

### **Development Tools**
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🗄️ Supabase Integration

### **Database Architecture**

ClinicFlow uses a comprehensive PostgreSQL database hosted on Supabase with the following key tables:

#### **Core Tables**
```sql
-- User Management
users                 -- User profiles and basic information
user_preferences      -- Notification and app preferences

-- Patient Management  
patients              -- Patient records and contact information
patient_insurance     -- Insurance coverage details
patient_documents     -- Document storage and management

-- Appointment System
appointments          -- Appointment scheduling and tracking
appointments_providers -- Many-to-many provider relationships
providers             -- Healthcare provider information

-- Clinical Operations
pre_authorizations    -- Prior authorization requests and status
insurance_eligibility -- Insurance verification records
intake_tasks          -- Document processing and validation tasks

-- System Features
notifications         -- User notifications and alerts
document_templates    -- Reusable document templates
audit_logs           -- System audit trail
```

#### **Database Enums**
```sql
appointment_status    -- Confirmed, Pending, Cancelled, Completed, No-Show
preauth_status       -- Pending, Approved, Denied, Submitted  
eligibility_status   -- Eligible, Ineligible, Pending, Error
intake_status        -- Pending OCR, Needs Validation, Complete
notification_type    -- appointment_reminder, preauth_update, etc.
notification_status  -- unread, read, archived
```

### **Security Implementation**

#### **Row Level Security (RLS)**
All tables implement comprehensive RLS policies:

```sql
-- Example: Patients table policies
CREATE POLICY "Clinic staff can view all patients" 
  ON patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Clinic staff can insert patients" 
  ON patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clinic staff can update own patients" 
  ON patients FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

#### **Authentication Features**
- **Email/Password Authentication** - Secure user registration and login
- **Session Management** - Automatic session handling
- **Password Reset** - Secure password recovery (ready for implementation)
- **Email Verification** - Account verification system
- **User Metadata** - Extended user profile information

### **Database Functions & Triggers**

#### **Automated Timestamp Updates**
```sql
-- Example: Auto-update timestamps
CREATE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **User Management**
```sql
-- Automatic user profile creation
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **Dummy Data Generation**
```sql
-- Comprehensive test data insertion
CREATE FUNCTION insert_dummy_data()
RETURNS text AS $$
-- Inserts realistic test data for development and demo purposes
-- Includes patients, appointments, providers, authorizations, etc.
$$;
```

### **Real-time Features**

#### **Live Data Updates**
- **Appointment Changes** - Real-time appointment status updates
- **Authorization Updates** - Live prior authorization status changes
- **Eligibility Changes** - Real-time insurance verification updates
- **Intake Progress** - Live document processing status updates
- **Notification System** - Instant notification delivery
- **Dashboard Metrics** - Live dashboard data refresh

#### **Subscription Examples**
```typescript
// Real-time appointment updates
const subscription = supabase
  .channel('appointments')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'appointments' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe();
```

### **Environment Configuration**

#### **Required Environment Variables**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### **Supabase Client Setup**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

### **Type Safety**

#### **Generated TypeScript Types**
```typescript
// Auto-generated from database schema
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T];

// Usage examples
type Patient = Tables<'patients'>;
type AppointmentStatus = Enums<'appointment_status'>;
type PreauthStatus = Enums<'preauth_status'>;
type EligibilityStatus = Enums<'eligibility_status'>;
type IntakeStatus = Enums<'intake_status'>;
```

### **Migration System**

#### **Database Migrations**
- **Version Control** - All schema changes tracked in migrations
- **Rollback Support** - Safe database updates with rollback capability
- **Environment Sync** - Consistent schema across development/production

#### **Migration Examples**
```sql
-- 20250629001255_create_patients.sql
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm
- Supabase account and project

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clinicflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Supabase URL and anon key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open `http://localhost:8080`
   - Create an account or sign in
   - Explore the dashboard and features

### **Database Setup**

1. **Create Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Run Migrations**
   ```bash
   # Migrations are automatically applied
   # Or manually run via Supabase dashboard
   ```

3. **Insert Demo Data**
   ```sql
   -- Run in Supabase SQL editor
   SELECT insert_dummy_data();
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── appointments/      # Appointment-specific components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard-specific cards and widgets
│   ├── layout/            # Layout components (Sidebar, Header)
│   └── ui/                # Reusable UI components (shadcn/ui)
├── integrations/
│   └── supabase/          # Supabase client and type definitions
├── lib/
│   ├── dummy-data.ts      # Sample data for development
│   └── utils.ts           # Utility functions
├── pages/
│   ├── Auth.tsx           # Authentication page
│   ├── Index.tsx          # Main dashboard
│   ├── Settings.tsx       # User settings page
│   ├── TodaysAppointments.tsx # Today's appointments page
│   ├── PriorAuthorization.tsx # Prior authorization management
│   ├── InsuranceEligibility.tsx # Insurance eligibility verification
│   ├── Intake.tsx         # Intake automation queue
│   └── [Feature].tsx      # Feature-specific pages
├── types/
│   └── index.ts           # TypeScript type definitions
├── hooks/                 # Custom React hooks
├── App.tsx                # Main application component
└── main.tsx               # Application entry point

supabase/
├── migrations/            # Database migration files
└── config.toml           # Supabase configuration
```

## 🎯 Key Features Deep Dive

### **Prior Authorization Management**

#### **Create Authorization Request**
- **Patient Information**: Enter patient name and select insurance payer
- **Service Details**: Specify medical service or procedure requiring authorization
- **Financial Tracking**: Track requested amounts and approved amounts
- **Medical Justification**: Add detailed notes for medical necessity
- **Status Management**: Track authorization through Pending → Submitted → Approved/Denied workflow

#### **Authorization Dashboard**
- **Real-time Statistics**: Live counts by authorization status
- **Advanced Search**: Filter by patient name, service, payer, or authorization number
- **Status Filtering**: View authorizations by status (All, Pending, Submitted, Approved, Denied)
- **Quick Actions**: Status updates, editing, and authorization management

#### **Authorization Details**
- **Complete Information**: Patient details, service information, and payer data
- **Financial Overview**: Requested vs approved amounts with clear visualization
- **Timeline Tracking**: Creation date, submission date, and expiration tracking
- **Action Management**: Quick status changes and authorization updates

### **Insurance Eligibility Verification**

#### **Eligibility Verification**
- **Patient Selection**: Choose from existing patients with contact info display
- **Payer Integration**: Support for major insurance providers
- **Coverage Details**: Track specific coverage information and limitations
- **Real-time Status**: Live verification status with detailed results

#### **Verification Dashboard**
- **Live Statistics**: Real-time counts by eligibility status
- **Advanced Filtering**: Search by patient name, payer, or coverage details
- **Status Management**: Track Eligible, Ineligible, Pending, and Error states
- **Re-verification**: One-click re-verification for updated coverage

#### **Coverage Details**
- **Patient Information**: Complete contact details and insurance information
- **Verification History**: Timeline of verification attempts and results
- **Coverage Specifics**: Detailed coverage information, copays, and limitations
- **Action Management**: Re-verification, status updates, and detail editing

### **Intake Automation Queue**

#### **Document Processing**
- **Task Creation**: Create intake tasks for various document types
- **OCR Simulation**: Automated document processing with OCR capabilities
- **Validation Workflow**: Multi-stage validation process for accuracy
- **Document Management**: Upload, view, and download document attachments

#### **Processing Dashboard**
- **Pipeline Statistics**: Live counts by processing stage
- **Task Management**: Advanced filtering and search capabilities
- **Status Tracking**: Visual indicators for Pending OCR, Needs Validation, and Complete
- **Workflow Actions**: OCR processing, validation marking, and completion tracking

#### **Task Details**
- **Patient Information**: Complete patient contact details
- **Document Information**: Task description, document links, and processing status
- **Processing Timeline**: Creation date, processing stages, and completion tracking
- **Action Management**: OCR processing, validation, and task completion

### **Appointment Management System**

#### **Add New Appointment**
- **Patient Selection**: Choose from existing patients with contact info display
- **Date & Time Picker**: Calendar interface with available time slots
- **Duration Options**: Flexible appointment durations (15 min to 2 hours)
- **Appointment Types**: Consultation, Follow-up, Procedure, Screening, Emergency, Physical
- **Provider Assignment**: Optional healthcare provider selection with specialty display
- **Notes Field**: Additional instructions or special requirements

#### **Today's Appointments View**
- **Real-time Statistics**: Live counts by appointment status
- **Advanced Search**: Filter by patient name, appointment type, or notes
- **Status Filtering**: View appointments by status (All, Confirmed, Pending, etc.)
- **Risk Assessment**: Visual no-show risk indicators (Low, Medium, High)
- **Quick Actions**: Status updates, reminder sending, and management options

#### **Appointment Details Modal**
- **Complete Patient Info**: Contact details, address, and emergency contacts
- **Provider Information**: Assigned healthcare providers with specialties
- **Appointment Specifics**: Date, time, duration, type, and current status
- **Risk Analysis**: Detailed no-show probability assessment
- **Action Buttons**: Quick status changes and appointment management

### **User Settings System**

#### **Profile Management**
- **Personal Information**: Full name and email address updates
- **Account Details**: User ID, creation date, verification status
- **Real-time Sync**: Automatic synchronization with authentication system

#### **Security Controls**
- **Password Management**: Secure password change with validation
- **Two-Factor Authentication**: Ready for future implementation
- **Session Management**: View last sign-in and account activity

#### **Notification Preferences**
- **Email Notifications**: Global email notification toggle
- **Appointment Reminders**: Upcoming appointment notifications
- **Prior Auth Updates**: Authorization status change alerts
- **System Alerts**: Maintenance and important system notifications

## 🔮 Development Roadmap

### **Phase 1: Foundation** ✅
- [x] Project setup and authentication
- [x] Database schema and security
- [x] Basic UI components and layout
- [x] User settings and preferences
- [x] Dashboard with real data integration
- [x] Comprehensive appointment management
- [x] Prior authorization workflow
- [x] Insurance eligibility verification
- [x] Intake automation queue

### **Phase 2: Advanced Features** 🚧
- [x] Complete responsive design implementation
- [ ] Smart Scheduling interface with calendar view
- [ ] Advanced reporting and analytics
- [ ] Document templates and automated generation
- [ ] Patient management system with comprehensive records
- [ ] Integration with external EHR systems

### **Phase 3: AI & Automation** 📋
- [ ] AI-powered no-show prediction
- [ ] Automated appointment reminders
- [ ] OCR integration for real document processing
- [ ] Intelligent prior authorization recommendations
- [ ] Automated eligibility verification
- [ ] Smart intake form processing

### **Phase 4: Enterprise Features** 🎯
- [ ] Multi-clinic support
- [ ] Advanced user roles and permissions
- [ ] API for third-party integrations
- [ ] Advanced security features
- [ ] Compliance reporting (HIPAA, etc.)
- [ ] Mobile application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the Supabase documentation for database-related questions

---

**ClinicFlow** - Streamlining healthcare operations with modern technology and AI-powered automation.