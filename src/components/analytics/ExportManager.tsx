import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
  Calendar,
  Filter,
  Database,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportService, ExportFormat, ExportJob, BulkExportRequest } from '@/services/exportService';
import { analyticsService, ReportTemplate } from '@/services/analyticsService';

interface ExportManagerProps {
  clinicId?: string;
}

interface ExportRequest {
  id: string;
  name: string;
  format: ExportFormat;
  dataType: 'report' | 'analytics' | 'raw_data';
  templateId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  errorMessage?: string;
}

const EXPORT_FORMATS = [
  {
    id: 'pdf' as ExportFormat,
    name: 'PDF Document',
    description: 'Formatted report with charts and tables',
    icon: FileText,
    extension: '.pdf',
    mimeType: 'application/pdf'
  },
  {
    id: 'excel' as ExportFormat,
    name: 'Excel Spreadsheet',
    description: 'Data in Excel format with multiple sheets',
    icon: FileSpreadsheet,
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    id: 'csv' as ExportFormat,
    name: 'CSV Data',
    description: 'Comma-separated values for data analysis',
    icon: File,
    extension: '.csv',
    mimeType: 'text/csv'
  }
];

const DATA_TYPES = [
  {
    id: 'report',
    name: 'Report Template',
    description: 'Export a formatted report using existing templates'
  },
  {
    id: 'analytics',
    name: 'Analytics Data',
    description: 'Export raw analytics metrics and calculations'
  },
  {
    id: 'raw_data',
    name: 'Raw Database Data',
    description: 'Export raw data from database tables'
  }
];

