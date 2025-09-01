import { supabase } from '@/integrations/supabase/client';

// Types for analytics data
export interface DashboardMetrics {
  patientFlow: PatientFlowMetrics;
  appointmentUtilization: UtilizationMetrics;
  revenueMetrics: RevenueMetrics;
  lastUpdated: Date;
}

export interface PatientFlowMetrics {
  totalAppointments: number;
  completedAppointments: number;
  noShows: number;
  cancellations: number;
  pendingAppointments: number;
  averageDuration: number;
  completionRate: number;
  noShowRate: number;
}

export interface UtilizationMetrics {
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  utilizationRate: number;
  peakHours: Array<{ hour: number; bookings: number }>;
}

export interface RevenueMetrics {
  totalAppointments: number;
  estimatedRevenue: number;
  averagePerAppointment: number;
  revenueTrend: Array<{
    date: string;
    revenue: number;
    appointments: number;
  }>;
}

export interface AnalyticsMetric {
  id: string;
  metricName: string;
  metricValue: number;
  dimensions: Record<string, any>;
  timestamp: Date;
  clinicId?: string;
  userId: string;
}

export interface ReportSection {
  id: string;
  title: string;
  metrics: string[];
  chartType: string;
  order: number;
}

export interface ReportConfig {
  sections: ReportSection[];
  dateRange: string;
  format: string;
  filters: Record<string, any>;
  layout: 'single-column' | 'two-column' | 'grid';
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  templateConfig: ReportConfig | Record<string, any>;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class AnalyticsService {
  /**
   * Compute real-time dashboard metrics
   */
  async computeRealTimeMetrics(
    dateRange?: DateRange,
    clinicId?: string
  ): Promise<DashboardMetrics> {
    try {
      const startDate = dateRange?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = dateRange?.endDate || new Date();

      // Compute patient flow metrics
      const { data: patientFlowData, error: flowError } = await supabase
        .rpc('compute_patient_flow_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          clinic_filter: clinicId || null
        });

      if (flowError) throw flowError;

      // Compute utilization metrics
      const { data: utilizationData, error: utilizationError } = await supabase
        .rpc('compute_utilization_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          clinic_filter: clinicId || null
        });

      if (utilizationError) throw utilizationError;

      // Compute revenue metrics
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('compute_revenue_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          clinic_filter: clinicId || null
        });

      if (revenueError) throw revenueError;

      const patientFlow: PatientFlowMetrics = {
        totalAppointments: patientFlowData[0]?.total_appointments || 0,
        completedAppointments: patientFlowData[0]?.completed_appointments || 0,
        noShows: patientFlowData[0]?.no_shows || 0,
        cancellations: patientFlowData[0]?.cancellations || 0,
        pendingAppointments: patientFlowData[0]?.pending_appointments || 0,
        averageDuration: parseFloat(patientFlowData[0]?.average_duration || '0'),
        completionRate: parseFloat(patientFlowData[0]?.completion_rate || '0'),
        noShowRate: parseFloat(patientFlowData[0]?.no_show_rate || '0')
      };

      const appointmentUtilization: UtilizationMetrics = {
        totalSlots: utilizationData[0]?.total_slots || 0,
        bookedSlots: utilizationData[0]?.booked_slots || 0,
        availableSlots: utilizationData[0]?.available_slots || 0,
        utilizationRate: parseFloat(utilizationData[0]?.utilization_rate || '0'),
        peakHours: utilizationData[0]?.peak_hours || []
      };

      const revenueMetrics: RevenueMetrics = {
        totalAppointments: revenueData[0]?.total_appointments || 0,
        estimatedRevenue: parseFloat(revenueData[0]?.estimated_revenue || '0'),
        averagePerAppointment: parseFloat(revenueData[0]?.average_per_appointment || '0'),
        revenueTrend: revenueData[0]?.revenue_trend || []
      };

