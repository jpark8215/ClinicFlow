-- OCR Integration Tables
-- This migration adds tables for OCR processing, document management, and manual review queue

-- Documents table for uploaded files
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT,
  document_type VARCHAR NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  intake_task_id UUID REFERENCES intake_tasks(id) ON DELETE SET NULL,
  upload_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
  processing_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_confidence DECIMAL(3,2),
  extracted_text TEXT,
  extracted_fields JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OCR Results table for storing detailed OCR processing results
CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  bounding_boxes JSONB DEFAULT '[]',
  extracted_fields JSONB DEFAULT '[]',
  detected_language VARCHAR DEFAULT 'en',
  page_count INTEGER DEFAULT 1,
  processing_time INTEGER, -- milliseconds
  ocr_service VARCHAR, -- google_vision, aws_textract, azure_cv
  service_version VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manual Review Queue for low confidence OCR results
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ocr_result_id UUID REFERENCES ocr_results(id) ON DELETE SET NULL,
  review_type VARCHAR NOT NULL CHECK (review_type IN ('low_confidence', 'critical_field_low_confidence', 'extraction_error', 'manual_request')),
  priority VARCHAR NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'rejected')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  reviewer_notes TEXT,
  corrected_data JSONB,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Field Mappings for different document types
CREATE TABLE IF NOT EXISTS document_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  field_display_name VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'signature', 'checkbox')),
  is_required BOOLEAN DEFAULT false,
  is_critical BOOLEAN DEFAULT false, -- Critical fields trigger manual review if confidence is low
  validation_rules JSONB DEFAULT '{}',
  extraction_patterns JSONB DEFAULT '[]', -- Regex patterns for field extraction
  confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, field_name)
);

