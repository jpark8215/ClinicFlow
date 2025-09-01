/*
  # Multi-Clinic Enterprise Support Foundation

  1. **New Tables**
    - organizations: Healthcare organizations/enterprises
    - clinics: Individual clinic locations within organizations
    - user_clinic_roles: Multi-tenancy access control with clinic-specific roles

  2. **Schema Updates**
    - Add clinic_id foreign keys to existing tables for multi-tenancy
    - Update existing tables to support clinic-specific data isolation

  3. **Security**
    - Enable RLS on all new tables
    - Add clinic-specific access policies
    - Ensure data isolation between clinics

  4. **Indexes**
    - Optimized indexes for multi-clinic queries
    - Performance indexes for role-based access control
*/

-- Create organizations table for healthcare enterprises
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  billing_info JSONB DEFAULT '{}',
  subscription_plan VARCHAR DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS 'Healthcare organizations and enterprises';

-- Create clinics table for individual clinic locations
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  address JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  timezone VARCHAR DEFAULT 'UTC',
  business_hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.clinics IS 'Individual clinic locations within organizations';

-- Create user_clinic_roles table for multi-tenancy access control
CREATE TABLE IF NOT EXISTS public.user_clinic_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clinic_id)
);

COMMENT ON TABLE public.user_clinic_roles IS 'User roles and permissions per clinic for multi-tenancy';

-- Add clinic_id foreign keys to existing tables
DO $
BEGIN
  -- Add clinic_id to patients table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to appointments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to pre_authorizations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pre_authorizations' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.pre_authorizations ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to intake_tasks table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intake_tasks' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.intake_tasks ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to insurance_eligibility table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_eligibility' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.insurance_eligibility ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to providers table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.providers ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to patient_insurance table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_insurance' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.patient_insurance ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to notifications table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to document_templates table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_templates' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.document_templates ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to patient_documents table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patient_documents' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.patient_documents ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
  END IF;

  -- Add clinic_id to analytics_metrics table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_metrics') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'analytics_metrics' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.analytics_metrics ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;

  -- Add clinic_id to report_templates table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'report_templates' AND column_name = 'clinic_id'
    ) THEN
      ALTER TABLE public.report_templates ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
  END IF;

  -- Add clinic_id to scheduled_reports table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reports') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scheduled_reports' AND column_name = 'clinic_id'
    ) THEN
      ALTER TABLE public.scheduled_reports ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
  END IF;

  -- Add clinic_id to dashboard_configs table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_configs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'dashboard_configs' AND column_name = 'clinic_id'
    ) THEN
      ALTER TABLE public.dashboard_configs ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
  END IF;
END $;

-- Create indexes for multi-clinic queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active 
ON public.organizations (is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinics_organization 
ON public.clinics (organization_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinics_active 
ON public.clinics (is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_clinic_roles_user 
ON public.user_clinic_roles (user_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_clinic_roles_clinic 
ON public.user_clinic_roles (clinic_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_clinic_roles_org 
ON public.user_clinic_roles (organization_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_clinic_roles_role 
ON public.user_clinic_roles (role, is_active);

-- Create indexes for clinic_id foreign keys on existing tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_clinic 
ON public.patients (clinic_id) WHERE clinic_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_clinic 
ON public.appointments (clinic_id) WHERE clinic_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pre_authorizations_clinic 
ON public.pre_authorizations (clinic_id) WHERE clinic_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intake_tasks_clinic 
ON public.intake_tasks (clinic_id) WHERE clinic_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_clinic 
ON public.providers (clinic_id) WHERE clinic_id IS NOT NULL;

-- Create update triggers for new tables
CREATE OR REPLACE FUNCTION public.handle_organization_update()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_clinic_update()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_user_clinic_role_update()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_organization_update') THEN
    CREATE TRIGGER on_organization_update
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_organization_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_clinic_update') THEN
    CREATE TRIGGER on_clinic_update
      BEFORE UPDATE ON public.clinics
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_clinic_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_clinic_role_update') THEN
    CREATE TRIGGER on_user_clinic_role_update
      BEFORE UPDATE ON public.user_clinic_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_user_clinic_role_update();
  END IF;
END $;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clinic_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  );

CREATE POLICY "Organization admins can manage organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (
    id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  );

-- Create RLS policies for clinics
CREATE POLICY "Users can view clinics they belong to" ON public.clinics
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  );

CREATE POLICY "Clinic and organization admins can manage clinics" ON public.clinics
  FOR ALL TO authenticated
  USING (
    id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner', 'manager') 
        AND ucr.is_active = true
    )
    OR organization_id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner', 'manager') 
        AND ucr.is_active = true
    )
    OR organization_id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  );

-- Create RLS policies for user_clinic_roles
CREATE POLICY "Users can view their own clinic roles" ON public.user_clinic_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view roles in their clinics" ON public.user_clinic_roles
  FOR SELECT TO authenticated
  USING (
    clinic_id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner', 'manager') 
        AND ucr.is_active = true
    )
  );

