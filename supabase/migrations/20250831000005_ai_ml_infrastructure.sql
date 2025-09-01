/*
  # AI/ML Infrastructure Setup

  1. **AI/ML Tables**
    - ml_models: Model metadata and versions
    - prediction_results: AI prediction outcomes
    - training_data: Historical data for model training
    - model_performance: Model accuracy and metrics
    - ai_service_configs: Configuration for external AI services

  2. **Indexes**
    - Optimized indexes for ML queries
    - Performance tracking indexes

  3. **Functions**
    - Model management utilities
    - Prediction logging functions

  4. **Security**
    - RLS policies for AI/ML data
    - Admin access controls
*/

-- Create ml_models table for model metadata and versions
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('no_show_prediction', 'scheduling_optimization', 'authorization_recommendation', 'ocr_extraction')),
  version VARCHAR NOT NULL,
  description TEXT,
  model_data JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  training_config JSONB DEFAULT '{}',
  deployment_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_deployed BOOLEAN DEFAULT false,
  model_file_path TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Create prediction_results table for AI prediction outcomes
CREATE TABLE IF NOT EXISTS public.prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  prediction_type VARCHAR NOT NULL,
  input_data JSONB NOT NULL,
  prediction JSONB NOT NULL,
  confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
  actual_outcome JSONB,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  appointment_id UUID,
  patient_id UUID,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create training_data table for historical data used in model training
CREATE TABLE IF NOT EXISTS public.training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR NOT NULL,
  dataset_name VARCHAR NOT NULL,
  data_source VARCHAR NOT NULL,
  feature_data JSONB NOT NULL,
  target_data JSONB NOT NULL,
  data_quality_score DECIMAL CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  is_validated BOOLEAN DEFAULT false,
  validation_notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create model_performance table for tracking model accuracy and metrics
CREATE TABLE IF NOT EXISTS public.model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  accuracy DECIMAL CHECK (accuracy >= 0 AND accuracy <= 1),
  precision_score DECIMAL CHECK (precision_score >= 0 AND precision_score <= 1),
  recall DECIMAL CHECK (recall >= 0 AND recall <= 1),
  f1_score DECIMAL CHECK (f1_score >= 0 AND f1_score <= 1),
  auc_roc DECIMAL CHECK (auc_roc >= 0 AND auc_roc <= 1),
  confusion_matrix JSONB,
  feature_importance JSONB,
  evaluation_metrics JSONB DEFAULT '{}',
  test_dataset_size INTEGER,
  evaluation_notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_service_configs table for external AI service configurations
CREATE TABLE IF NOT EXISTS public.ai_service_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR NOT NULL UNIQUE,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('ocr', 'nlp', 'ml_api', 'prediction')),
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  configuration JSONB DEFAULT '{}',
  rate_limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_predictions_cache table for caching frequent predictions
