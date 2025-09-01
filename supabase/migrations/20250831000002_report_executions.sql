/*
  # Report Executions Table

  1. **New Table**
    - report_executions: Track execution history of scheduled reports

  2. **Indexes**
    - Optimized indexes for execution queries

  3. **Security**
    - RLS policies for execution data
*/

-- Create report_executions table for tracking execution history
CREATE TABLE IF NOT EXISTS public.report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  execution_duration INTEGER, -- Duration in milliseconds
  recipient_count INTEGER DEFAULT 0,
  error_message TEXT,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for report_executions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_executions_scheduled_report 
ON public.report_executions (scheduled_report_id, executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_executions_status 
ON public.report_executions (status, executed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_executions_executed_at 
ON public.report_executions (executed_at DESC);

-- Enable RLS on report_executions table
ALTER TABLE public.report_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for report_executions
CREATE POLICY "Users can view executions of their own scheduled reports" ON public.report_executions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert executions for their own scheduled reports" ON public.report_executions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update executions of their own scheduled reports" ON public.report_executions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin user has full access to report_executions" ON public.report_executions
  FOR ALL TO authenticated
  USING (
    auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR
    EXISTS (
      SELECT 1 FROM public.scheduled_reports sr 
      WHERE sr.id = report_executions.scheduled_report_id 
      AND sr.created_by = auth.uid()
    )
  );

-- Create updated_at trigger for report_executions
CREATE TRIGGER update_report_executions_updated_at
  BEFORE UPDATE ON public.report_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.report_executions IS 'Tracks execution history and results of scheduled reports';

-- Create function to clean up old execution records (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_report_executions(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.report_executions
  WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$;

COMMENT ON FUNCTION cleanup_old_report_executions IS 'Cleans up old report execution records older than specified days (default 90 days)';

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_report_executions TO authenticated;