CREATE POLICY "Admins can manage clinic roles" ON public.user_clinic_roles
  FOR ALL TO authenticated
  USING (
    clinic_id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
    OR organization_id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT DISTINCT ucr.clinic_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
    OR organization_id IN (
      SELECT DISTINCT ucr.organization_id 
      FROM public.user_clinic_roles ucr 
      WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('admin', 'owner') 
        AND ucr.is_active = true
    )
  );

-- Create helper functions for multi-clinic operations
CREATE OR REPLACE FUNCTION get_user_clinics(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  clinic_id UUID,
  clinic_name VARCHAR,
  organization_id UUID,
  organization_name VARCHAR,
  user_role VARCHAR,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    c.id as clinic_id,
    c.name as clinic_name,
    o.id as organization_id,
    o.name as organization_name,
    ucr.role as user_role,
    ucr.permissions
  FROM public.user_clinic_roles ucr
  JOIN public.clinics c ON ucr.clinic_id = c.id
  JOIN public.organizations o ON ucr.organization_id = o.id
  WHERE ucr.user_id = p_user_id 
    AND ucr.is_active = true 
    AND c.is_active = true 
    AND o.is_active = true;
END;
$;

CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR,
  user_role VARCHAR,
  clinic_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    MAX(ucr.role) as user_role, -- Get highest role if user has multiple roles
    COUNT(DISTINCT ucr.clinic_id) as clinic_count
  FROM public.user_clinic_roles ucr
  JOIN public.organizations o ON ucr.organization_id = o.id
  WHERE ucr.user_id = p_user_id 
    AND ucr.is_active = true 
    AND o.is_active = true
  GROUP BY o.id, o.name;
END;
$;

CREATE OR REPLACE FUNCTION check_clinic_access(
  p_user_id UUID,
  p_clinic_id UUID,
  p_required_role VARCHAR DEFAULT 'staff'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  user_role VARCHAR;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  -- Get user's role in the clinic
  SELECT ucr.role INTO user_role
  FROM public.user_clinic_roles ucr
  WHERE ucr.user_id = p_user_id 
    AND ucr.clinic_id = p_clinic_id 
    AND ucr.is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = more permissions)
  role_hierarchy := CASE user_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'provider' THEN 2
    WHEN 'staff' THEN 1
    ELSE 0
  END;
  
  required_hierarchy := CASE p_required_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'provider' THEN 2
    WHEN 'staff' THEN 1
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_clinics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION check_clinic_access TO authenticated;

-- Create a view for clinic details with organization information
CREATE OR REPLACE VIEW public.clinic_details AS
SELECT 
  c.id,
  c.name,
  c.description,
  c.address,
  c.contact_info,
  c.settings,
  c.timezone,
  c.business_hours,
  c.is_active,
  c.created_at,
  c.updated_at,
  o.id as organization_id,
  o.name as organization_name,
  o.settings as organization_settings
FROM public.clinics c
JOIN public.organizations o ON c.organization_id = o.id;

-- Create a view for user clinic access summary
CREATE OR REPLACE VIEW public.user_clinic_access AS
SELECT 
  ucr.user_id,
  ucr.clinic_id,
  ucr.organization_id,
  ucr.role,
  ucr.permissions,
  ucr.is_active,
  c.name as clinic_name,
  o.name as organization_name,
  ucr.assigned_at,
  ucr.created_at
FROM public.user_clinic_roles ucr
JOIN public.clinics c ON ucr.clinic_id = c.id
JOIN public.organizations o ON ucr.organization_id = o.id;

-- Insert sample data for testing (optional - can be removed in production)
DO $
BEGIN
  -- Only insert if no organizations exist
  IF NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1) THEN
    -- Insert sample organization
    INSERT INTO public.organizations (id, name, description, settings)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440000',
      'HealthCare Solutions Inc.',
      'Multi-location healthcare provider',
      '{"theme": "default", "features": ["analytics", "ai", "multi_clinic"]}'
    );
    
    -- Insert sample clinic
    INSERT INTO public.clinics (id, organization_id, name, description, address, settings)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440000',
      'Main Street Clinic',
      'Primary care clinic in downtown area',
      '{"street": "123 Main St", "city": "Anytown", "state": "CA", "zip": "12345"}',
      '{"appointment_duration": 30, "reminder_hours": 24}'
    );
  END IF;
END $;