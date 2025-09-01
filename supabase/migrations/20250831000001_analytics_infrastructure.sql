/*
  # Analytics Infrastructure Setup

  1. **Analytics Tables**
    - analytics_metrics: Store computed metrics and KPIs
    - report_templates: Custom report definitions
    - scheduled_reports: Automated report generation
    - dashboard_configs: User-customized dashboards

  2. **Indexes**
    - Optimized indexes for analytics queries
    - Time-based partitioning support

  3. **Functions**
    - Real-time metrics computation
    - Report generation utilities

  4. **Security**
    - RLS policies for analytics data
    - Admin access controls
*/

-- Create analytics_metrics table for storing computed metrics
CREATE TABLE IF NOT EXISTS public.analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR NOT NULL,
  metric_value DECIMAL,
  dimensions JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  clinic_id UUID,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create report_templates table for custom report definitions
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scheduled_reports table for automated report generation
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.report_templates(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  schedule_config JSONB NOT NULL DEFAULT '{}',
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dashboard_configs table for user-customized dashboards
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  dashboard_name VARCHAR NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{}',
  widget_configs JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dashboard_name)
);

-- Create optimized indexes for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metrics_clinic_time 
ON public.analytics_metrics (clinic_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metrics_name_time 
ON public.analytics_metrics (metric_name, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metrics_user_time 
ON public.analytics_metrics (user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metrics_dimensions 
ON public.analytics_metrics USING GIN (dimensions);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_templates_public 
ON public.report_templates (is_public, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_reports_active 
ON public.scheduled_reports (is_active, next_run_at);

-- Create function to compute real-time patient flow metrics
CREATE OR REPLACE FUNCTION compute_patient_flow_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  clinic_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  total_appointments INTEGER,
  completed_appointments INTEGER,
  no_shows INTEGER,
  cancellations INTEGER,
  pending_appointments INTEGER,
  average_duration DECIMAL,
  completion_rate DECIMAL,
  no_show_rate DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_appointments,
    COUNT(*) FILTER (WHERE status = 'Completed')::INTEGER as completed_appointments,
    COUNT(*) FILTER (WHERE status = 'No-Show')::INTEGER as no_shows,
    COUNT(*) FILTER (WHERE status = 'Cancelled')::INTEGER as cancellations,
    COUNT(*) FILTER (WHERE status = 'Pending')::INTEGER as pending_appointments,
    AVG(duration_minutes)::DECIMAL as average_duration,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'Completed')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0 
    END as completion_rate,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'No-Show')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0 
    END as no_show_rate
  FROM public.appointments a
  WHERE a.appointment_time >= start_date 
    AND a.appointment_time <= end_date
    AND (clinic_filter IS NULL OR a.user_id = clinic_filter);
END;
$;

-- Create function to compute appointment utilization metrics
CREATE OR REPLACE FUNCTION compute_utilization_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  clinic_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  total_slots INTEGER,
  booked_slots INTEGER,
  available_slots INTEGER,
  utilization_rate DECIMAL,
  peak_hours JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  WITH hourly_bookings AS (
    SELECT 
      EXTRACT(HOUR FROM appointment_time) as hour,
      COUNT(*) as bookings
    FROM public.appointments a
    WHERE a.appointment_time >= start_date 
      AND a.appointment_time <= end_date
      AND a.status IN ('Confirmed', 'Completed')
      AND (clinic_filter IS NULL OR a.user_id = clinic_filter)
    GROUP BY EXTRACT(HOUR FROM appointment_time)
  ),
  peak_calculation AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour,
        'bookings', bookings
      ) ORDER BY bookings DESC
    ) as peak_data
    FROM hourly_bookings
    LIMIT 3
  )
  SELECT 
    -- Assuming 8-hour workday with 30-minute slots = 16 slots per day
    (EXTRACT(DAYS FROM (end_date - start_date)) * 16)::INTEGER as total_slots,
    COUNT(a.id)::INTEGER as booked_slots,
    ((EXTRACT(DAYS FROM (end_date - start_date)) * 16) - COUNT(a.id))::INTEGER as available_slots,
    CASE 
      WHEN EXTRACT(DAYS FROM (end_date - start_date)) > 0 THEN
        (COUNT(a.id)::DECIMAL / (EXTRACT(DAYS FROM (end_date - start_date)) * 16) * 100)
      ELSE 0 
    END as utilization_rate,
    COALESCE(pc.peak_data, '[]'::jsonb) as peak_hours
  FROM public.appointments a
  CROSS JOIN peak_calculation pc
  WHERE a.appointment_time >= start_date 
    AND a.appointment_time <= end_date
    AND a.status IN ('Confirmed', 'Completed')
    AND (clinic_filter IS NULL OR a.user_id = clinic_filter);