-- OCR Service Configurations (extends ai_service_configs for OCR-specific settings)
CREATE TABLE IF NOT EXISTS ocr_service_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR NOT NULL UNIQUE,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('google_vision', 'aws_textract', 'azure_computer_vision')),
  api_endpoint TEXT NOT NULL,
  api_key_encrypted TEXT, -- Encrypted API key
  configuration JSONB DEFAULT '{}',
  rate_limits JSONB DEFAULT '{}',
  supported_formats TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'],
  max_file_size BIGINT DEFAULT 10485760, -- 10MB default
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_appointment_id ON documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_documents_intake_task_id ON documents(intake_task_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_results_document_id ON ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_confidence ON ocr_results(confidence);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_review_queue_status ON manual_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_priority ON manual_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_assigned_to ON manual_review_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_created_at ON manual_review_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_field_mappings_document_type ON document_field_mappings(document_type);

-- Add columns to existing intake_tasks table for OCR integration
ALTER TABLE intake_tasks 
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false;

-- Insert default document field mappings
INSERT INTO document_field_mappings (document_type, field_name, field_display_name, field_type, is_required, is_critical, confidence_threshold) VALUES
-- New Patient Packet fields
('new_patient_packet', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('new_patient_packet', 'date_of_birth', 'Date of Birth', 'date', true, true, 0.85),
('new_patient_packet', 'phone', 'Phone Number', 'text', true, false, 0.75),
('new_patient_packet', 'email', 'Email Address', 'text', false, false, 0.70),
('new_patient_packet', 'address', 'Address', 'text', true, false, 0.70),
('new_patient_packet', 'emergency_contact', 'Emergency Contact', 'text', true, false, 0.70),
('new_patient_packet', 'signature', 'Patient Signature', 'signature', true, true, 0.80),

-- Insurance Card fields
('insurance_card', 'insurance_provider', 'Insurance Provider', 'text', true, true, 0.85),
('insurance_card', 'member_id', 'Member ID', 'text', true, true, 0.90),
('insurance_card', 'group_number', 'Group Number', 'text', true, true, 0.85),
('insurance_card', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('insurance_card', 'effective_date', 'Effective Date', 'date', false, false, 0.75),
('insurance_card', 'copay_info', 'Copay Information', 'text', false, false, 0.70),

-- Referral Letter fields
('referral_letter', 'referring_provider', 'Referring Provider', 'text', true, true, 0.80),
('referral_letter', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('referral_letter', 'referral_reason', 'Reason for Referral', 'text', true, false, 0.75),
('referral_letter', 'date', 'Referral Date', 'date', true, false, 0.75),
('referral_letter', 'provider_signature', 'Provider Signature', 'signature', true, true, 0.80),

-- Medical History Form fields
('medical_history_form', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('medical_history_form', 'medical_conditions', 'Medical Conditions', 'text', false, false, 0.70),
('medical_history_form', 'medications', 'Current Medications', 'text', false, false, 0.70),
('medical_history_form', 'allergies', 'Allergies', 'text', false, false, 0.70),
('medical_history_form', 'family_history', 'Family History', 'text', false, false, 0.65),

-- Consent Form fields
('consent_form', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('consent_form', 'procedure', 'Procedure/Treatment', 'text', true, false, 0.75),
('consent_form', 'signature', 'Patient Signature', 'signature', true, true, 0.80),
('consent_form', 'date', 'Consent Date', 'date', true, false, 0.75),
('consent_form', 'witness_signature', 'Witness Signature', 'signature', false, false, 0.75),

-- Lab Results fields
('lab_results', 'patient_name', 'Patient Name', 'text', true, true, 0.85),
('lab_results', 'test_date', 'Test Date', 'date', true, false, 0.75),
('lab_results', 'test_results', 'Test Results', 'text', true, false, 0.70),
('lab_results', 'provider', 'Ordering Provider', 'text', true, false, 0.75),
('lab_results', 'lab_name', 'Laboratory Name', 'text', false, false, 0.70),

-- ID Verification fields
('id_verification', 'full_name', 'Full Name', 'text', true, true, 0.85),
('id_verification', 'date_of_birth', 'Date of Birth', 'date', true, true, 0.85),
('id_verification', 'id_number', 'ID Number', 'text', true, true, 0.90),
('id_verification', 'address', 'Address', 'text', true, false, 0.70),
('id_verification', 'expiration_date', 'Expiration Date', 'date', false, false, 0.75);

-- Insert default OCR service configuration (placeholder)
INSERT INTO ocr_service_configs (service_name, service_type, api_endpoint, configuration, is_active) VALUES
('mock_ocr_service', 'google_vision', 'https://vision.googleapis.com', 
 '{"mock": true, "development_mode": true}', true);

-- Functions for OCR processing workflow

-- Function to get document field mappings for a document type
CREATE OR REPLACE FUNCTION get_document_field_mappings(p_document_type VARCHAR)
RETURNS TABLE (
  field_name VARCHAR,
  field_display_name VARCHAR,
  field_type VARCHAR,
  is_required BOOLEAN,
  is_critical BOOLEAN,
  confidence_threshold DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dfm.field_name,
    dfm.field_display_name,
    dfm.field_type,
    dfm.is_required,
    dfm.is_critical,
    dfm.confidence_threshold
  FROM document_field_mappings dfm
  WHERE dfm.document_type = p_document_type
  ORDER BY dfm.is_required DESC, dfm.is_critical DESC, dfm.field_name;
END;
$$ LANGUAGE plpgsql;

-- Function to create manual review task
CREATE OR REPLACE FUNCTION create_manual_review_task(
  p_document_id UUID,
  p_review_type VARCHAR,
  p_priority VARCHAR DEFAULT 'medium',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  review_id UUID;
BEGIN
  INSERT INTO manual_review_queue (
    document_id,
    review_type,
    priority,
    metadata,
    status
  ) VALUES (
    p_document_id,
    p_review_type,
    p_priority,
    p_metadata,
    'pending'
  ) RETURNING id INTO review_id;
  
  RETURN review_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update document processing status
CREATE OR REPLACE FUNCTION update_document_processing_status(
  p_document_id UUID,
  p_status VARCHAR,
  p_ocr_confidence DECIMAL DEFAULT NULL,
  p_extracted_text TEXT DEFAULT NULL,
  p_extracted_fields JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE documents 
  SET 
    processing_status = p_status,
    ocr_confidence = COALESCE(p_ocr_confidence, ocr_confidence),
    extracted_text = COALESCE(p_extracted_text, extracted_text),
    extracted_fields = COALESCE(p_extracted_fields, extracted_fields),
    updated_at = NOW()
  WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending manual review tasks
CREATE OR REPLACE FUNCTION get_pending_manual_reviews(
  p_assigned_to UUID DEFAULT NULL,
  p_priority VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_type VARCHAR,
  patient_name VARCHAR,
  review_type VARCHAR,
  priority VARCHAR,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mrq.id,
    mrq.document_id,
    d.document_type,
    p.full_name as patient_name,
    mrq.review_type,
    mrq.priority,
    mrq.metadata,
    mrq.created_at
  FROM manual_review_queue mrq
  JOIN documents d ON mrq.document_id = d.id
  LEFT JOIN patients p ON d.patient_id = p.id
  WHERE mrq.status = 'pending'
    AND (p_assigned_to IS NULL OR mrq.assigned_to = p_assigned_to)
    AND (p_priority IS NULL OR mrq.priority = p_priority)
  ORDER BY 
    CASE mrq.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    mrq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_service_configs ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view documents they created or are assigned to" ON documents
  FOR SELECT USING (
    created_by = auth.uid() OR
    patient_id IN (
      SELECT patient_id FROM appointments WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update documents they created" ON documents
  FOR UPDATE USING (created_by = auth.uid());

-- OCR Results policies
CREATE POLICY "Users can view OCR results for their documents" ON ocr_results
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert OCR results" ON ocr_results
  FOR INSERT WITH CHECK (true);

-- Manual Review Queue policies
CREATE POLICY "Users can view manual review tasks assigned to them" ON manual_review_queue
  FOR SELECT USING (assigned_to = auth.uid() OR assigned_to IS NULL);

CREATE POLICY "Users can update manual review tasks assigned to them" ON manual_review_queue
  FOR UPDATE USING (assigned_to = auth.uid());

-- Document Field Mappings policies (read-only for users)
CREATE POLICY "Users can view document field mappings" ON document_field_mappings
  FOR SELECT USING (true);

-- OCR Service Configs policies (admin only)
CREATE POLICY "Admins can manage OCR service configs" ON ocr_service_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON documents TO authenticated;
GRANT SELECT, INSERT ON ocr_results TO authenticated;
GRANT SELECT, UPDATE ON manual_review_queue TO authenticated;
GRANT SELECT ON document_field_mappings TO authenticated;
GRANT SELECT ON ocr_service_configs TO authenticated;