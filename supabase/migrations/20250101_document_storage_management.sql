-- Document Storage and Management System Migration
-- This migration adds secure document storage, audit trails, and access logging

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document storage table for tracking stored documents
CREATE TABLE IF NOT EXISTS public.document_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.generated_documents(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    -- File storage information
    storage_bucket VARCHAR NOT NULL DEFAULT 'documents',
    storage_path VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_hash VARCHAR, -- SHA-256 hash for integrity verification
    
    -- Document metadata
    document_type VARCHAR NOT NULL, -- 'consent', 'intake', 'referral', 'report', etc.
    document_category VARCHAR,
    encryption_key_id VARCHAR, -- Reference to encryption key for sensitive documents
    
    -- Access control
    access_level VARCHAR NOT NULL DEFAULT 'restricted', -- 'public', 'restricted', 'confidential'
    retention_policy VARCHAR, -- Retention policy identifier
    retention_until TIMESTAMPTZ, -- When document should be archived/deleted
    
    -- Status and metadata
    storage_status VARCHAR NOT NULL DEFAULT 'active', -- 'active', 'archived', 'deleted'
    is_encrypted BOOLEAN DEFAULT false,
    is_signed BOOLEAN DEFAULT false, -- Digital signature status
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_storage_status CHECK (storage_status IN ('active', 'archived', 'deleted')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'restricted', 'confidential')),
    CONSTRAINT unique_document_storage UNIQUE (document_id, storage_path)
);

-- Document access log for compliance and audit trails
CREATE TABLE IF NOT EXISTS public.document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_storage_id UUID NOT NULL REFERENCES public.document_storage(id) ON DELETE CASCADE,
    
    -- Access details
    accessed_by UUID NOT NULL REFERENCES auth.users(id),
    access_type VARCHAR NOT NULL, -- 'view', 'download', 'print', 'share', 'delete'
    access_method VARCHAR NOT NULL, -- 'web', 'mobile', 'api', 'system'
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR,
    request_id VARCHAR,
    
    -- Access result
    access_granted BOOLEAN NOT NULL DEFAULT true,
    denial_reason VARCHAR, -- Reason if access was denied
    
    -- Audit metadata
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER, -- How long the access took
    
    -- Additional context
    metadata JSONB DEFAULT '{}', -- Additional context like search terms, filters, etc.
    
    -- Constraints
    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download', 'print', 'share', 'delete', 'modify')),
    CONSTRAINT valid_access_method CHECK (access_method IN ('web', 'mobile', 'api', 'system'))
);

-- Document sharing table for tracking shared documents
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_storage_id UUID NOT NULL REFERENCES public.document_storage(id) ON DELETE CASCADE,
    
    -- Sharing details
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    shared_with UUID REFERENCES auth.users(id), -- NULL for external shares
    share_type VARCHAR NOT NULL DEFAULT 'internal', -- 'internal', 'external', 'public'
    
    -- External sharing (when shared_with is NULL)
    external_email VARCHAR,
    external_name VARCHAR,
    
    -- Share permissions
    permissions JSONB NOT NULL DEFAULT '{"view": true, "download": false, "print": false}',
    
    -- Share lifecycle
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- Limit number of accesses
    
    -- Security
    share_token VARCHAR UNIQUE, -- Secure token for external access
    password_protected BOOLEAN DEFAULT false,
    password_hash VARCHAR, -- Hashed password for protected shares
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_share_type CHECK (share_type IN ('internal', 'external', 'public')),
    CONSTRAINT external_share_requirements CHECK (
        (share_type = 'external' AND external_email IS NOT NULL) OR 
        (share_type != 'external')
    )
);

-- Document versions table for version control of stored documents
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_storage_id UUID NOT NULL REFERENCES public.document_storage(id) ON DELETE CASCADE,
    
    -- Version information
    version_number INTEGER NOT NULL,
    version_label VARCHAR, -- e.g., "v1.0", "draft", "final"
    
    -- File information for this version
    storage_path VARCHAR NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR NOT NULL,
    
    -- Version metadata
    change_summary TEXT,
    change_details JSONB DEFAULT '{}',
    
    -- Status
    is_current BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_version_per_document UNIQUE (document_storage_id, version_number),
    CONSTRAINT unique_current_version EXCLUDE (document_storage_id WITH =) WHERE (is_current = true)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_storage_patient_id ON public.document_storage(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_storage_appointment_id ON public.document_storage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_document_storage_created_at ON public.document_storage(created_at);
CREATE INDEX IF NOT EXISTS idx_document_storage_document_type ON public.document_storage(document_type);
CREATE INDEX IF NOT EXISTS idx_document_storage_status ON public.document_storage(storage_status);

CREATE INDEX IF NOT EXISTS idx_document_access_log_document_id ON public.document_access_log(document_storage_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_accessed_by ON public.document_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_document_access_log_accessed_at ON public.document_access_log(accessed_at);
CREATE INDEX IF NOT EXISTS idx_document_access_log_access_type ON public.document_access_log(access_type);

CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_storage_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_by ON public.document_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with ON public.document_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON public.document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_active ON public.document_shares(is_active);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_storage_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_current ON public.document_versions(is_current) WHERE is_current = true;

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.document_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Document storage policies
CREATE POLICY "Users can view documents they have access to" ON public.document_storage
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.document_shares ds 
            WHERE ds.document_storage_id = id 
            AND ds.shared_with = auth.uid() 
            AND ds.is_active = true
            AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
        )
    );