      return {
        patientFlow,
        appointmentUtilization,
        revenueMetrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error computing real-time metrics:', error);
      throw new Error('Failed to compute analytics metrics');
    }
  }

  /**
   * Store a computed metric
   */
  async storeMetric(
    metricName: string,
    metricValue: number,
    dimensions: Record<string, any> = {},
    clinicId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('store_analytics_metric', {
          p_metric_name: metricName,
          p_metric_value: metricValue,
          p_dimensions: dimensions,
          p_clinic_id: clinicId || null
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing metric:', error);
      throw new Error('Failed to store analytics metric');
    }
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(
    metricNames: string[],
    dateRange: DateRange,
    clinicId?: string
  ): Promise<AnalyticsMetric[]> {
    try {
      let query = supabase
        .from('analytics_metrics')
        .select('*')
        .in('metric_name', metricNames)
        .gte('timestamp', dateRange.startDate.toISOString())
        .lte('timestamp', dateRange.endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(metric => ({
        id: metric.id,
        metricName: metric.metric_name,
        metricValue: parseFloat(metric.metric_value || '0'),
        dimensions: metric.dimensions || {},
        timestamp: new Date(metric.timestamp),
        clinicId: metric.clinic_id,
        userId: metric.user_id
      }));
    } catch (error) {
      console.error('Error fetching historical metrics:', error);
      throw new Error('Failed to fetch historical metrics');
    }
  }

  /**
   * Create a report template
   */
  async createReportTemplate(
    name: string,
    description: string,
    templateConfig: ReportConfig | Record<string, any>,
    isPublic: boolean = false
  ): Promise<string> {
    try {
      // Validate the template configuration
      if ('sections' in templateConfig && Array.isArray(templateConfig.sections)) {
        if (templateConfig.sections.length === 0) {
          throw new Error('Report template must contain at least one section');
        }
      }

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name,
          description,
          template_config: templateConfig,
          is_public: isPublic
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating report template:', error);
      throw new Error('Failed to create report template');
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates(includePublic: boolean = true): Promise<ReportTemplate[]> {
    try {
      let query = supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includePublic) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('created_by', user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        templateConfig: template.template_config || {},
        isPublic: template.is_public || false,
        createdBy: template.created_by,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw new Error('Failed to fetch report templates');
    }
  }

  /**
   * Generate report data based on template
   */
  async generateReport(templateId: string): Promise<any> {
    try {
      // Get the template
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const config = (template as any).template_config;
      const dateRange = {
        startDate: new Date(config.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(config.endDate || Date.now())
      };

      // Generate report based on configuration
      const metrics = await this.computeRealTimeMetrics(dateRange, config.clinicId);
      
      return {
        templateId,
        templateName: (template as any).name,
        generatedAt: new Date(),
        dateRange,
        data: metrics,
        config
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Get dashboard configuration for user
   */
  async getDashboardConfig(userId: string, dashboardName: string = 'default'): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('dashboard_name', dashboardName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data ? {
        id: data.id,
        userId: data.user_id,
        dashboardName: data.dashboard_name,
        layoutConfig: data.layout_config || {},
        widgetConfigs: data.widget_configs || [],
        isDefault: data.is_default || false
      } : null;
    } catch (error) {
      console.error('Error fetching dashboard config:', error);
      throw new Error('Failed to fetch dashboard configuration');
    }
  }

  /**
   * Save dashboard configuration
   */
  async saveDashboardConfig(
    userId: string,
    dashboardName: string,
    layoutConfig: Record<string, any>,
    widgetConfigs: any[],
    isDefault: boolean = false
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .upsert({
          user_id: userId,
          dashboard_name: dashboardName,
          layout_config: layoutConfig,
          widget_configs: widgetConfigs,
          is_default: isDefault
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      throw new Error('Failed to save dashboard configuration');
    }
  }

  /**
   * Get trend analysis data
   */
  async getTrendAnalysis(
    _metricType: string,
    dateRange: DateRange,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day',
    clinicId?: string
  ): Promise<any[]> {
    try {
      // This would be expanded based on specific metric types
      // For now, return appointment trends
      let query = supabase
        .from('appointments')
        .select('appointment_time, status, duration_minutes')
        .gte('appointment_time', dateRange.startDate.toISOString())
        .lte('appointment_time', dateRange.endDate.toISOString());

      if (clinicId) {
        query = query.eq('user_id', clinicId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group data by granularity
      const groupedData = this.groupDataByGranularity(data || [], granularity);
      
      return groupedData;
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      throw new Error('Failed to get trend analysis');
    }
  }

  /**
   * Get scheduled reports for the current user
   */
  async getScheduledReports(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw new Error('Failed to fetch scheduled reports');
    }
  }

  /**
   * Create a scheduled report
   */
  async createScheduledReport(
    name: string,
    templateId: string,
    scheduleConfig: any,
    recipients: string[],
    isActive: boolean = true
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          name,
          template_id: templateId,
          schedule_config: scheduleConfig,
          recipients,
          is_active: isActive
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
   * Helper method to group data by time granularity
   */
  private groupDataByGranularity(data: any[], granularity: string): any[] {
    const grouped = new Map();

    data.forEach(item => {
      const date = new Date(item.appointment_time);
      let key: string;

      switch (granularity) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        default:
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          period: key,
          date: date,
          appointments: 0,
          completed: 0,
          noShows: 0,
          cancelled: 0,
          totalDuration: 0
        });
      }

      const group = grouped.get(key);
      group.appointments++;
      
      if (item.status === 'Completed') group.completed++;
      if (item.status === 'No-Show') group.noShows++;
      if (item.status === 'Cancelled') group.cancelled++;
      if (item.duration_minutes) group.totalDuration += item.duration_minutes;
    });

    return Array.from(grouped.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();