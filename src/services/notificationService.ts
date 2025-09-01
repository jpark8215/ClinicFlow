import { supabase } from '@/integrations/supabase/client';

export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  email_high_risk_threshold: number;
  sms_high_risk_threshold: number;
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'disabled';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  weekend_notifications: boolean;
}

export interface NotificationData {
  user_id: string;
  type: 'high_risk_alert' | 'appointment_reminder' | 'system_alert' | 'info';
  title: string;
  message: string;
  data?: Record<string, any>;
  expires_at?: Date;
}

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'risk_alert' | 'reminder' | 'system';
  template?: string;
  data?: Record<string, any>;
}

export interface SMSNotification {
  to: string;
  message: string;
  type: 'risk_alert' | 'reminder' | 'system';
}

/**
 * Comprehensive notification service for managing alerts and communications
 */
export class NotificationService {
  private notificationQueue: Map<string, NotificationData[]> = new Map();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  /**
   * Send notification based on user preferences
   */
  async sendNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user notification settings
      const settings = await this.getUserNotificationSettings(notification.user_id);
      
      if (!settings) {
        console.warn('No notification settings found for user:', notification.user_id);
        return;
      }

      // Check if notifications are enabled and within quiet hours
      if (!this.shouldSendNotification(settings, notification)) {
        await this.queueNotification(notification);
        return;
      }

      // Check rate limits
      if (!this.checkRateLimit(notification.user_id, notification.type)) {
        console.warn('Rate limit exceeded for user:', notification.user_id);
        return;
      }

      // Send in-app notification (always send if enabled)
      if (settings.in_app_enabled) {
        await this.sendInAppNotification(notification);
      }

      // Send email notification if enabled and threshold met
      if (settings.email_enabled && this.meetsThreshold(notification, settings.email_high_risk_threshold)) {
        await this.sendEmailNotification(notification);
      }

      // Send SMS notification if enabled and threshold met
      if (settings.sms_enabled && this.meetsThreshold(notification, settings.sms_high_risk_threshold)) {
        await this.sendSMSNotification(notification);
      }

      // Send push notification if enabled
      if (settings.push_enabled) {
        await this.sendPushNotification(notification);
      }