CREATE POLICY "Users can create document storage records" ON public.document_storage
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own document storage records" ON public.document_storage
    FOR UPDATE USING (auth.uid() = created_by);

-- Document access log policies (append-only for audit integrity)
CREATE POLICY "Users can view their own access logs" ON public.document_access_log
    FOR SELECT USING (auth.uid() = accessed_by);

CREATE POLICY "System can insert access logs" ON public.document_access_log
    FOR INSERT WITH CHECK (true); -- System-level logging

-- Document shares policies
CREATE POLICY "Users can view shares they created or received" ON public.document_shares
    FOR SELECT USING (
        auth.uid() = shared_by OR 
        auth.uid() = shared_with
    );

CREATE POLICY "Users can create shares for documents they own" ON public.document_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_storage ds 
            WHERE ds.id = document_storage_id 
            AND ds.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update shares they created" ON public.document_shares
    FOR UPDATE USING (auth.uid() = shared_by);

-- Document versions policies
CREATE POLICY "Users can view versions of documents they have access to" ON public.document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.document_storage ds 
            WHERE ds.id = document_storage_id 
            AND (
                ds.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.document_shares dsh 
                    WHERE dsh.document_storage_id = ds.id 
                    AND dsh.shared_with = auth.uid() 
                    AND dsh.is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can create versions for documents they own" ON public.document_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_storage ds 
            WHERE ds.id = document_storage_id 
            AND ds.created_by = auth.uid()
        )
    );

-- Functions for document management

-- Function to log document access
CREATE OR REPLACE FUNCTION public.log_document_access(
    p_document_storage_id UUID,
    p_access_type VARCHAR,
    p_access_method VARCHAR DEFAULT 'web',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_request_id VARCHAR DEFAULT NULL,
    p_access_granted BOOLEAN DEFAULT true,
    p_denial_reason VARCHAR DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.document_access_log (
        document_storage_id,
        accessed_by,
        access_type,
        access_method,
        ip_address,
        user_agent,
        session_id,
        request_id,
        access_granted,
        denial_reason,
        duration_ms,
        metadata
    ) VALUES (
        p_document_storage_id,
        auth.uid(),
        p_access_type,
        p_access_method,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_request_id,
        p_access_granted,
        p_denial_reason,
        p_duration_ms,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to create document share
CREATE OR REPLACE FUNCTION public.create_document_share(
    p_document_storage_id UUID,
    p_shared_with UUID DEFAULT NULL,
    p_share_type VARCHAR DEFAULT 'internal',
    p_external_email VARCHAR DEFAULT NULL,
    p_external_name VARCHAR DEFAULT NULL,
    p_permissions JSONB DEFAULT '{"view": true, "download": false, "print": false}',
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_max_access_count INTEGER DEFAULT NULL,
    p_password_protected BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_id UUID;
    share_token VARCHAR;
BEGIN
    -- Generate secure share token for external shares
    IF p_share_type = 'external' THEN
        share_token := encode(gen_random_bytes(32), 'base64url');
    END IF;
    
    INSERT INTO public.document_shares (
        document_storage_id,
        shared_by,
        shared_with,
        share_type,
        external_email,
        external_name,
        permissions,
        expires_at,
        max_access_count,
        share_token,
        password_protected
    ) VALUES (
        p_document_storage_id,
        auth.uid(),
        p_shared_with,
        p_share_type,
        p_external_email,
        p_external_name,
        p_permissions,
        p_expires_at,
        p_max_access_count,
        share_token,
        p_password_protected
    ) RETURNING id INTO share_id;
    
    RETURN share_id;
END;
$$;

-- Function to check document access permissions
CREATE OR REPLACE FUNCTION public.check_document_access(
    p_document_storage_id UUID,
    p_access_type VARCHAR DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_access BOOLEAN := false;
    doc_access_level VARCHAR;
BEGIN
    -- Check if user owns the document
    SELECT access_level INTO doc_access_level
    FROM public.document_storage 
    WHERE id = p_document_storage_id AND created_by = auth.uid();
    
    IF FOUND THEN
        RETURN true;
    END IF;
    
    -- Check if document is shared with user
    SELECT true INTO has_access
    FROM public.document_shares ds
    JOIN public.document_storage doc ON doc.id = ds.document_storage_id
    WHERE ds.document_storage_id = p_document_storage_id
    AND ds.shared_with = auth.uid()
    AND ds.is_active = true
    AND (ds.expires_at IS NULL OR ds.expires_at > NOW())
    AND (ds.max_access_count IS NULL OR ds.access_count < ds.max_access_count)
    AND (ds.permissions->p_access_type)::boolean = true;
    
    RETURN COALESCE(has_access, false);
END;
$$;

-- Trigger to update document_storage updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_document_storage_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_document_storage_updated_at
    BEFORE UPDATE ON public.document_storage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_document_storage_updated_at();

-- Trigger to update document_shares updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_document_shares_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_document_shares_updated_at
    BEFORE UPDATE ON public.document_shares
    FOR EACH ROW
    EXECUTE FUNCTION public.update_document_shares_updated_at();

-- Create storage buckets (this would typically be done via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('document-previews', 'document-previews', false);

-- Storage policies would be created here as well
-- These are commented out as they require the storage schema to be properly set up

COMMENT ON TABLE public.document_storage IS 'Secure storage tracking for generated documents with patient record linking';
COMMENT ON TABLE public.document_access_log IS 'Comprehensive audit trail for document access and operations';
COMMENT ON TABLE public.document_shares IS 'Document sharing management with internal and external sharing capabilities';
COMMENT ON TABLE public.document_versions IS 'Version control for stored documents';