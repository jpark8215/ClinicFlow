-- Create export_jobs table for tracking export operations
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  format VARCHAR NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
  data_type VARCHAR CHECK (data_type IN ('report', 'analytics', 'raw_data')),
  template_id UUID REFERENCES report_templates(id),
  template_ids UUID[], -- For bulk exports
  date_range JSONB,
  filters JSONB DEFAULT '{}',
  options JSONB DEFAULT '{}',
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  download_url TEXT,
  file_size BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_template_id ON export_jobs(template_id);

-- Enable Row Level Security
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own export jobs" ON export_jobs
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create export jobs" ON export_jobs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own export jobs" ON export_jobs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own export jobs" ON export_jobs
  FOR DELETE USING (auth.uid() = created_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_export_jobs_updated_at
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_export_jobs_updated_at();

-- Create storage bucket for export files
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for export files
CREATE POLICY "Users can upload export files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their export files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their export files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add helpful comments
COMMENT ON TABLE export_jobs IS 'Tracks export job status and metadata for reports and analytics data';
COMMENT ON COLUMN export_jobs.format IS 'Export format: pdf, excel, or csv';
COMMENT ON COLUMN export_jobs.data_type IS 'Type of data being exported: report, analytics, or raw_data';
COMMENT ON COLUMN export_jobs.template_ids IS 'Array of template IDs for bulk exports';
COMMENT ON COLUMN export_jobs.date_range IS 'JSON object with startDate and endDate for the export';
COMMENT ON COLUMN export_jobs.filters IS 'JSON object containing export filters and parameters';
COMMENT ON COLUMN export_jobs.options IS 'JSON object containing export options like includeCharts, clinicId, etc.';
COMMENT ON COLUMN export_jobs.progress IS 'Export progress percentage (0-100)';
COMMENT ON COLUMN export_jobs.download_url IS 'URL for downloading the completed export file';
COMMENT ON COLUMN export_jobs.file_size IS 'Size of the exported file in bytes';
COMMENT ON COLUMN export_jobs.metadata IS 'Additional metadata about the export job';