export const ExportManager: React.FC<ExportManagerProps> = ({ clinicId }) => {
  const [exportJobs, setExportJobs] = useState<ExportRequest[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isBulkExportDialogOpen, setIsBulkExportDialogOpen] = useState(false);
  
  const [exportRequest, setExportRequest] = useState({
    name: '',
    format: 'pdf' as ExportFormat,
    dataType: 'report' as 'report' | 'analytics' | 'raw_data',
    templateId: '',
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    filters: {},
    includeCharts: true,
    includeRawData: false
  });

  const [bulkExportRequest, setBulkExportRequest] = useState({
    name: '',
    format: 'excel' as ExportFormat,
    templateIds: [] as string[],
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    splitByTemplate: true,
    includeMetadata: true
  });

  const { toast } = useToast();

  React.useEffect(() => {
    loadTemplates();
    loadExportHistory();
  }, []);

  const loadTemplates = async () => {
    try {
      const reportTemplates = await analyticsService.getReportTemplates();
      setTemplates(reportTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error Loading Templates",
        description: "Failed to load report templates.",
        variant: "destructive",
      });
    }
  };

  const loadExportHistory = async () => {
    try {
      const jobs = await exportService.getExportHistory();
      setExportJobs(jobs.map(job => ({
        id: job.id,
        name: job.name,
        format: job.format,
        dataType: job.dataType || 'report',
        templateId: job.templateId,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        downloadUrl: job.downloadUrl,
        errorMessage: job.errorMessage
      })));
    } catch (error) {
      console.error('Error loading export history:', error);
    }
  };

  const handleSingleExport = async () => {
    if (!exportRequest.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an export name.",
        variant: "destructive",
      });
      return;
    }

    if (exportRequest.dataType === 'report' && !exportRequest.templateId) {
      toast({
        title: "Missing Template",
        description: "Please select a report template.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const jobId = await exportService.createExport({
        name: exportRequest.name,
        format: exportRequest.format,
        dataType: exportRequest.dataType,
        templateId: exportRequest.templateId || undefined,
        dateRange: exportRequest.dateRange,
        filters: exportRequest.filters,
        options: {
          includeCharts: exportRequest.includeCharts,
          includeRawData: exportRequest.includeRawData,
          clinicId
        }
      });

      // Add to local state for immediate feedback
      const newJob: ExportRequest = {
        id: jobId,
        name: exportRequest.name,
        format: exportRequest.format,
        dataType: exportRequest.dataType,
        templateId: exportRequest.templateId || undefined,
        dateRange: exportRequest.dateRange,
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [newJob, ...prev]);

      toast({
        title: "Export Started",
        description: "Your export has been queued for processing.",
      });

      setIsExportDialogOpen(false);
      resetExportForm();

      // Start polling for job status
      pollJobStatus(jobId);

    } catch (error) {
      console.error('Error creating export:', error);
      toast({
        title: "Export Failed",
        description: "Failed to create export job.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (!bulkExportRequest.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an export name.",
        variant: "destructive",
      });
      return;
    }

    if (bulkExportRequest.templateIds.length === 0) {
      toast({
        title: "No Templates Selected",
        description: "Please select at least one template for bulk export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const request: BulkExportRequest = {
        name: bulkExportRequest.name,
        format: bulkExportRequest.format,
        templateIds: bulkExportRequest.templateIds,
        dateRange: bulkExportRequest.dateRange,
        options: {
          splitByTemplate: bulkExportRequest.splitByTemplate,
          includeMetadata: bulkExportRequest.includeMetadata,
          clinicId
        }
      };

      const jobId = await exportService.createBulkExport(request);

      // Add to local state for immediate feedback
      const newJob: ExportRequest = {
        id: jobId,
        name: bulkExportRequest.name,
        format: bulkExportRequest.format,
        dataType: 'report',
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      };

      setExportJobs(prev => [newJob, ...prev]);

      toast({
        title: "Bulk Export Started",
        description: `Bulk export of ${bulkExportRequest.templateIds.length} templates has been queued.`,
      });

      setIsBulkExportDialogOpen(false);
      resetBulkExportForm();

      // Start polling for job status
      pollJobStatus(jobId);

    } catch (error) {
      console.error('Error creating bulk export:', error);
      toast({
        title: "Bulk Export Failed",
        description: "Failed to create bulk export job.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const job = await exportService.getExportStatus(jobId);
        
        setExportJobs(prev => prev.map(j => 
          j.id === jobId ? {
            ...j,
            status: job.status,
            progress: job.progress,
            completedAt: job.completedAt,
            downloadUrl: job.downloadUrl,
            errorMessage: job.errorMessage
          } : j
        ));

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollInterval);
          
          if (job.status === 'completed') {
            toast({
              title: "Export Completed",
              description: "Your export is ready for download.",
            });
          } else {
            toast({
              title: "Export Failed",
              description: job.errorMessage || "Export processing failed.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Clean up after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  }, [toast]);

  const handleDownload = async (job: ExportRequest) => {
    if (!job.downloadUrl) {
      toast({
        title: "Download Not Available",
        description: "The export file is not ready for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportService.downloadExport(job.id, job.name);
      
      toast({
        title: "Download Started",
        description: "Your file download has started.",
      });
    } catch (error) {
      console.error('Error downloading export:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the export file.",
        variant: "destructive",
      });
    }
  };

  const handleCancelExport = async (jobId: string) => {
    try {
      await exportService.cancelExport(jobId);
      
      setExportJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'failed' as const, errorMessage: 'Cancelled by user' } : j
      ));

      toast({
        title: "Export Cancelled",
        description: "The export job has been cancelled.",
      });
    } catch (error) {
      console.error('Error cancelling export:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel the export job.",
        variant: "destructive",
      });
    }
  };

  const resetExportForm = () => {
    setExportRequest({
      name: '',
      format: 'pdf',
      dataType: 'report',
      templateId: '',
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      filters: {},
      includeCharts: true,
      includeRawData: false
    });
  };

  const resetBulkExportForm = () => {
    setBulkExportRequest({
      name: '',
      format: 'excel',
      templateIds: [],
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      splitByTemplate: true,
      includeMetadata: true
    });
  };

  const getStatusIcon = (status: ExportRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ExportRequest['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const;

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Export Manager</h3>
          <p className="text-sm text-muted-foreground">
            Export reports and data in multiple formats
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isBulkExportDialogOpen} onOpenChange={setIsBulkExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Bulk Export
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                New Export
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Export Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Track your export jobs and download completed files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportJobs.length === 0 ? (
            <div className="text-center py-8">
              <Download className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No export jobs yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first export to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exportJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <h4 className="font-medium">{job.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {EXPORT_FORMATS.find(f => f.id === job.format)?.name} • 
                          Created {job.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(job.status)}
                      {job.status === 'completed' && job.downloadUrl && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(job)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                      {(job.status === 'pending' || job.status === 'processing') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelExport(job.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {job.status === 'processing' && job.progress !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Processing...</span>
                        <span>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                    </div>
                  )}
                  
                  {job.status === 'failed' && job.errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {job.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Export</DialogTitle>
            <DialogDescription>
              Export reports and analytics data in your preferred format
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-name">Export Name *</Label>
                  <Input
                    id="export-name"
                    value={exportRequest.name}
                    onChange={(e) => setExportRequest({ ...exportRequest, name: e.target.value })}
                    placeholder="Enter export name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPORT_FORMATS.map((format) => (
                      <Card
                        key={format.id}
                        className={`cursor-pointer transition-colors ${
                          exportRequest.format === format.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setExportRequest({ ...exportRequest, format: format.id })}
                      >
                        <CardContent className="p-3 text-center">
                          <format.icon className="h-6 w-6 mx-auto mb-2" />
                          <p className="font-medium text-sm">{format.name}</p>
                          <p className="text-xs text-muted-foreground">{format.extension}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Type</Label>
                  <Select
                    value={exportRequest.dataType}
                    onValueChange={(value: 'report' | 'analytics' | 'raw_data') =>
                      setExportRequest({ ...exportRequest, dataType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div>
                            <div className="font-medium">{type.name}</div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {exportRequest.dataType === 'report' && (
                  <div className="space-y-2">
                    <Label>Report Template</Label>
                    <Select
                      value={exportRequest.templateId}
                      onValueChange={(value) => setExportRequest({ ...exportRequest, templateId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={exportRequest.dateRange.startDate.toISOString().split('T')[0]}
                        onChange={(e) => setExportRequest({
                          ...exportRequest,
                          dateRange: {
                            ...exportRequest.dateRange,
                            startDate: new Date(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={exportRequest.dateRange.endDate.toISOString().split('T')[0]}
                        onChange={(e) => setExportRequest({
                          ...exportRequest,
                          dateRange: {
                            ...exportRequest.dateRange,
                            endDate: new Date(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Export Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-charts"
                        checked={exportRequest.includeCharts}
                        onCheckedChange={(checked) =>
                          setExportRequest({ ...exportRequest, includeCharts: !!checked })
                        }
                      />
                      <Label htmlFor="include-charts" className="text-sm">
                        Include charts and visualizations
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-raw-data"
                        checked={exportRequest.includeRawData}
                        onCheckedChange={(checked) =>
                          setExportRequest({ ...exportRequest, includeRawData: !!checked })
                        }
                      />
                      <Label htmlFor="include-raw-data" className="text-sm">
                        Include raw data tables
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSingleExport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Export Dialog */}
      <Dialog open={isBulkExportDialogOpen} onOpenChange={setIsBulkExportDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Bulk Export</DialogTitle>
            <DialogDescription>
              Export multiple report templates in a single operation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-export-name">Export Name *</Label>
              <Input
                id="bulk-export-name"
                value={bulkExportRequest.name}
                onChange={(e) => setBulkExportRequest({ ...bulkExportRequest, name: e.target.value })}
                placeholder="Enter bulk export name"
              />
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={bulkExportRequest.format}
                onValueChange={(value: ExportFormat) =>
                  setBulkExportRequest({ ...bulkExportRequest, format: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      <div className="flex items-center space-x-2">
                        <format.icon className="h-4 w-4" />
                        <span>{format.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Templates</Label>
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={bulkExportRequest.templateIds.includes(template.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkExportRequest({
                              ...bulkExportRequest,
                              templateIds: [...bulkExportRequest.templateIds, template.id]
                            });
                          } else {
                            setBulkExportRequest({
                              ...bulkExportRequest,
                              templateIds: bulkExportRequest.templateIds.filter(id => id !== template.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`template-${template.id}`} className="text-sm">
                        {template.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Selected: {bulkExportRequest.templateIds.length} templates
              </p>
            </div>

            <div className="space-y-3">
              <Label>Bulk Export Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="split-by-template"
                    checked={bulkExportRequest.splitByTemplate}
                    onCheckedChange={(checked) =>
                      setBulkExportRequest({ ...bulkExportRequest, splitByTemplate: !!checked })
                    }
                  />
                  <Label htmlFor="split-by-template" className="text-sm">
                    Create separate files for each template
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-metadata"
                    checked={bulkExportRequest.includeMetadata}
                    onCheckedChange={(checked) =>
                      setBulkExportRequest({ ...bulkExportRequest, includeMetadata: !!checked })
                    }
                  />
                  <Label htmlFor="include-metadata" className="text-sm">
                    Include export metadata and summary
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsBulkExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkExport}
              disabled={loading || bulkExportRequest.templateIds.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Create Bulk Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};