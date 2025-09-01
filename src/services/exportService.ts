import { supabase } from '@/integrations/supabase/client';
import { analyticsService, ReportTemplate, DashboardMetrics } from './analyticsService';

// Export types
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportJob {
  id: string;
  name: string;
  format: ExportFormat;
  dataType?: 'report' | 'analytics' | 'raw_data';
  templateId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  errorMessage?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export interface ExportRequest {
  name: string;
  format: ExportFormat;
  dataType: 'report' | 'analytics' | 'raw_data';
  templateId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  options?: {
    includeCharts?: boolean;
    includeRawData?: boolean;
    clinicId?: string;
  };
}

export interface BulkExportRequest {
  name: string;
  format: ExportFormat;
  templateIds: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  options?: {
    splitByTemplate?: boolean;
    includeMetadata?: boolean;
    clinicId?: string;
  };
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  metadata?: {
    title: string;
    description?: string;
    generatedAt: Date;
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    totalRecords: number;
  };
}

export class ExportService {
  /**
   * Create a new export job
   */
  async createExport(request: ExportRequest): Promise<string> {
    try {
      // Create export job record
      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .insert({
          name: request.name,
          format: request.format,
          data_type: request.dataType,
          template_id: request.templateId,
          date_range: request.dateRange ? {
            startDate: request.dateRange.startDate.toISOString(),
            endDate: request.dateRange.endDate.toISOString()
          } : null,
          filters: request.filters || {},
          options: request.options || {},
          status: 'pending'
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // Start processing the export asynchronously
      this.processExport(job.id, request);

      return job.id;
    } catch (error) {
      console.error('Error creating export:', error);
      throw new Error('Failed to create export job');
    }
  }

  /**
   * Create a bulk export job
   */
  async createBulkExport(request: BulkExportRequest): Promise<string> {
    try {
      // Create bulk export job record
      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .insert({
          name: request.name,
          format: request.format,
          data_type: 'report',
          template_ids: request.templateIds,
          date_range: request.dateRange ? {
            startDate: request.dateRange.startDate.toISOString(),
            endDate: request.dateRange.endDate.toISOString()
          } : null,
          options: request.options || {},
          status: 'pending'
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // Start processing the bulk export asynchronously
      this.processBulkExport(job.id, request);

      return job.id;
    } catch (error) {
      console.error('Error creating bulk export:', error);
      throw new Error('Failed to create bulk export job');
    }
  }

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<ExportJob> {
    try {
      const { data: job, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return {
        id: job.id,
        name: job.name,
        format: job.format as ExportFormat,
        dataType: job.data_type,
        templateId: job.template_id,
        status: job.status,
        progress: job.progress,
        createdAt: new Date(job.created_at),
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
        downloadUrl: job.download_url,
        errorMessage: job.error_message,
        fileSize: job.file_size,
        metadata: job.metadata
      };
    } catch (error) {
      console.error('Error getting export status:', error);
      throw new Error('Failed to get export status');
    }
  }

  /**
   * Get export history for current user
   */
  async getExportHistory(): Promise<ExportJob[]> {
    try {
      const { data: jobs, error } = await supabase
        .from('export_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (jobs || []).map(job => ({
        id: job.id,
        name: job.name,
        format: job.format as ExportFormat,
        dataType: job.data_type,
        templateId: job.template_id,
        status: job.status,
        progress: job.progress,
        createdAt: new Date(job.created_at),
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
        downloadUrl: job.download_url,
        errorMessage: job.error_message,
        fileSize: job.file_size,
        metadata: job.metadata
      }));
    } catch (error) {
      console.error('Error getting export history:', error);
      throw new Error('Failed to get export history');
    }
  }

  /**
   * Cancel an export job
   */
  async cancelExport(jobId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('export_jobs')
        .update({
          status: 'failed',
          error_message: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling export:', error);
      throw new Error('Failed to cancel export');
    }
  }

  /**
   * Download export file
   */
  async downloadExport(jobId: string, filename: string): Promise<void> {
    try {
      const job = await this.getExportStatus(jobId);
      
      if (!job.downloadUrl) {
        throw new Error('Download URL not available');
      }

      // In a real implementation, this would handle the actual file download
      // For now, we'll simulate the download process
      const response = await fetch(job.downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading export:', error);
      throw new Error('Failed to download export file');
    }
  }

  /**
   * Process export job (private method)
   */
  private async processExport(jobId: string, request: ExportRequest): Promise<void> {
    try {
      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', 0);

      let exportData: ExportData;

      // Generate data based on type
      switch (request.dataType) {
        case 'report':
          exportData = await this.generateReportData(request);
          break;
        case 'analytics':
          exportData = await this.generateAnalyticsData(request);
          break;
        case 'raw_data':
          exportData = await this.generateRawData(request);
          break;
        default:
          throw new Error(`Unsupported data type: ${request.dataType}`);
      }

      // Update progress
      await this.updateJobStatus(jobId, 'processing', 50);

      // Generate file based on format
      const fileData = await this.generateFile(exportData, request.format);
      
      // Update progress
      await this.updateJobStatus(jobId, 'processing', 80);

      // Upload file and get download URL
      const downloadUrl = await this.uploadFile(jobId, fileData, request.format);

      // Complete the job
      await this.updateJobStatus(jobId, 'completed', 100, downloadUrl, fileData.size);

    } catch (error) {
      console.error('Error processing export:', error);
      await this.updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message);
    }
  }

  /**
   * Process bulk export job (private method)
   */
  private async processBulkExport(jobId: string, request: BulkExportRequest): Promise<void> {
    try {
      await this.updateJobStatus(jobId, 'processing', 0);

      const exportDataList: ExportData[] = [];
      const totalTemplates = request.templateIds.length;

      // Process each template
      for (let i = 0; i < totalTemplates; i++) {
        const templateId = request.templateIds[i];
        const progress = Math.round((i / totalTemplates) * 80);
        
        await this.updateJobStatus(jobId, 'processing', progress);

        const templateRequest: ExportRequest = {
          name: `Template ${i + 1}`,
          format: request.format,
          dataType: 'report',
          templateId,
          dateRange: request.dateRange,
          options: request.options
        };

        const exportData = await this.generateReportData(templateRequest);
        exportDataList.push(exportData);
      }

      // Combine data if not splitting by template
      let finalData: ExportData;
      if (request.options?.splitByTemplate) {
        // Create a combined export with multiple sheets/sections
        finalData = this.combineExportData(exportDataList, request.name);
      } else {
        // Merge all data into a single export
        finalData = this.mergeExportData(exportDataList, request.name);
      }

      // Generate file
      const fileData = await this.generateFile(finalData, request.format);
      
      await this.updateJobStatus(jobId, 'processing', 90);

      // Upload file
      const downloadUrl = await this.uploadFile(jobId, fileData, request.format);

      // Complete the job
      await this.updateJobStatus(jobId, 'completed', 100, downloadUrl, fileData.size);

    } catch (error) {
      console.error('Error processing bulk export:', error);
      await this.updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message);
    }
  }

  /**
   * Generate report data from template
   */
  private async generateReportData(request: ExportRequest): Promise<ExportData> {
    try {
      if (!request.templateId) {
        throw new Error('Template ID is required for report export');
      }

      // Get template and generate report
      const reportData = await analyticsService.generateReport(request.templateId);
      
      // Convert report data to export format
      const headers = ['Metric', 'Value', 'Description'];
      const rows: any[][] = [];

      // Extract metrics from report data
      if (reportData.data.patientFlow) {
        const pf = reportData.data.patientFlow;
        rows.push(['Total Appointments', pf.totalAppointments, 'Total number of appointments']);
        rows.push(['Completed Appointments', pf.completedAppointments, 'Successfully completed appointments']);
        rows.push(['No Shows', pf.noShows, 'Appointments with no-show status']);
        rows.push(['Completion Rate', `${pf.completionRate}%`, 'Percentage of completed appointments']);
        rows.push(['No Show Rate', `${pf.noShowRate}%`, 'Percentage of no-show appointments']);
      }

      if (reportData.data.revenueMetrics) {
        const rm = reportData.data.revenueMetrics;
        rows.push(['Estimated Revenue', `$${rm.estimatedRevenue}`, 'Total estimated revenue']);
        rows.push(['Average Per Appointment', `$${rm.averagePerAppointment}`, 'Average revenue per appointment']);
      }

      return {
        headers,
        rows,
        metadata: {
          title: reportData.templateName,
          description: `Generated report from template: ${reportData.templateName}`,
          generatedAt: new Date(),
          dateRange: request.dateRange,
          totalRecords: rows.length
        }
      };
    } catch (error) {
      console.error('Error generating report data:', error);
      throw new Error('Failed to generate report data');
    }
  }

  /**
   * Generate analytics data
   */
  private async generateAnalyticsData(request: ExportRequest): Promise<ExportData> {
    try {
      const metrics = await analyticsService.computeRealTimeMetrics(
        request.dateRange,
        request.options?.clinicId
      );

      const headers = ['Category', 'Metric', 'Value', 'Timestamp'];
      const rows: any[][] = [];

      // Patient Flow Metrics
      const pf = metrics.patientFlow;
      rows.push(['Patient Flow', 'Total Appointments', pf.totalAppointments, new Date().toISOString()]);
      rows.push(['Patient Flow', 'Completed Appointments', pf.completedAppointments, new Date().toISOString()]);
      rows.push(['Patient Flow', 'No Shows', pf.noShows, new Date().toISOString()]);
      rows.push(['Patient Flow', 'Cancellations', pf.cancellations, new Date().toISOString()]);
      rows.push(['Patient Flow', 'Completion Rate', `${pf.completionRate}%`, new Date().toISOString()]);
      rows.push(['Patient Flow', 'No Show Rate', `${pf.noShowRate}%`, new Date().toISOString()]);

      // Utilization Metrics
      const um = metrics.appointmentUtilization;
      rows.push(['Utilization', 'Total Slots', um.totalSlots, new Date().toISOString()]);
      rows.push(['Utilization', 'Booked Slots', um.bookedSlots, new Date().toISOString()]);
      rows.push(['Utilization', 'Available Slots', um.availableSlots, new Date().toISOString()]);
      rows.push(['Utilization', 'Utilization Rate', `${um.utilizationRate}%`, new Date().toISOString()]);

      // Revenue Metrics
      const rm = metrics.revenueMetrics;
      rows.push(['Revenue', 'Total Appointments', rm.totalAppointments, new Date().toISOString()]);
      rows.push(['Revenue', 'Estimated Revenue', `$${rm.estimatedRevenue}`, new Date().toISOString()]);
      rows.push(['Revenue', 'Average Per Appointment', `$${rm.averagePerAppointment}`, new Date().toISOString()]);

      return {
        headers,
        rows,
        metadata: {
          title: 'Analytics Data Export',
          description: 'Real-time analytics metrics export',
          generatedAt: new Date(),
          dateRange: request.dateRange,
          totalRecords: rows.length
        }
      };
    } catch (error) {
      console.error('Error generating analytics data:', error);
      throw new Error('Failed to generate analytics data');
    }
  }

  /**
   * Generate raw data export
   */
  private async generateRawData(request: ExportRequest): Promise<ExportData> {
    try {
      // This would query raw database tables
      // For now, we'll return a sample structure
      const headers = ['ID', 'Date', 'Type', 'Value', 'Status'];
      const rows: any[][] = [];

      // Sample raw data
      for (let i = 1; i <= 100; i++) {
        rows.push([
          i,
          new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          'Appointment',
          Math.floor(Math.random() * 1000),
          ['Completed', 'No-Show', 'Cancelled'][Math.floor(Math.random() * 3)]
        ]);
      }

      return {
        headers,
        rows,
        metadata: {
          title: 'Raw Data Export',
          description: 'Raw database data export',
          generatedAt: new Date(),
          dateRange: request.dateRange,
          totalRecords: rows.length
        }
      };
    } catch (error) {
      console.error('Error generating raw data:', error);
      throw new Error('Failed to generate raw data');
    }
  }

  /**
   * Generate file from export data
   */
  private async generateFile(data: ExportData, format: ExportFormat): Promise<Blob> {
    switch (format) {
      case 'csv':
        return this.generateCSV(data);
      case 'excel':
        return this.generateExcel(data);
      case 'pdf':
        return this.generatePDF(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV file
   */
  private generateCSV(data: ExportData): Blob {
    const csvContent = [
      // Add metadata as comments
      `# ${data.metadata?.title || 'Export'}`,
      `# Generated: ${data.metadata?.generatedAt.toISOString() || new Date().toISOString()}`,
      `# Records: ${data.metadata?.totalRecords || data.rows.length}`,
      '',
      // Add headers
      data.headers.join(','),
      // Add data rows
      ...data.rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in CSV
          const str = String(cell || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Generate Excel file (simplified - would use a library like xlsx in production)
   */
  private generateExcel(data: ExportData): Blob {
    // This is a simplified implementation
    // In production, you would use a library like 'xlsx' to create proper Excel files
    const csvContent = this.generateCSV(data);
    return new Blob([csvContent], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Generate PDF file (simplified - would use a library like jsPDF in production)
   */
  private generatePDF(data: ExportData): Blob {
    // This is a simplified implementation
    // In production, you would use libraries like jsPDF and html2canvas
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.metadata?.title || 'Export'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .metadata { color: #666; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${data.metadata?.title || 'Export Report'}</h1>
        <div class="metadata">
          <p>Generated: ${data.metadata?.generatedAt.toLocaleString() || new Date().toLocaleString()}</p>
          <p>Total Records: ${data.metadata?.totalRecords || data.rows.length}</p>
          ${data.metadata?.description ? `<p>Description: ${data.metadata.description}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              ${data.headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map(row => 
              `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return new Blob([htmlContent], { type: 'application/pdf' });
  }

  /**
   * Combine multiple export data sets
   */
  private combineExportData(dataList: ExportData[], name: string): ExportData {
    const combinedRows: any[][] = [];
    const allHeaders = new Set<string>();

    // Collect all unique headers
    dataList.forEach(data => {
      data.headers.forEach(header => allHeaders.add(header));
    });

    const headers = Array.from(allHeaders);

    // Combine all rows
    dataList.forEach((data, index) => {
      // Add section header
      combinedRows.push([`--- Section ${index + 1}: ${data.metadata?.title || 'Data'} ---`, ...Array(headers.length - 1).fill('')]);
      
      // Add data rows
      data.rows.forEach(row => {
        const combinedRow = new Array(headers.length).fill('');
        data.headers.forEach((header, headerIndex) => {
          const targetIndex = headers.indexOf(header);
          if (targetIndex >= 0) {
            combinedRow[targetIndex] = row[headerIndex];
          }
        });
        combinedRows.push(combinedRow);
      });

      // Add separator
      combinedRows.push(Array(headers.length).fill(''));
    });

    return {
      headers,
      rows: combinedRows,
      metadata: {
        title: name,
        description: `Combined export of ${dataList.length} data sets`,
        generatedAt: new Date(),
        totalRecords: combinedRows.length
      }
    };
  }

  /**
   * Merge multiple export data sets
   */
  private mergeExportData(dataList: ExportData[], name: string): ExportData {
    if (dataList.length === 0) {
      throw new Error('No data to merge');
    }

    // Use the first data set as the base
    const baseData = dataList[0];
    const mergedRows = [...baseData.rows];

    // Merge additional data sets
    for (let i = 1; i < dataList.length; i++) {
      const data = dataList[i];
      
      // Only merge if headers match
      if (JSON.stringify(data.headers) === JSON.stringify(baseData.headers)) {
        mergedRows.push(...data.rows);
      }
    }

    return {
      headers: baseData.headers,
      rows: mergedRows,
      metadata: {
        title: name,
        description: `Merged export of ${dataList.length} data sets`,
        generatedAt: new Date(),
        totalRecords: mergedRows.length
      }
    };
  }

  /**
   * Upload file and return download URL
   */
  private async uploadFile(jobId: string, fileData: Blob, format: ExportFormat): Promise<string> {
    try {
      const fileName = `export_${jobId}.${format}`;
      const filePath = `exports/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('exports')
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('exports')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload export file');
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: ExportJob['status'],
    progress?: number,
    downloadUrl?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (progress !== undefined) updates.progress = progress;
      if (downloadUrl) updates.download_url = downloadUrl;
      if (fileSize) updates.file_size = fileSize;
      if (errorMessage) updates.error_message = errorMessage;
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('export_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job status:', error);
      // Don't throw here to avoid infinite loops
    }
  }
}

// Export singleton instance
export const exportService = new ExportService();