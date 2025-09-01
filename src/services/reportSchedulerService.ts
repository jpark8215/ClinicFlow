import { supabase } from '@/integrations/supabase/client';
import { analyticsService } from './analyticsService';

// Types for scheduled reports
export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  scheduleConfig: ScheduleConfig;
  recipients: string[];
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  scheduledReportId: string;
  executedAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionDuration?: number;
  recipientCount?: number;
  errorMessage?: string;
  reportData?: any;
}

export interface EmailDeliveryResult {
  success: boolean;
  recipientEmail: string;
  errorMessage?: string;
}

export class ReportSchedulerService {
  /**
   * Create a new scheduled report
   */
  async createScheduledReport(
    name: string,
    templateId: string,
    scheduleConfig: ScheduleConfig,
    recipients: string[],
    isActive: boolean = true
  ): Promise<string> {
    try {
      // Validate template exists
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('id')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        throw new Error('Report template not found');
      }

      // Calculate next run time
      const nextRunAt = this.calculateNextRunTime(scheduleConfig);

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          name,
          template_id: templateId,
          schedule_config: scheduleConfig,
          recipients,
          is_active: isActive,
          next_run_at: nextRunAt?.toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      throw new Error('Failed to create scheduled report');
    }
  }

  /**
   * Get all scheduled reports for the current user
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapScheduledReportFromDB);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw new Error('Failed to fetch scheduled reports');
    }
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(
    reportId: string,
    updates: Partial<{
      name: string;
      scheduleConfig: ScheduleConfig;
      recipients: string[];
      isActive: boolean;
    }>
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.scheduleConfig !== undefined) {
        updateData.schedule_config = updates.scheduleConfig;
        // Recalculate next run time if schedule changed
        updateData.next_run_at = this.calculateNextRunTime(updates.scheduleConfig)?.toISOString();
      }
      if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive;
        // If activating, recalculate next run time
        if (updates.isActive) {
          const { data: currentReport } = await supabase
            .from('scheduled_reports')
            .select('schedule_config')
            .eq('id', reportId)
            .single();
          
          if (currentReport) {
            updateData.next_run_at = this.calculateNextRunTime(currentReport.schedule_config)?.toISOString();
          }
        }
      }

      const { error } = await supabase
        .from('scheduled_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating scheduled report:', error);
      throw new Error('Failed to update scheduled report');
    }
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      throw new Error('Failed to delete scheduled report');
    }
  }

  /**
   * Execute a scheduled report immediately
   */
  async executeScheduledReport(reportId: string): Promise<ReportExecution> {
    const startTime = Date.now();
    let executionId: string | null = null;

    try {
      // Get the scheduled report details
      const { data: scheduledReport, error: reportError } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError || !scheduledReport) {
        throw new Error('Scheduled report not found');
      }

      // Create execution record
      const { data: execution, error: executionError } = await supabase
        .from('report_executions')
        .insert({
          scheduled_report_id: reportId,
          status: 'running',
          executed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (executionError) throw executionError;
      executionId = execution.id;

      // Generate the report
      const reportData = await analyticsService.generateReport(scheduledReport.template_id);

      // Send emails to recipients
      const deliveryResults = await this.sendReportEmails(
        scheduledReport.recipients,
        scheduledReport.name,
        reportData
      );

      const successfulDeliveries = deliveryResults.filter(r => r.success).length;
      const failedDeliveries = deliveryResults.filter(r => !r.success);

      const executionDuration = Date.now() - startTime;
      const status = failedDeliveries.length === 0 ? 'completed' : 'failed';
      const errorMessage = failedDeliveries.length > 0 
        ? `Failed to deliver to ${failedDeliveries.length} recipients: ${failedDeliveries.map(f => f.errorMessage).join(', ')}`
        : undefined;

      // Update execution record
      await supabase
        .from('report_executions')
        .update({
          status,
          execution_duration: executionDuration,
          recipient_count: successfulDeliveries,
          error_message: errorMessage,
          report_data: reportData
        })
        .eq('id', executionId);

      // Update scheduled report's last run time and calculate next run
      const nextRunAt = this.calculateNextRunTime(scheduledReport.schedule_config);
      await supabase
        .from('scheduled_reports')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRunAt?.toISOString()
        })
        .eq('id', reportId);

      return {
        id: executionId,
        scheduledReportId: reportId,
        executedAt: new Date(),
        status,
        executionDuration,
        recipientCount: successfulDeliveries,
        errorMessage,
        reportData
      };

    } catch (error) {
      console.error('Error executing scheduled report:', error);
      
      // Update execution record with error if it was created
      if (executionId) {
        await supabase
          .from('report_executions')
          .update({
            status: 'failed',
            execution_duration: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', executionId);
      }

      throw new Error('Failed to execute scheduled report');
    }
  }

  /**
   * Get execution history for a scheduled report
   */
  async getReportHistory(reportId: string, limit: number = 50): Promise<ReportExecution[]> {
    try {
      const { data, error } = await supabase
        .from('report_executions')
        .select('*')
        .eq('scheduled_report_id', reportId)
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(execution => ({
        id: execution.id,
        scheduledReportId: execution.scheduled_report_id,
        executedAt: new Date(execution.executed_at),
        status: execution.status,
        executionDuration: execution.execution_duration,
        recipientCount: execution.recipient_count,
        errorMessage: execution.error_message,
        reportData: execution.report_data
      }));
    } catch (error) {
      console.error('Error fetching report history:', error);
      throw new Error('Failed to fetch report execution history');
    }
  }

  /**
   * Get reports that are due to run
   */
  async getDueReports(): Promise<ScheduledReport[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_at', now);

      if (error) throw error;

      return (data || []).map(this.mapScheduledReportFromDB);
    } catch (error) {
      console.error('Error fetching due reports:', error);
      throw new Error('Failed to fetch due reports');
    }
  }

  /**
   * Process all due reports (would be called by a background job)
   */
  async processDueReports(): Promise<void> {
    try {
      const dueReports = await this.getDueReports();
      
      for (const report of dueReports) {
        try {
          await this.executeScheduledReport(report.id);
        } catch (error) {
          console.error(`Failed to execute report ${report.id}:`, error);
          // Continue processing other reports even if one fails
        }
      }
    } catch (error) {
      console.error('Error processing due reports:', error);
      throw new Error('Failed to process due reports');
    }
  }

  /**
   * Send report emails to recipients
   */
  private async sendReportEmails(
    recipients: string[],
    reportName: string,
    reportData: any
  ): Promise<EmailDeliveryResult[]> {
    const results: EmailDeliveryResult[] = [];

    for (const recipient of recipients) {
      try {
        // In a real implementation, this would integrate with an email service
        // For now, we'll simulate email sending
        await this.simulateEmailDelivery(recipient, reportName, reportData);
        
        results.push({
          success: true,
          recipientEmail: recipient
        });
      } catch (error) {
        results.push({
          success: false,
          recipientEmail: recipient,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Simulate email delivery (replace with actual email service integration)
   */
  private async simulateEmailDelivery(
    recipient: string,
    reportName: string,
    reportData: any
  ): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Email delivery failed');
    }

    console.log(`Email sent to ${recipient}: ${reportName}`, {
      recipient,
      reportName,
      generatedAt: reportData.generatedAt,
      dataSize: JSON.stringify(reportData).length
    });
  }

  /**
   * Calculate the next run time based on schedule configuration
   */
  private calculateNextRunTime(scheduleConfig: ScheduleConfig): Date | null {
    const now = new Date();
    const nextRun = new Date();

    // Set the time
    nextRun.setHours(scheduleConfig.hour, scheduleConfig.minute, 0, 0);

    switch (scheduleConfig.frequency) {
      case 'daily':
        // If the time has already passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDayOfWeek = scheduleConfig.dayOfWeek || 1; // Default to Monday
        const currentDayOfWeek = nextRun.getDay();
        let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7; // Next week
        }

        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        const targetDayOfMonth = scheduleConfig.dayOfMonth || 1;
        nextRun.setDate(targetDayOfMonth);

        // If the target day has passed this month or is today but time has passed
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDayOfMonth);
        }

        // Handle months with fewer days
        if (nextRun.getDate() !== targetDayOfMonth) {
          nextRun.setDate(0); // Last day of previous month
        }
        break;

      default:
        return null;
    }

    return nextRun;
  }

  /**
   * Map database record to ScheduledReport interface
   */
  private mapScheduledReportFromDB(data: any): ScheduledReport {
    return {
      id: data.id,
      templateId: data.template_id,
      name: data.name,
      scheduleConfig: data.schedule_config,
      recipients: data.recipients || [],
      isActive: data.is_active,
      lastRunAt: data.last_run_at ? new Date(data.last_run_at) : null,
      nextRunAt: data.next_run_at ? new Date(data.next_run_at) : null,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Export singleton instance
export const reportSchedulerService = new ReportSchedulerService();