CREATE TABLE IF NOT EXISTS public.ai_predictions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR NOT NULL UNIQUE,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  input_hash VARCHAR NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence DECIMAL,
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create optimized indexes for ML queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_models_type_active 
ON public.ml_models (type, is_active, is_deployed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_models_version 
ON public.ml_models (name, version DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_results_model_time 
ON public.prediction_results (model_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_results_type_time 
ON public.prediction_results (prediction_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_results_appointment 
ON public.prediction_results (appointment_id) WHERE appointment_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_data_model_type 
ON public.training_data (model_type, is_validated);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_performance_model_date 
ON public.model_performance (model_id, evaluation_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_service_configs_active 
ON public.ai_service_configs (service_type, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_predictions_cache_key 
ON public.ai_predictions_cache (cache_key, expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_predictions_cache_expires 
ON public.ai_predictions_cache (expires_at) WHERE expires_at > NOW();

-- Create function to get active model by type
CREATE OR REPLACE FUNCTION get_active_model(model_type VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  version VARCHAR,
  model_data JSONB,
  deployment_config JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.version,
    m.model_data,
    m.deployment_config
  FROM public.ml_models m
  WHERE m.type = model_type 
    AND m.is_active = true 
    AND m.is_deployed = true
  ORDER BY m.created_at DESC
  LIMIT 1;
END;
$$;

-- Create function to log prediction result
CREATE OR REPLACE FUNCTION log_prediction_result(
  p_model_id UUID,
  p_prediction_type VARCHAR,
  p_input_data JSONB,
  p_prediction JSONB,
  p_confidence DECIMAL DEFAULT NULL,
  p_appointment_id UUID DEFAULT NULL,
  p_patient_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO public.prediction_results (
    model_id,
    prediction_type,
    input_data,
    prediction,
    confidence,
    appointment_id,
    patient_id,
    created_by
  ) VALUES (
    p_model_id,
    p_prediction_type,
    p_input_data,
    p_prediction,
    p_confidence,
    p_appointment_id,
    p_patient_id,
    auth.uid()
  )
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;

-- Create function to update model performance metrics
CREATE OR REPLACE FUNCTION update_model_performance(
  p_model_id UUID,
  p_accuracy DECIMAL,
  p_precision_score DECIMAL DEFAULT NULL,
  p_recall DECIMAL DEFAULT NULL,
  p_f1_score DECIMAL DEFAULT NULL,
  p_auc_roc DECIMAL DEFAULT NULL,
  p_confusion_matrix JSONB DEFAULT NULL,
  p_feature_importance JSONB DEFAULT NULL,
  p_evaluation_metrics JSONB DEFAULT '{}',
  p_test_dataset_size INTEGER DEFAULT NULL,
  p_evaluation_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  performance_id UUID;
BEGIN
  INSERT INTO public.model_performance (
    model_id,
    accuracy,
    precision_score,
    recall,
    f1_score,
    auc_roc,
    confusion_matrix,
    feature_importance,
    evaluation_metrics,
    test_dataset_size,
    evaluation_notes,
    created_by
  ) VALUES (
    p_model_id,
    p_accuracy,
    p_precision_score,
    p_recall,
    p_f1_score,
    p_auc_roc,
    p_confusion_matrix,
    p_feature_importance,
    p_evaluation_metrics,
    p_test_dataset_size,
    p_evaluation_notes,
    auth.uid()
  )
  RETURNING id INTO performance_id;
  
  RETURN performance_id;
END;
$$;

-- Create function to cache prediction
CREATE OR REPLACE FUNCTION cache_prediction(
  p_cache_key VARCHAR,
  p_model_id UUID,
  p_input_hash VARCHAR,
  p_prediction_data JSONB,
  p_confidence DECIMAL DEFAULT NULL,
  p_ttl_hours INTEGER DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cache_id UUID;
BEGIN
  INSERT INTO public.ai_predictions_cache (
    cache_key,
    model_id,
    input_hash,
    prediction_data,
    confidence,
    expires_at
  ) VALUES (
    p_cache_key,
    p_model_id,
    p_input_hash,
    p_prediction_data,
    p_confidence,
    NOW() + (p_ttl_hours || ' hours')::INTERVAL
  )
  ON CONFLICT (cache_key) DO UPDATE SET
    prediction_data = EXCLUDED.prediction_data,
    confidence = EXCLUDED.confidence,
    expires_at = EXCLUDED.expires_at,
    hit_count = ai_predictions_cache.hit_count + 1,
    updated_at = NOW()
  RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$;

-- Create function to get cached prediction
CREATE OR REPLACE FUNCTION get_cached_prediction(p_cache_key VARCHAR)
RETURNS TABLE (
  prediction_data JSONB,
  confidence DECIMAL,
  model_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update hit count and return cached prediction if not expired
  UPDATE public.ai_predictions_cache 
  SET hit_count = hit_count + 1, updated_at = NOW()
  WHERE cache_key = p_cache_key AND expires_at > NOW();
  
  RETURN QUERY
  SELECT 
    c.prediction_data,
    c.confidence,
    c.model_id
  FROM public.ai_predictions_cache c
  WHERE c.cache_key = p_cache_key 
    AND c.expires_at > NOW();
END;
$$;

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_predictions_cache 
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable RLS on AI/ML tables
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ml_models
CREATE POLICY "Users can view active models" ON public.ml_models
  FOR SELECT TO authenticated
  USING (is_active = true AND is_deployed = true);

CREATE POLICY "Admin users can manage all models" ON public.ml_models
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for prediction_results
CREATE POLICY "Users can view their own prediction results" ON public.prediction_results
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own prediction results" ON public.prediction_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin users can view all prediction results" ON public.prediction_results
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid OR auth.uid() = created_by);

-- Create RLS policies for training_data
CREATE POLICY "Admin users can manage training data" ON public.training_data
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for model_performance
CREATE POLICY "Users can view model performance" ON public.model_performance
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage model performance" ON public.model_performance
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for ai_service_configs
CREATE POLICY "Admin users can manage AI service configs" ON public.ai_service_configs
  FOR ALL TO authenticated
  USING (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid)
  WITH CHECK (auth.uid() = '62b5c370-9078-48ac-ae92-0229f29a1875'::uuid);

-- Create RLS policies for ai_predictions_cache
CREATE POLICY "Users can access prediction cache" ON public.ai_predictions_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can manage prediction cache" ON public.ai_predictions_cache
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_active_model TO authenticated;
GRANT EXECUTE ON FUNCTION log_prediction_result TO authenticated;
GRANT EXECUTE ON FUNCTION update_model_performance TO authenticated;
GRANT EXECUTE ON FUNCTION cache_prediction TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_prediction TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_predictions TO authenticated;

-- Create updated_at triggers for AI/ML tables
CREATE TRIGGER update_ml_models_updated_at
  BEFORE UPDATE ON public.ml_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prediction_results_updated_at
  BEFORE UPDATE ON public.prediction_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_data_updated_at
  BEFORE UPDATE ON public.training_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_service_configs_updated_at
  BEFORE UPDATE ON public.ai_service_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_predictions_cache_updated_at
  BEFORE UPDATE ON public.ai_predictions_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.ml_models IS 'Stores ML model metadata, versions, and deployment configurations';
COMMENT ON TABLE public.prediction_results IS 'Logs AI prediction outcomes and performance tracking';
COMMENT ON TABLE public.training_data IS 'Historical data used for model training and validation';
COMMENT ON TABLE public.model_performance IS 'Model accuracy metrics and performance evaluations';
COMMENT ON TABLE public.ai_service_configs IS 'Configuration for external AI services and APIs';
COMMENT ON TABLE public.ai_predictions_cache IS 'Caches frequent predictions for performance optimization';

COMMENT ON FUNCTION get_active_model IS 'Retrieves the active deployed model for a given type';
COMMENT ON FUNCTION log_prediction_result IS 'Logs a prediction result for tracking and evaluation';
COMMENT ON FUNCTION update_model_performance IS 'Updates model performance metrics after evaluation';
COMMENT ON FUNCTION cache_prediction IS 'Caches a prediction result for performance optimization';
COMMENT ON FUNCTION get_cached_prediction IS 'Retrieves a cached prediction if available and not expired';
COMMENT ON FUNCTION cleanup_expired_predictions IS 'Removes expired prediction cache entries';