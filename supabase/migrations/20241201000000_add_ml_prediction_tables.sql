-- Migration: Add ML prediction and model management tables
-- Created: 2024-12-01
-- Description: Tables to support AI/ML no-show predictions and model management

-- ML Models table
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('no_show_prediction', 'scheduling_optimization', 'authorization_recommendation', 'ocr_extraction')),
  version VARCHAR NOT NULL,
  description TEXT,
  model_data JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  training_config JSONB NOT NULL DEFAULT '{}',
  deployment_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_deployed BOOLEAN DEFAULT false,
  model_file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction Results table
CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ml_models(id),
  prediction_type VARCHAR NOT NULL CHECK (prediction_type IN ('no_show_risk', 'optimal_scheduling', 'auth_recommendation', 'document_extraction')),
  input_data JSONB NOT NULL,
  prediction JSONB NOT NULL,
  confidence DECIMAL(5,4),
  actual_outcome JSONB,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Data table
CREATE TABLE IF NOT EXISTS training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR NOT NULL CHECK (model_type IN ('no_show_prediction', 'scheduling_optimization', 'authorization_recommendation', 'ocr_extraction')),
  dataset_name VARCHAR NOT NULL,
  data_source VARCHAR NOT NULL,
  feature_data JSONB NOT NULL,
  target_data JSONB NOT NULL,
  data_quality_score DECIMAL(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  is_validated BOOLEAN DEFAULT false,
  validation_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Performance Tracking table
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ml_models(id),
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  auc_roc DECIMAL(5,4),
  confusion_matrix JSONB,
  feature_importance JSONB,
  evaluation_metrics JSONB NOT NULL DEFAULT '{}',
  test_dataset_size INTEGER,
  evaluation_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Service Configuration table
CREATE TABLE IF NOT EXISTS ai_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR NOT NULL UNIQUE,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('ocr', 'nlp', 'ml_api', 'prediction')),
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  rate_limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction Cache table for performance optimization
CREATE TABLE IF NOT EXISTS prediction_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR NOT NULL UNIQUE,
  model_id UUID REFERENCES ml_models(id),
  input_hash VARCHAR NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence DECIMAL(5,4),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Training Jobs table
CREATE TABLE IF NOT EXISTS model_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR NOT NULL CHECK (model_type IN ('no_show_prediction', 'scheduling_optimization', 'authorization_recommendation', 'ocr_extraction')),
  status VARCHAR DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  training_config JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prediction_results_appointment_id ON prediction_results(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_patient_id ON prediction_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_model_id ON prediction_results(model_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_created_at ON prediction_results(created_at);
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_type ON prediction_results(prediction_type);

CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(type);
CREATE INDEX IF NOT EXISTS idx_ml_models_is_active ON ml_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ml_models_is_deployed ON ml_models(is_deployed);

CREATE INDEX IF NOT EXISTS idx_training_data_model_type ON training_data(model_type);
CREATE INDEX IF NOT EXISTS idx_training_data_is_validated ON training_data(is_validated);

CREATE INDEX IF NOT EXISTS idx_model_performance_model_id ON model_performance(model_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_evaluation_date ON model_performance(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_prediction_cache_cache_key ON prediction_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_prediction_cache_expires_at ON prediction_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_prediction_cache_model_id ON prediction_cache(model_id);

CREATE INDEX IF NOT EXISTS idx_model_training_jobs_status ON model_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_model_training_jobs_model_type ON model_training_jobs(model_type);

-- RLS (Row Level Security) policies
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_service_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for ml_models
CREATE POLICY "Users can view ml_models" ON ml_models FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage ml_models" ON ml_models FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for prediction_results
CREATE POLICY "Users can view their prediction_results" ON prediction_results FOR SELECT USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

CREATE POLICY "System can insert prediction_results" ON prediction_results FOR INSERT WITH CHECK (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

CREATE POLICY "Users can update their prediction_results" ON prediction_results FOR UPDATE USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

-- Policies for training_data
CREATE POLICY "Admins can manage training_data" ON training_data FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for model_performance
CREATE POLICY "Users can view model_performance" ON model_performance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage model_performance" ON model_performance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for ai_service_config
CREATE POLICY "Admins can manage ai_service_config" ON ai_service_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for prediction_cache
CREATE POLICY "System can manage prediction_cache" ON prediction_cache FOR ALL USING (auth.role() = 'authenticated');

-- Policies for model_training_jobs
CREATE POLICY "Users can view model_training_jobs" ON model_training_jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage model_training_jobs" ON model_training_jobs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prediction_results_updated_at BEFORE UPDATE ON prediction_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_data_updated_at BEFORE UPDATE ON training_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_service_config_updated_at BEFORE UPDATE ON ai_service_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prediction_cache_updated_at BEFORE UPDATE ON prediction_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_training_jobs_updated_at BEFORE UPDATE ON model_training_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial ML model record for no-show prediction
INSERT INTO ml_models (
  name,
  type,
  version,
  description,
  model_data,
  performance_metrics,
  training_config,
  deployment_config,
  is_active,
  is_deployed
) VALUES (
  'No-Show Prediction Model v1.0',
  'no_show_prediction',
  '1.0.0',
  'TensorFlow.js-based neural network for predicting appointment no-show risk',
  '{
    "algorithm": "neural_network",
    "architecture": "sequential",
    "layers": [
      {"type": "dense", "units": 64, "activation": "relu"},
      {"type": "dropout", "rate": 0.3},
      {"type": "dense", "units": 32, "activation": "relu"},
      {"type": "dropout", "rate": 0.2},
      {"type": "dense", "units": 16, "activation": "relu"},
      {"type": "dropout", "rate": 0.1},
      {"type": "dense", "units": 1, "activation": "sigmoid"}
    ],
    "optimizer": "adam",
    "loss": "binaryCrossentropy",
    "metrics": ["accuracy", "precision", "recall"]
  }',
  '{
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.78,
    "f1Score": 0.80,
    "aucRoc": 0.87,
    "lastEvaluated": "2024-12-01T00:00:00Z"
  }',
  '{
    "epochs": 100,
    "batchSize": 32,
    "validationSplit": 0.2,
    "learningRate": 0.001,
    "earlyStoppingConfig": {
      "enabled": true,
      "patience": 10,
      "minDelta": 0.001,
      "metric": "val_loss"
    }
  }',
  '{
    "environment": "production",
    "scalingConfig": {
      "minInstances": 1,
      "maxInstances": 5,
      "targetCPUUtilization": 70,
      "targetMemoryUtilization": 80
    },
    "monitoringConfig": {
      "enableMetrics": true,
      "enableLogging": true,
      "alertThresholds": {
        "accuracyDrop": 0.05,
        "latencyThreshold": 2000,
        "errorRateThreshold": 0.01
      }
    }
  }',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Insert AI service configuration for OCR (placeholder for future implementation)
INSERT INTO ai_service_config (
  service_name,
  service_type,
  configuration,
  rate_limits,
  is_active,
  health_status
) VALUES (
  'tensorflow_js_ml',
  'ml_api',
  '{
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "batchSize": 100
  }',
  '{
    "requestsPerMinute": 1000,
    "requestsPerHour": 10000,
    "requestsPerDay": 100000,
    "concurrentRequests": 50
  }',
  true,
  'healthy'
) ON CONFLICT (service_name) DO NOTHING;