END;
$;

-- Create function to compute revenue metrics (placeholder - would integrate with billing system)
CREATE OR REPLACE FUNCTION compute_revenue_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  clinic_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  total_appointments INTEGER,
  estimated_revenue DECIMAL,
  average_per_appointment DECIMAL,
  revenue_trend JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  WITH daily_revenue AS (
    SELECT 
      DATE(appointment_time) as revenue_date,
      COUNT(*) as appointments,
      -- Placeholder calculation - would use actual billing data
      COUNT(*) * 150.00 as daily_revenue
    FROM public.appointments a
    WHERE a.appointment_time >= start_date 
      AND a.appointment_time <= end_date
      AND a.status = 'Completed'
      AND (clinic_filter IS NULL OR a.user_id = clinic_filter)
    GROUP BY DATE(appointment_time)
    ORDER BY revenue_date
  )
  SELECT 
    SUM(appointments)::INTEGER as total_appointments,
    SUM(daily_revenue)::DECIMAL as estimated_revenue,
    CASE 
      WHEN SUM(appointments) > 0 THEN 
        (SUM(daily_revenue) / SUM(appointments))::DECIMAL
      ELSE 0 
    END as average_per_appointment,
    jsonb_agg(
      jsonb_build_object(
        'date', revenue_date,
        'revenue', daily_revenue,
        'appointments', appointments
      ) ORDER BY revenue_date
    ) as revenue_trend
  FROM daily_revenue;
END;
$;

-- Create function to store computed metrics
CREATE OR REPLACE FUNCTION store_analytics_metric(
  p_metric_name VARCHAR,
  p_metric_value DECIMAL,
  p_dimensions JSONB DEFAULT '{}',
  p_clinic_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO public.analytics_metrics (
    metric_name,
    metric_value,
    dimensions,
    clinic_id,
    user_id
  ) VALUES (
    p_metric_name,
    p_metric_value,
    p_dimensions,
    p_clinic_id,
    COALESCE(p_user_id, auth.uid())
  )
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$;

-- Enable RLS on analytics tables
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics_metrics
CREATE POLICY "Users can view their own analytics metrics" ON public.analytics_metrics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics metrics" ON public.analytics_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin user has full access to analytics_metrics" ON public.analytics_metrics
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = user_id);

-- Create RLS policies for report_templates
CREATE POLICY "Users can view public and own report templates" ON public.report_templates
  FOR SELECT TO authenticated
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own report templates" ON public.report_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own report templates" ON public.report_templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin user has full access to report_templates" ON public.report_templates
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by);

-- Create RLS policies for scheduled_reports
CREATE POLICY "Users can manage their own scheduled reports" ON public.scheduled_reports
  FOR ALL TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin user has full access to scheduled_reports" ON public.scheduled_reports
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by);

-- Create RLS policies for dashboard_configs
CREATE POLICY "Users can manage their own dashboard configs" ON public.dashboard_configs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin user has full access to dashboard_configs" ON public.dashboard_configs
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = user_id);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION compute_patient_flow_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION compute_utilization_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION compute_revenue_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION store_analytics_metric TO authenticated;

-- Create updated_at triggers for analytics tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_metrics_updated_at
  BEFORE UPDATE ON public.analytics_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.analytics_metrics IS 'Stores computed metrics and KPIs for analytics dashboard';
COMMENT ON TABLE public.report_templates IS 'Custom report definitions and templates';
COMMENT ON TABLE public.scheduled_reports IS 'Automated report generation configurations';
COMMENT ON TABLE public.dashboard_configs IS 'User-customized dashboard layouts and widgets';

COMMENT ON FUNCTION compute_patient_flow_metrics IS 'Computes real-time patient flow metrics including appointments, completions, and no-shows';
COMMENT ON FUNCTION compute_utilization_metrics IS 'Computes appointment utilization and capacity metrics';
COMMENT ON FUNCTION compute_revenue_metrics IS 'Computes revenue metrics and trends (placeholder for billing integration)';
COMMENT ON FUNCTION store_analytics_metric IS 'Stores a computed metric in the analytics_metrics table';