      // Update rate limit
      this.updateRateLimit(notification.user_id, notification.type);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(notifications: NotificationData[]): Promise<void> {
    const batchSize = 10;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await Promise.all(batch.map(notification => this.sendNotification(notification)));
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: NotificationData): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          expires_at: notification.expires_at?.toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending in-app notification:', error);
      }
    } catch (error) {
      console.error('Error sending in-app notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', notification.user_id)
        .single();

      if (userError || !user?.email) {
        console.error('Error getting user email:', userError);
        return;
      }

      const emailData: EmailNotification = {
        to: user.email,
        subject: notification.title,
        message: notification.message,
        type: this.mapNotificationTypeToEmail(notification.type),
        data: notification.data
      };

      // Use Supabase Edge Function for email sending
      const { error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Error sending email notification:', error);
      }

      // Log email notification
      await this.logNotificationHistory(notification, 'email', user.email);

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user phone number
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('phone')
        .eq('id', notification.user_id)
        .single();

      if (userError || !user?.phone) {
        console.error('Error getting user phone:', userError);
        return;
      }

      const smsData: SMSNotification = {
        to: user.phone,
        message: this.formatSMSMessage(notification),
        type: this.mapNotificationTypeToSMS(notification.type)
      };

      // Use Supabase Edge Function for SMS sending
      const { error } = await supabase.functions.invoke('send-sms', {
        body: smsData
      });

      if (error) {
        console.error('Error sending SMS notification:', error);
      }

      // Log SMS notification
      await this.logNotificationHistory(notification, 'sms', user.phone);

    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user's push tokens
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', notification.user_id)
        .eq('is_active', true);

      if (error || !tokens || tokens.length === 0) {
        console.log('No active push tokens found for user:', notification.user_id);
        return;
      }

      const pushData = {
        tokens: tokens.map(t => t.token),
        title: notification.title,
        message: notification.message,
        data: notification.data || {}
      };

      // Use Supabase Edge Function for push notifications
      const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: pushData
      });

      if (pushError) {
        console.error('Error sending push notification:', pushError);
      }

      // Log push notifications
      for (const token of tokens) {
        await this.logNotificationHistory(notification, 'push', token.token);
      }

    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Get user notification settings
   */
  private async getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting notification settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  /**
   * Check if notification should be sent based on settings
   */
  private shouldSendNotification(settings: NotificationSettings, notification: NotificationData): boolean {
    // Check if notifications are disabled
    if (settings.notification_frequency === 'disabled') {
      return false;
    }

    // Check quiet hours
    if (settings.quiet_hours_start && settings.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      if (currentTime >= settings.quiet_hours_start && currentTime <= settings.quiet_hours_end) {
        return false;
      }
    }

    // Check weekend notifications
    if (!settings.weekend_notifications) {
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      if (isWeekend) {
        return false;
      }
    }

    // Check notification frequency for non-urgent alerts
    if (notification.type !== 'high_risk_alert' && settings.notification_frequency !== 'immediate') {
      return false; // Queue for batch processing
    }

    return true;
  }

  /**
   * Check if notification meets risk threshold
   */
  private meetsThreshold(notification: NotificationData, threshold: number): boolean {
    if (notification.type === 'high_risk_alert' && notification.data?.risk_score) {
      const riskPercentage = notification.data.risk_score * 100;
      return riskPercentage >= threshold;
    }
    
    // Always send non-risk alerts if enabled
    return notification.type !== 'high_risk_alert';
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(userId: string, type: string): boolean {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit) {
      return true;
    }

    // Reset if time window has passed
    if (now > limit.resetTime) {
      this.rateLimits.delete(key);
      return true;
    }

    // Check if under limit
    const maxNotifications = type === 'high_risk_alert' ? 5 : 10; // per hour
    return limit.count < maxNotifications;
  }

  /**
   * Update rate limit
   */
  private updateRateLimit(userId: string, type: string): void {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const existing = this.rateLimits.get(key);
    if (existing && now < existing.resetTime) {
      existing.count++;
    } else {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + oneHour
      });
    }
  }

  /**
   * Queue notification for later delivery
   */
  private async queueNotification(notification: NotificationData): Promise<void> {
    const userId = notification.user_id;
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }
    
    this.notificationQueue.get(userId)!.push(notification);
  }

  /**
   * Process queued notifications
   */
  async processQueuedNotifications(): Promise<void> {
    for (const [userId, notifications] of this.notificationQueue.entries()) {
      if (notifications.length === 0) continue;

      const settings = await this.getUserNotificationSettings(userId);
      if (!settings) continue;

      // Group notifications by type for batch processing
      const groupedNotifications = this.groupNotificationsByType(notifications);
      
      for (const [type, typeNotifications] of groupedNotifications.entries()) {
        if (settings.notification_frequency === 'daily') {
          await this.sendDailyDigest(userId, typeNotifications);
        } else if (settings.notification_frequency === 'hourly') {
          await this.sendHourlyDigest(userId, typeNotifications);
        }
      }

      // Clear processed notifications
      this.notificationQueue.set(userId, []);
    }
  }

  /**
   * Send daily digest
   */
  private async sendDailyDigest(userId: string, notifications: NotificationData[]): Promise<void> {
    const digestNotification: NotificationData = {
      user_id: userId,
      type: 'system_alert',
      title: `Daily Alert Summary (${notifications.length} alerts)`,
      message: this.buildDigestMessage(notifications),
      data: { notifications, digest_type: 'daily' }
    };

    await this.sendInAppNotification(digestNotification);
  }

  /**
   * Send hourly digest
   */
  private async sendHourlyDigest(userId: string, notifications: NotificationData[]): Promise<void> {
    const digestNotification: NotificationData = {
      user_id: userId,
      type: 'system_alert',
      title: `Hourly Alert Summary (${notifications.length} alerts)`,
      message: this.buildDigestMessage(notifications),
      data: { notifications, digest_type: 'hourly' }
    };

    await this.sendInAppNotification(digestNotification);
  }

  /**
   * Build digest message
   */
  private buildDigestMessage(notifications: NotificationData[]): string {
    const highRiskCount = notifications.filter(n => n.type === 'high_risk_alert').length;
    const reminderCount = notifications.filter(n => n.type === 'appointment_reminder').length;
    
    let message = `You have ${notifications.length} new alerts:\n`;
    if (highRiskCount > 0) message += `• ${highRiskCount} high-risk appointments\n`;
    if (reminderCount > 0) message += `• ${reminderCount} appointment reminders\n`;
    
    return message;
  }

  /**
   * Group notifications by type
   */
  private groupNotificationsByType(notifications: NotificationData[]): Map<string, NotificationData[]> {
    const grouped = new Map<string, NotificationData[]>();
    
    for (const notification of notifications) {
      if (!grouped.has(notification.type)) {
        grouped.set(notification.type, []);
      }
      grouped.get(notification.type)!.push(notification);
    }
    
    return grouped;
  }

  /**
   * Log notification history
   */
  private async logNotificationHistory(
    notification: NotificationData, 
    notificationType: 'email' | 'sms' | 'push' | 'in_app',
    recipient: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('alert_history')
        .insert({
          appointment_id: notification.data?.appointment_id,
          alert_sent_at: new Date().toISOString(),
          notification_type: notificationType,
          recipient,
          status: 'sent'
        });

      if (error) {
        console.error('Error logging notification history:', error);
      }
    } catch (error) {
      console.error('Error logging notification history:', error);
    }
  }

  /**
   * Format SMS message
   */
  private formatSMSMessage(notification: NotificationData): string {
    // Keep SMS messages short and concise
    let message = notification.title;
    
    if (notification.type === 'high_risk_alert' && notification.data?.risk_score) {
      const riskPercentage = Math.round(notification.data.risk_score * 100);
      message = `High risk (${riskPercentage}%) no-show alert. Please confirm appointment.`;
    }
    
    return message.substring(0, 160); // SMS character limit
  }

  /**
   * Map notification type to email type
   */
  private mapNotificationTypeToEmail(type: string): 'risk_alert' | 'reminder' | 'system' {
    switch (type) {
      case 'high_risk_alert': return 'risk_alert';
      case 'appointment_reminder': return 'reminder';
      default: return 'system';
    }
  }

  /**
   * Map notification type to SMS type
   */
  private mapNotificationTypeToSMS(type: string): 'risk_alert' | 'reminder' | 'system' {
    return this.mapNotificationTypeToEmail(type);
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating notification settings:', error);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notifications for user
   */
  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting unread notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Set up periodic processing of queued notifications
setInterval(() => {
  notificationService.processQueuedNotifications();
}, 60 * 60 * 1000); // Every hour