import { supabase } from '@/integrations/supabase/client';
import { mlIntegrationService } from './mlIntegrationService';
import { NoShowPrediction, RiskFactor } from '@/types/aiml';

/**
 * Real-time risk assessment service for appointment no-show predictions
 * Provides immediate risk calculation and automated alerting
 */
export class RealTimeRiskAssessmentService {
  private riskThresholds = {
    low: 0.3,
    medium: 0.7,
    high: 1.0
  };

  private alertSubscriptions = new Map<string, Set<string>>();
  private riskCache = new Map<string, { prediction: NoShowPrediction; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Calculate real-time risk for a new or updated appointment
   */
  async calculateRealTimeRisk(appointmentId: string): Promise<NoShowPrediction | null> {
    try {
      // Check cache first
      const cached = this.getCachedRisk(appointmentId);
      if (cached) {
        return cached;
      }

      // Get fresh prediction
      const prediction = await mlIntegrationService.getAppointmentRiskPrediction(appointmentId);
      
      if (prediction) {
        // Cache the result
        this.cacheRisk(appointmentId, prediction);
        
        // Check if alerts should be triggered
        await this.processRiskAlerts(appointmentId, prediction);
        
        // Store risk assessment in database
        await this.storeRiskAssessment(appointmentId, prediction);
        
        return prediction;
      }

      return null;
    } catch (error) {
      console.error('Error calculating real-time risk:', error);
      return null;
    }
  }

  /**
   * Process risk alerts for high-risk appointments
   */
  private async processRiskAlerts(appointmentId: string, prediction: NoShowPrediction): Promise<void> {
    if (prediction.riskLevel === 'high' || prediction.riskScore >= this.riskThresholds.medium) {
      await this.triggerRiskAlert(appointmentId, prediction);
    }
  }

  /**
   * Trigger risk alert for high-risk appointment
   */
  private async triggerRiskAlert(appointmentId: string, prediction: NoShowPrediction): Promise<void> {
    try {
      // Get appointment details
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          providers (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        console.error('Error fetching appointment for alert:', error);
        return;
      }

      // Create alert record
      const alertData = {
        appointment_id: appointmentId,
        alert_type: 'high_no_show_risk',
        risk_score: prediction.riskScore,
        risk_level: prediction.riskLevel,
        risk_factors: prediction.factors,
        recommendations: prediction.recommendations,
        alert_status: 'active',
        created_at: new Date().toISOString()
      };

      // Store alert in database
      const { error: alertError } = await supabase
        .from('risk_alerts')
        .insert(alertData);

      if (alertError) {
        console.error('Error storing risk alert:', alertError);
      }

      // Send notifications
      await this.sendRiskNotifications(appointment, prediction);

    } catch (error) {
      console.error('Error triggering risk alert:', error);
    }
  }

  /**
   * Send risk notifications via email and SMS
   */
  private async sendRiskNotifications(appointment: any, prediction: NoShowPrediction): Promise<void> {
    const riskPercentage = Math.round(prediction.riskScore * 100);
    const appointmentTime = new Date(appointment.appointment_time).toLocaleString();
    
    // Prepare notification content
    const subject = `High No-Show Risk Alert - ${appointment.patients?.first_name} ${appointment.patients?.last_name}`;
    const message = this.buildAlertMessage(appointment, prediction, riskPercentage, appointmentTime);

    // Send email notification to provider
    if (appointment.providers?.email) {
      await this.sendEmailNotification(
        appointment.providers.email,
        subject,
        message
      );
    }

    // Send SMS notification if configured
    await this.sendSMSNotification(appointment, prediction, riskPercentage);

    // Send in-app notification
    await this.sendInAppNotification(appointment, prediction);
  }

  /**
   * Build alert message content
   */
  private buildAlertMessage(appointment: any, prediction: NoShowPrediction, riskPercentage: number, appointmentTime: string): string {
    const topFactors = prediction.factors.slice(0, 3).map(f => f.factor).join(', ');
    
    return `
High No-Show Risk Alert

Patient: ${appointment.patients?.first_name} ${appointment.patients?.last_name}
Appointment: ${appointmentTime}
Risk Score: ${riskPercentage}%
Risk Level: ${prediction.riskLevel.toUpperCase()}

Top Risk Factors: ${topFactors}

Recommendations:
${prediction.recommendations.map(r => `• ${r}`).join('\n')}

Please take proactive measures to confirm this appointment.
    `.trim();
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, subject: string, message: string): Promise<void> {
    try {
      // Use Supabase Edge Function for email sending
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject,
          message,
          type: 'risk_alert'
        }
      });

      if (error) {
        console.error('Error sending email notification:', error);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(appointment: any, prediction: NoShowPrediction, riskPercentage: number): Promise<void> {
    try {
      // Get SMS configuration
      const { data: smsConfig } = await supabase
        .from('notification_settings')
        .select('sms_enabled, sms_high_risk_threshold')
        .eq('user_id', appointment.provider_id)
        .single();

      if (!smsConfig?.sms_enabled || riskPercentage < (smsConfig.sms_high_risk_threshold || 80)) {
        return;
      }

      const smsMessage = `High risk (${riskPercentage}%) no-show alert for ${appointment.patients?.first_name} ${appointment.patients?.last_name} at ${new Date(appointment.appointment_time).toLocaleTimeString()}. Please confirm appointment.`;

      // Use Supabase Edge Function for SMS sending
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: appointment.providers?.phone || appointment.patients?.phone,
          message: smsMessage,
          type: 'risk_alert'
        }
      });

