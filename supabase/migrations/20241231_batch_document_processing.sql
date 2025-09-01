-- Batch Document Processing Tables

-- Batch document jobs table
CREATE TABLE IF NOT EXISTS batch_document_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    template_id UUID REFERENCES document_templates(id),
    requests JSONB NOT NULL DEFAULT '[]',
    priority VARCHAR NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'paused', 'completed', 'failed', 'cancelled')),
    progress JSONB NOT NULL DEFAULT '{"totalDocuments": 0, "processedDocuments": 0, "successfulDocuments": 0, "failedDocuments": 0}',
    settings JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch job queue table
CREATE TABLE IF NOT EXISTS batch_job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES batch_document_jobs(id) ON DELETE CASCADE,
    priority VARCHAR NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    estimated_start_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch job results table
CREATE TABLE IF NOT EXISTS batch_job_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES batch_document_jobs(id) ON DELETE CASCADE,
    result_data JSONB NOT NULL DEFAULT '{}',
    output_files JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed document requests table for retry tracking
CREATE TABLE IF NOT EXISTS failed_document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES batch_document_jobs(id) ON DELETE CASCADE,
    request_id VARCHAR NOT NULL,
    document_name VARCHAR NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_document_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_priority ON batch_document_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_by ON batch_document_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_template_id ON batch_document_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_document_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_batch_queue_priority ON batch_job_queue(priority);
CREATE INDEX IF NOT EXISTS idx_batch_queue_queued_at ON batch_job_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_batch_queue_job_id ON batch_job_queue(job_id);

CREATE INDEX IF NOT EXISTS idx_batch_results_job_id ON batch_job_results(job_id);
CREATE INDEX IF NOT EXISTS idx_failed_requests_job_id ON failed_document_requests(job_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_batch_jobs_updated_at 
    BEFORE UPDATE ON batch_document_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE batch_document_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_document_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own batch jobs
CREATE POLICY "Users can view own batch jobs" ON batch_document_jobs
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create batch jobs" ON batch_document_jobs
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own batch jobs" ON batch_document_jobs
    FOR UPDATE USING (auth.uid() = created_by);

-- Queue policies (system-level access)
CREATE POLICY "Users can view queue for own jobs" ON batch_job_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM batch_document_jobs 
            WHERE id = job_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage queue" ON batch_job_queue
    FOR ALL USING (true);

-- Results policies
CREATE POLICY "Users can view own job results" ON batch_job_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM batch_document_jobs 
            WHERE id = job_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage results" ON batch_job_results
    FOR ALL USING (true);

-- Failed requests policies
CREATE POLICY "Users can view own failed requests" ON failed_document_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM batch_document_jobs 
            WHERE id = job_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage failed requests" ON failed_document_requests
    FOR ALL USING (true);

-- Functions for batch processing

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_batch_queue_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalJobs', (SELECT COUNT(*) FROM batch_document_jobs WHERE created_at >= NOW() - INTERVAL '24 hours'),
        'queuedJobs', (SELECT COUNT(*) FROM batch_job_queue),
        'processingJobs', (SELECT COUNT(*) FROM batch_document_jobs WHERE status = 'processing'),
        'completedJobs', (SELECT COUNT(*) FROM batch_document_jobs WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours'),
        'failedJobs', (SELECT COUNT(*) FROM batch_document_jobs WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'),
        'averageProcessingTime', (
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 0)
            FROM batch_document_jobs 
            WHERE status = 'completed' 
            AND started_at IS NOT NULL 
            AND completed_at IS NOT NULL
            AND created_at >= NOW() - INTERVAL '24 hours'
        ),
        'currentThroughput', (
            SELECT COALESCE(COUNT(*) / 24.0, 0)
            FROM batch_document_jobs 
            WHERE status = 'completed' 
            AND created_at >= NOW() - INTERVAL '24 hours'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_batch_jobs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM batch_document_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next jobs from queue
CREATE OR REPLACE FUNCTION get_next_queue_jobs(max_jobs INTEGER DEFAULT 5)
RETURNS TABLE (
    job_id UUID,
    priority VARCHAR,
    queued_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.job_id,
        q.priority,
        q.queued_at
    FROM batch_job_queue q
    JOIN batch_document_jobs j ON q.job_id = j.id
    WHERE j.status = 'queued'
    ORDER BY 
        CASE q.priority 
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 1
            ELSE 2
        END DESC,
        q.queued_at ASC
    LIMIT max_jobs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON batch_document_jobs TO authenticated;
GRANT ALL ON batch_job_queue TO authenticated;
GRANT ALL ON batch_job_results TO authenticated;
GRANT ALL ON failed_document_requests TO authenticated;

GRANT EXECUTE ON FUNCTION get_batch_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_batch_jobs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_queue_jobs(INTEGER) TO authenticated;