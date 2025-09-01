/*
  # Document Templates System

  1. **Document Templates Tables**
    - document_templates: Core template definitions with versioning
    - template_versions: Version history and approval workflows
    - template_categories: Organization and categorization
    - merge_fields: Available merge fields for templates
    - template_approvals: Approval workflow tracking

  2. **Indexes**
    - Optimized indexes for template queries
    - Version and approval tracking

  3. **Security**
    - RLS policies for template access
    - Approval workflow permissions

  4. **Functions**
    - Template versioning utilities
    - Merge field validation
*/

-- Create template_categories table for organizing templates
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50), -- Icon name/class
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create merge_fields table for available merge fields
CREATE TABLE IF NOT EXISTS public.merge_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'email', 'phone', 'address')),
  data_source VARCHAR NOT NULL CHECK (data_source IN ('patient', 'appointment', 'provider', 'clinic', 'custom')),
  description TEXT,
  validation_rules JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_templates table for core template definitions
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.template_categories(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}', -- Rich text content with merge fields
  merge_fields UUID[] DEFAULT '{}', -- Array of merge field IDs used in template
  settings JSONB DEFAULT '{}', -- Template-specific settings (page size, margins, etc.)
  tags VARCHAR[] DEFAULT '{}', -- Tags for searching and filtering
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  approval_workflow JSONB DEFAULT '{}', -- Approval workflow configuration
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template_versions table for version history
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  merge_fields UUID[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  change_summary TEXT,
  change_details JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

-- Create template_approvals table for approval workflow tracking
CREATE TABLE IF NOT EXISTS public.template_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.template_versions(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generated_documents table for tracking document generation
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  document_name VARCHAR NOT NULL,
  document_type VARCHAR DEFAULT 'pdf',
  merge_data JSONB DEFAULT '{}', -- Data used for merge fields
  file_path TEXT, -- Path to generated document file
  file_size BIGINT,
  generation_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_for_patient_id UUID, -- Reference to patient if applicable
  generated_for_appointment_id UUID, -- Reference to appointment if applicable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_templates_category 
ON public.document_templates (category_id, is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_templates_created_by 
ON public.document_templates (created_by, is_active, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_templates_tags 
ON public.document_templates USING GIN (tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_templates_merge_fields 
ON public.document_templates USING GIN (merge_fields);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_versions_template 
ON public.template_versions (template_id, version_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_approvals_template 
ON public.template_approvals (template_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_approvals_approver 
ON public.template_approvals (approver_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_documents_template 
ON public.generated_documents (template_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_documents_generated_by 
ON public.generated_documents (generated_by, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_documents_patient 
ON public.generated_documents (generated_for_patient_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merge_fields_source 
ON public.merge_fields (data_source, is_active);

-- Insert default template categories
INSERT INTO public.template_categories (name, description, color, icon, sort_order) VALUES
('Consent Forms', 'Patient consent and authorization forms', '#3B82F6', 'FileCheck', 1),
('Intake Forms', 'Patient intake and registration forms', '#10B981', 'ClipboardList', 2),
('Treatment Plans', 'Treatment and care plan documents', '#8B5CF6', 'FileText', 3),
('Referral Letters', 'Provider referral and communication letters', '#F59E0B', 'Send', 4),
('Insurance Forms', 'Insurance and billing related documents', '#EF4444', 'CreditCard', 5),
('Reports', 'Clinical and administrative reports', '#6B7280', 'BarChart3', 6),
('Correspondence', 'General correspondence and letters', '#EC4899', 'Mail', 7)
ON CONFLICT (name) DO NOTHING;

-- Insert default merge fields
INSERT INTO public.merge_fields (name, display_name, field_type, data_source, description, is_required) VALUES
-- Patient fields
('patient.name', 'Patient Name', 'text', 'patient', 'Full name of the patient', true),
('patient.first_name', 'Patient First Name', 'text', 'patient', 'First name of the patient', false),
('patient.last_name', 'Patient Last Name', 'text', 'patient', 'Last name of the patient', false),
('patient.date_of_birth', 'Patient Date of Birth', 'date', 'patient', 'Patient date of birth', false),
('patient.phone', 'Patient Phone', 'phone', 'patient', 'Patient primary phone number', false),
('patient.email', 'Patient Email', 'email', 'patient', 'Patient email address', false),
('patient.address', 'Patient Address', 'address', 'patient', 'Patient mailing address', false),
('patient.insurance_id', 'Insurance ID', 'text', 'patient', 'Patient insurance identification number', false),

-- Appointment fields
('appointment.date', 'Appointment Date', 'date', 'appointment', 'Date of the appointment', false),
('appointment.time', 'Appointment Time', 'text', 'appointment', 'Time of the appointment', false),
('appointment.duration', 'Appointment Duration', 'number', 'appointment', 'Duration of appointment in minutes', false),
('appointment.type', 'Appointment Type', 'text', 'appointment', 'Type or category of appointment', false),
('appointment.status', 'Appointment Status', 'text', 'appointment', 'Current status of the appointment', false),

-- Provider fields
('provider.name', 'Provider Name', 'text', 'provider', 'Name of the healthcare provider', false),
('provider.title', 'Provider Title', 'text', 'provider', 'Professional title of the provider', false),
('provider.license', 'Provider License', 'text', 'provider', 'Provider license number', false),
('provider.phone', 'Provider Phone', 'phone', 'provider', 'Provider contact phone number', false),
('provider.email', 'Provider Email', 'email', 'provider', 'Provider email address', false),

-- Clinic fields
('clinic.name', 'Clinic Name', 'text', 'clinic', 'Name of the clinic or practice', false),
('clinic.address', 'Clinic Address', 'address', 'clinic', 'Clinic mailing address', false),
('clinic.phone', 'Clinic Phone', 'phone', 'clinic', 'Clinic main phone number', false),
('clinic.fax', 'Clinic Fax', 'phone', 'clinic', 'Clinic fax number', false),

-- System fields
('current.date', 'Current Date', 'date', 'custom', 'Current system date', false),
('current.time', 'Current Time', 'text', 'custom', 'Current system time', false)
ON CONFLICT (name) DO NOTHING;

-- Create function to create new template version
CREATE OR REPLACE FUNCTION create_template_version(
  p_template_id UUID,
  p_content JSONB,
  p_merge_fields UUID[] DEFAULT '{}',
  p_settings JSONB DEFAULT '{}',
  p_change_summary TEXT DEFAULT NULL,
  p_change_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM public.template_versions
  WHERE template_id = p_template_id;

  -- Create new version
  INSERT INTO public.template_versions (
    template_id,
    version_number,
    content,
    merge_fields,
    settings,
    change_summary,
    change_details,
    created_by
  ) VALUES (
    p_template_id,
    v_version_number,
    p_content,
    p_merge_fields,
    p_settings,
    p_change_summary,
    p_change_details,
    auth.uid()
  )
  RETURNING id INTO v_version_id;

  -- Update template version number
  UPDATE public.document_templates
  SET 
    version = v_version_number,
    content = p_content,
    merge_fields = p_merge_fields,
    settings = p_settings,
    updated_at = NOW()
  WHERE id = p_template_id;

  RETURN v_version_id;
END;
$;

-- Create function to validate merge fields in template content
CREATE OR REPLACE FUNCTION validate_template_merge_fields(
  p_content JSONB,
  p_merge_fields UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  field_id UUID;
  field_name VARCHAR;
  content_text TEXT;
BEGIN
  -- Convert content to text for searching
  content_text := p_content::text;
  
  -- Check each merge field
  FOREACH field_id IN ARRAY p_merge_fields
  LOOP
    SELECT name INTO field_name
    FROM public.merge_fields
    WHERE id = field_id AND is_active = true;
    
    IF field_name IS NULL THEN
      RETURN false; -- Invalid merge field ID
    END IF;
    
    -- Check if merge field is actually used in content
    IF content_text NOT LIKE '%{{' || field_name || '}}%' THEN
      RETURN false; -- Merge field not found in content
    END IF;
  END LOOP;
  
  RETURN true;
END;
$;

-- Create function to get template with version history
CREATE OR REPLACE FUNCTION get_template_with_versions(p_template_id UUID)
RETURNS TABLE (
  template_id UUID,
  template_name VARCHAR,
  template_description TEXT,
  category_name VARCHAR,
  current_version INTEGER,
  is_active BOOLEAN,
  requires_approval BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ,
  versions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.name,
    dt.description,
    tc.name as category_name,
    dt.version,
    dt.is_active,
    dt.requires_approval,
    dt.created_by,
    dt.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', tv.id,
          'version_number', tv.version_number,
          'change_summary', tv.change_summary,
          'created_by', tv.created_by,
          'created_at', tv.created_at
        ) ORDER BY tv.version_number DESC
      ) FILTER (WHERE tv.id IS NOT NULL),
      '[]'::jsonb
    ) as versions
  FROM public.document_templates dt
  LEFT JOIN public.template_categories tc ON dt.category_id = tc.id
  LEFT JOIN public.template_versions tv ON dt.id = tv.template_id
  WHERE dt.id = p_template_id
  GROUP BY dt.id, dt.name, dt.description, tc.name, dt.version, dt.is_active, dt.requires_approval, dt.created_by, dt.created_at;
END;
$;

-- Enable RLS on all document template tables
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merge_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template_categories (public read, admin write)
CREATE POLICY "Anyone can view template categories" ON public.template_categories
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage template categories" ON public.template_categories
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for merge_fields (public read, admin write)
CREATE POLICY "Anyone can view active merge fields" ON public.merge_fields
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage merge fields" ON public.merge_fields
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for document_templates
CREATE POLICY "Users can view active templates" ON public.document_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create their own templates" ON public.document_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON public.document_templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin has full access to templates" ON public.document_templates
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by);

-- Create RLS policies for template_versions
CREATE POLICY "Users can view versions of accessible templates" ON public.template_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_templates dt 
      WHERE dt.id = template_versions.template_id 
      AND (dt.is_active = true OR dt.created_by = auth.uid() OR auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
    )
  );

CREATE POLICY "Users can create versions for their templates" ON public.template_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_templates dt 
      WHERE dt.id = template_versions.template_id 
      AND (dt.created_by = auth.uid() OR auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
    )
  );

-- Create RLS policies for template_approvals
CREATE POLICY "Users can view approvals for their templates or as approvers" ON public.template_approvals
  FOR SELECT TO authenticated
  USING (
    auth.uid() = approver_id OR
    EXISTS (
      SELECT 1 FROM public.document_templates dt 
      WHERE dt.id = template_approvals.template_id 
      AND dt.created_by = auth.uid()
    ) OR
    auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid
  );

CREATE POLICY "Users can create approvals for templates" ON public.template_approvals
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow creation, business logic will handle validation

CREATE POLICY "Approvers can update their approval records" ON public.template_approvals
  FOR UPDATE TO authenticated
  USING (auth.uid() = approver_id OR auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = approver_id OR auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for generated_documents
CREATE POLICY "Users can view their own generated documents" ON public.generated_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = generated_by);

CREATE POLICY "Users can create generated documents" ON public.generated_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own generated documents" ON public.generated_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = generated_by)
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Admin has full access to generated documents" ON public.generated_documents
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = generated_by)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = generated_by);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merge_fields_updated_at
  BEFORE UPDATE ON public.merge_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_approvals_updated_at
  BEFORE UPDATE ON public.template_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_template_version TO authenticated;
GRANT EXECUTE ON FUNCTION validate_template_merge_fields TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_with_versions TO authenticated;

-- Create storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for document files
CREATE POLICY "Users can upload their generated documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their generated documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their generated documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add helpful comments
COMMENT ON TABLE public.template_categories IS 'Categories for organizing document templates';
COMMENT ON TABLE public.merge_fields IS 'Available merge fields that can be used in document templates';
COMMENT ON TABLE public.document_templates IS 'Document templates with rich text content and merge field support';
COMMENT ON TABLE public.template_versions IS 'Version history for document templates';
COMMENT ON TABLE public.template_approvals IS 'Approval workflow tracking for template changes';
COMMENT ON TABLE public.generated_documents IS 'Tracking of generated documents from templates';

COMMENT ON FUNCTION create_template_version IS 'Creates a new version of a document template';
COMMENT ON FUNCTION validate_template_merge_fields IS 'Validates that merge fields are properly used in template content';
COMMENT ON FUNCTION get_template_with_versions IS 'Retrieves a template with its complete version history';