      if (error) {
        console.error('Error sending SMS notification:', error);
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(appointment: any, prediction: NoShowPrediction): Promise<void> {
    try {
      const notificationData = {
        user_id: appointment.provider_id,
        type: 'high_risk_alert',
        title: 'High No-Show Risk Alert',
        message: `${appointment.patients?.first_name} ${appointment.patients?.last_name} has ${Math.round(prediction.riskScore * 100)}% no-show risk`,
        data: {
          appointment_id: appointment.id,
          risk_score: prediction.riskScore,
          risk_level: prediction.riskLevel,
          recommendations: prediction.recommendations
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) {
        console.error('Error sending in-app notification:', error);
      }
    } catch (error) {
      console.error('Error sending in-app notification:', error);
    }
  }

  /**
   * Get cached risk assessment
   */
  private getCachedRisk(appointmentId: string): NoShowPrediction | null {
    const cached = this.riskCache.get(appointmentId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.prediction;
    }
    return null;
  }

  /**
   * Cache risk assessment
   */
  private cacheRisk(appointmentId: string, prediction: NoShowPrediction): void {
    this.riskCache.set(appointmentId, {
      prediction,
      timestamp: Date.now()
    });
  }

  /**
   * Store risk assessment in database
   */
  private async storeRiskAssessment(appointmentId: string, prediction: NoShowPrediction): Promise<void> {
    try {
      const { error } = await supabase
        .from('risk_assessments')
        .upsert({
          appointment_id: appointmentId,
          risk_score: prediction.riskScore,
          risk_level: prediction.riskLevel,
          risk_factors: prediction.factors,
          recommendations: prediction.recommendations,
          explanation: prediction.explanation,
          assessed_at: new Date().toISOString(),
          model_version: '1.0.0'
        });

      if (error) {
        console.error('Error storing risk assessment:', error);
      }
    } catch (error) {
      console.error('Error storing risk assessment:', error);
    }
  }

  /**
   * Subscribe to risk alerts for specific appointments or providers
   */
  subscribeToRiskAlerts(subscriberId: string, appointmentIds: string[]): void {
    if (!this.alertSubscriptions.has(subscriberId)) {
      this.alertSubscriptions.set(subscriberId, new Set());
    }
    
    const subscriptions = this.alertSubscriptions.get(subscriberId)!;
    appointmentIds.forEach(id => subscriptions.add(id));
  }

  /**
   * Unsubscribe from risk alerts
   */
  unsubscribeFromRiskAlerts(subscriberId: string, appointmentIds?: string[]): void {
    const subscriptions = this.alertSubscriptions.get(subscriberId);
    if (!subscriptions) return;

    if (appointmentIds) {
      appointmentIds.forEach(id => subscriptions.delete(id));
    } else {
      this.alertSubscriptions.delete(subscriberId);
    }
  }

  /**
   * Get active risk alerts for a date range
   */
  async getActiveRiskAlerts(startDate: Date, endDate: Date, providerId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('risk_alerts')
        .select(`
          *,
          appointments (
            id,
            appointment_time,
            status,
            patients (
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .eq('alert_status', 'active')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (providerId) {
        query = query.eq('appointments.provider_id', providerId);
      }

      const { data, error } = await query.order('risk_score', { ascending: false });

      if (error) {
        console.error('Error fetching active risk alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching active risk alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge risk alert
   */
  async acknowledgeRiskAlert(alertId: string, userId: string, action?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('risk_alerts')
        .update({
          alert_status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
          action_taken: action
        })
        .eq('id', alertId);

      if (error) {
        console.error('Error acknowledging risk alert:', error);
      }
    } catch (error) {
      console.error('Error acknowledging risk alert:', error);
    }
  }

  /**
   * Update risk thresholds
   */
  updateRiskThresholds(thresholds: { low: number; medium: number; high: number }): void {
    this.riskThresholds = { ...thresholds };
  }

  /**
   * Get risk statistics for a provider or clinic
   */
  async getRiskStatistics(providerId?: string, clinicId?: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('risk_assessments')
        .select('risk_score, risk_level, assessed_at')
        .gte('assessed_at', startDate.toISOString());

      if (providerId) {
        query = query.eq('appointments.provider_id', providerId);
      }

      if (clinicId) {
        query = query.eq('appointments.clinic_id', clinicId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching risk statistics:', error);
        return null;
      }

      const stats = {
        totalAssessments: data?.length || 0,
        averageRiskScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        trendData: [] as any[]
      };

      if (data && data.length > 0) {
        stats.averageRiskScore = data.reduce((sum, item) => sum + item.risk_score, 0) / data.length;
        
        data.forEach(item => {
          stats.riskDistribution[item.risk_level as keyof typeof stats.riskDistribution]++;
        });

        // Group by day for trend analysis
        const dailyStats = new Map<string, { total: number; sum: number }>();
        data.forEach(item => {
          const day = new Date(item.assessed_at).toDateString();
          const existing = dailyStats.get(day) || { total: 0, sum: 0 };
          existing.total++;
          existing.sum += item.risk_score;
          dailyStats.set(day, existing);
        });

        stats.trendData = Array.from(dailyStats.entries()).map(([date, stats]) => ({
          date,
          averageRisk: stats.sum / stats.total,
          assessmentCount: stats.total
        }));
      }

      return stats;
    } catch (error) {
      console.error('Error calculating risk statistics:', error);
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.riskCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.riskCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const realTimeRiskAssessmentService = new RealTimeRiskAssessmentService();

// Set up periodic cache cleanup
setInterval(() => {
  realTimeRiskAssessmentService.clearExpiredCache();
}, 5 * 60 * 1000); // Every 5 minutes