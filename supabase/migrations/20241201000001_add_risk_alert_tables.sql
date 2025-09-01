-- Migration: Add risk alert and notification tables
-- Created: 2024-12-01
-- Description: Tables to support real-time risk alerts and notifications

-- Risk Alerts table
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL CHECK (alert_type IN ('high_no_show_risk', 'weather_alert', 'distance_alert', 'pattern_alert')),
  risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  alert_status VARCHAR DEFAULT 'active' CHECK (alert_status IN ('active', 'acknowledged', 'resolved', 'expired')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  action_taken TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  explanation TEXT,
  model_version VARCHAR NOT NULL DEFAULT '1.0.0',
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, assessed_at)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('high_risk_alert', 'appointment_reminder', 'system_alert', 'info')),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  email_high_risk_threshold INTEGER DEFAULT 70 CHECK (email_high_risk_threshold >= 0 AND email_high_risk_threshold <= 100),
  sms_high_risk_threshold INTEGER DEFAULT 80 CHECK (sms_high_risk_threshold >= 0 AND sms_high_risk_threshold <= 100),
  notification_frequency VARCHAR DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'hourly', 'daily', 'disabled')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  weekend_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Rules table for customizable alerting
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  rule_type VARCHAR NOT NULL CHECK (rule_type IN ('risk_threshold', 'pattern_detection', 'weather_based', 'time_based')),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History table for tracking alert effectiveness
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES risk_alerts(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  alert_sent_at TIMESTAMPTZ DEFAULT NOW(),
  notification_type VARCHAR NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'in_app')),
  recipient VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  response_time INTERVAL,
  action_taken VARCHAR,
  effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_alerts_appointment_id ON risk_alerts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_alert_status ON risk_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_risk_score ON risk_alerts(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at ON risk_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_appointment_id ON risk_assessments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_alert_rules_is_active ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_rule_type ON alert_rules(rule_type);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_appointment_id ON alert_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_sent_at ON alert_history(alert_sent_at);

-- RLS (Row Level Security) policies
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Policies for risk_alerts
CREATE POLICY "Users can view risk_alerts for their appointments" ON risk_alerts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = risk_alerts.appointment_id 
    AND (
      appointments.provider_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'staff')
      )
    )
  )
);

CREATE POLICY "System can manage risk_alerts" ON risk_alerts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

-- Policies for risk_assessments
CREATE POLICY "Users can view risk_assessments for their appointments" ON risk_assessments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = risk_assessments.appointment_id 
    AND (
      appointments.provider_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'staff')
      )
    )
  )
);

CREATE POLICY "System can manage risk_assessments" ON risk_assessments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

-- Policies for notification_settings
CREATE POLICY "Users can manage their own notification settings" ON notification_settings FOR ALL USING (user_id = auth.uid());

-- Policies for alert_rules
CREATE POLICY "Users can view alert_rules" ON alert_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage alert_rules" ON alert_rules FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policies for alert_history
CREATE POLICY "Users can view alert_history for their alerts" ON alert_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM risk_alerts 
    JOIN appointments ON appointments.id = risk_alerts.appointment_id
    WHERE risk_alerts.id = alert_history.alert_id 
    AND (
      appointments.provider_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'staff')
      )
    )
  )
);

CREATE POLICY "System can manage alert_history" ON alert_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'provider', 'staff')
  )
);

-- Triggers for updated_at columns
CREATE TRIGGER update_risk_alerts_updated_at BEFORE UPDATE ON risk_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old alerts
CREATE OR REPLACE FUNCTION expire_old_alerts()
RETURNS void AS $$
BEGIN
  UPDATE risk_alerts 
  SET alert_status = 'expired', updated_at = NOW()
  WHERE alert_status = 'active' 
  AND (
    expires_at < NOW() OR
    created_at < NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE (
    expires_at < NOW() OR
    (is_read = true AND created_at < NOW() - INTERVAL '30 days') OR
    (is_read = false AND created_at < NOW() - INTERVAL '90 days')
  );
END;
$$ LANGUAGE plpgsql;

-- Insert default notification settings for existing users
INSERT INTO notification_settings (user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled)
SELECT id, true, false, true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (name, description, rule_type, conditions, actions, is_active, priority, created_by) VALUES
(
  'High Risk No-Show Alert',
  'Alert when appointment has high no-show risk (>70%)',
  'risk_threshold',
  '{
    "risk_score_min": 0.7,
    "risk_levels": ["high"],
    "appointment_types": ["all"]
  }',
  '{
    "notifications": ["email", "in_app"],
    "escalation_delay": 3600,
    "max_alerts": 3
  }',
  true,
  1,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
  'Critical Risk Pattern Alert',
  'Alert when patient shows concerning no-show pattern',
  'pattern_detection',
  '{
    "no_show_rate_min": 0.5,
    "recent_no_shows": 2,
    "time_window_days": 30
  }',
  '{
    "notifications": ["email", "sms", "in_app"],
    "escalation_delay": 1800,
    "max_alerts": 2
  }',
  true,
  2,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
  'Weather Impact Alert',
  'Alert when severe weather may impact appointments',
  'weather_based',
  '{
    "precipitation_min": 1.0,
    "temperature_extreme": true,
    "wind_speed_min": 25
  }',
  '{
    "notifications": ["email", "in_app"],
    "escalation_delay": 7200,
    "max_alerts": 1
  }',
  true,
  3,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
)
ON CONFLICT DO NOTHING;