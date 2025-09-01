import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ReportScheduler } from './ReportScheduler';
import { ExportManager } from './ExportManager';
import {
  FileText,
  Plus,
  Download,
  Calendar,
  Clock,
  Settings,
  Play,
  Pause,
  Edit,
  Trash2,
  GripVertical,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Target
} from 'lucide-react';
import { analyticsService, ReportTemplate } from '@/services/analyticsService';
import { useToast } from '@/hooks/use-toast';

// Available metrics for report building
interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  dataType: 'number' | 'percentage' | 'currency' | 'duration';
  chartTypes: string[];
}

interface ReportSection {
  id: string;
  title: string;
  metrics: string[];
  chartType: string;
  order: number;
}

interface ReportConfig {
  sections: ReportSection[];
  dateRange: string;
  format: string;
  filters: Record<string, any>;
  layout: 'single-column' | 'two-column' | 'grid';
}

interface CustomReportsProps {
  clinicId?: string;
}

const AVAILABLE_METRICS: MetricDefinition[] = [
  {
    id: 'total_appointments',
    name: 'Total Appointments',
    description: 'Total number of appointments in the selected period',
    category: 'Appointments',
    icon: Calendar,
    dataType: 'number',
    chartTypes: ['number', 'line', 'bar']
  },
  {
    id: 'completed_appointments',
    name: 'Completed Appointments',
    description: 'Number of successfully completed appointments',
    category: 'Appointments',
    icon: Target,
    dataType: 'number',
    chartTypes: ['number', 'line', 'bar', 'pie']
  },
  {
    id: 'no_show_rate',
    name: 'No-Show Rate',
    description: 'Percentage of appointments that resulted in no-shows',
    category: 'Appointments',
    icon: Users,
    dataType: 'percentage',
    chartTypes: ['number', 'line', 'gauge']
  },
  {
    id: 'completion_rate',
    name: 'Completion Rate',
    description: 'Percentage of appointments that were completed',
    category: 'Appointments',
    icon: Activity,
    dataType: 'percentage',
    chartTypes: ['number', 'line', 'gauge', 'pie']
  },
  {
    id: 'utilization_rate',
    name: 'Utilization Rate',
    description: 'Percentage of available appointment slots that were booked',
    category: 'Capacity',
    icon: BarChart3,
    dataType: 'percentage',
    chartTypes: ['number', 'line', 'gauge']
  },
  {
    id: 'average_duration',
    name: 'Average Duration',
    description: 'Average duration of completed appointments',
    category: 'Efficiency',
    icon: Clock,
    dataType: 'duration',
    chartTypes: ['number', 'line', 'bar']
  },
  {
    id: 'estimated_revenue',
    name: 'Estimated Revenue',
    description: 'Total estimated revenue from completed appointments',
    category: 'Financial',
    icon: DollarSign,
    dataType: 'currency',
    chartTypes: ['number', 'line', 'bar']
  },
  {
    id: 'revenue_trend',
    name: 'Revenue Trend',
    description: 'Revenue trends over time',
    category: 'Financial',
    icon: TrendingUp,
    dataType: 'currency',
    chartTypes: ['line', 'bar', 'area']
  }
];

const CHART_TYPES = [
  { id: 'number', name: 'Number Display', icon: '123' },
  { id: 'line', name: 'Line Chart', icon: '📈' },
  { id: 'bar', name: 'Bar Chart', icon: '📊' },
  { id: 'pie', name: 'Pie Chart', icon: '🥧' },
  { id: 'area', name: 'Area Chart', icon: '📈' },
  { id: 'gauge', name: 'Gauge Chart', icon: '⏲️' }
];

export const CustomReports: React.FC<CustomReportsProps> = ({ clinicId }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    patientFlow?: any;
    appointmentUtilization?: any;
    revenueMetrics?: any;
    generatedAt: Date;
    config: ReportConfig;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    isPublic: false,
    config: {
      sections: [] as ReportSection[],
      dateRange: 'last_30_days',
      format: 'pdf',
      filters: {},
      layout: 'single-column' as 'single-column' | 'two-column' | 'grid'
    } as ReportConfig
  });

  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const reportTemplates = await analyticsService.getReportTemplates();
      setTemplates(reportTemplates);
    } catch (error) {
      console.error('Error loading report templates:', error);
      toast({
        title: "Error Loading Reports",
        description: "Failed to load report templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, metricId: string) => {
    e.dataTransfer.setData('text/plain', metricId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const metricId = e.dataTransfer.getData('text/plain');
    const metric = AVAILABLE_METRICS.find(m => m.id === metricId);

    if (metric) {
      addMetricToReport(metric);
    }
  }, [addMetricToReport]);

  const addMetricToReport = useCallback((metric: MetricDefinition) => {
    const newSection: ReportSection = {
      id: `section_${Date.now()}`,
      title: metric.name,
      metrics: [metric.id],
      chartType: metric.chartTypes[0],
      order: newTemplate.config.sections.length
    };

    setNewTemplate((prev: { config: { sections: any; }; }) => ({
      ...prev,
      config: {
        ...prev.config,
        sections: [...prev.config.sections, newSection]
      }
    }));
  }, [newTemplate.config.sections.length]);

  const removeSection = (sectionId: string) => {
    setNewTemplate((prev: { config: { sections: any[]; }; }) => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.filter((s: { id: string; }) => s.id !== sectionId)
      }
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setNewTemplate((prev: { config: { sections: any[]; }; }) => ({
      ...prev,
      config: {
        ...prev.config,
        sections: prev.config.sections.map((s: { id: string; }) =>
          s.id === sectionId ? { ...s, ...updates } : s
        )
      }
    }));
  };

  const generatePreview = async () => {
    if (newTemplate.config.sections.length === 0) {
      toast({
        title: "No Metrics Selected",
        description: "Please add at least one metric to preview the report.",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewLoading(true);
    try {
      // Generate sample data for preview
      const sampleData = await analyticsService.computeRealTimeMetrics();
      setPreviewData({
        ...sampleData,
        generatedAt: new Date(),
        config: newTemplate.config
      });
    } catch (error) {
      toast({
        title: "Preview Error",
        description: "Failed to generate report preview.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a report name.",
        variant: "destructive",
      });
      return;
    }

    if (newTemplate.config.sections.length === 0) {
      toast({
        title: "No Metrics Selected",
        description: "Please add at least one metric to your report.",
        variant: "destructive",
      });
      return;
    }

    try {
      await analyticsService.createReportTemplate(
        newTemplate.name,
        newTemplate.description,
        newTemplate.config,
        newTemplate.isPublic
      );

      toast({
        title: "Report Template Created",
        description: "Your custom report template has been saved.",
      });

      setIsCreateDialogOpen(false);
      resetTemplateForm();
      loadTemplates();
    } catch (error) {
      toast({
        title: "Error Creating Template",
        description: "Failed to create report template.",
        variant: "destructive",
      });
    }
  };

  const resetTemplateForm = () => {
    setNewTemplate({
      name: '',
      description: '',
      isPublic: false,
      config: {
        sections: [],
        dateRange: 'last_30_days',
        format: 'pdf',
        filters: {},
        layout: 'single-column'
      }
    });
    setPreviewData(null);
  };

  // Helper function to get preview value from sample data
  const getPreviewValue = (metricId: string, data: any): number => {
    switch (metricId) {
      case 'total_appointments':
        return data.patientFlow?.totalAppointments || 0;
      case 'completed_appointments':
        return data.patientFlow?.completedAppointments || 0;
      case 'no_show_rate':
        return data.patientFlow?.noShowRate || 0;
      case 'completion_rate':
        return data.patientFlow?.completionRate || 0;
      case 'utilization_rate':
        return data.appointmentUtilization?.utilizationRate || 0;
      case 'average_duration':
        return data.patientFlow?.averageDuration || 0;
      case 'estimated_revenue':
        return data.revenueMetrics?.estimatedRevenue || 0;
      default:
        return Math.floor(Math.random() * 1000); // Fallback sample data
    }
  };

  // Helper function to format values based on data type
  const formatValue = (value: number, dataType?: string): string => {
    switch (dataType) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'duration':
        return `${Math.round(value)} min`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const handleGenerateReport = async (templateId: string) => {
    try {
      toast({
        title: "Generating Report",
        description: "Your report is being generated...",
      });

      const report = await analyticsService.generateReport(templateId);

      // In a real implementation, this would trigger a download or display the report
      console.log('Generated report:', report);

      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error Generating Report",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    }
  };

  // Sample templates for demonstration
  const sampleTemplates = templates.length === 0 ? [
    {
      id: '1',
      name: 'Monthly Performance Report',
      description: 'Comprehensive monthly clinic performance analysis',
      templateConfig: { metrics: ['appointments', 'revenue', 'utilization'], format: 'pdf' },
      isPublic: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'No-Show Analysis',
      description: 'Detailed analysis of appointment no-shows and patterns',
      templateConfig: { metrics: ['no-shows', 'patterns'], format: 'excel' },
      isPublic: false,
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ] : templates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Reports</h3>
          <p className="text-sm text-muted-foreground">
            Create, schedule, and manage custom analytics reports
          </p>
        </div>
      </div>

      {/* Tabs for Reports, Scheduler, and Export */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="exports">Export Manager</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create Custom Report Template</DialogTitle>
              <DialogDescription>
                Build a custom report template with drag-and-drop metrics and preview functionality.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="builder" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="builder">Report Builder</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                  {/* Available Metrics Panel */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Available Metrics</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag metrics to the report builder to add them
                      </p>
                    </div>

                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {Object.entries(
                          AVAILABLE_METRICS.reduce((acc, metric) => {
                            if (!acc[metric.category]) acc[metric.category] = [];
                            acc[metric.category].push(metric);
                            return acc;
                          }, {} as Record<string, MetricDefinition[]>)
                        ).map(([category, metrics]) => (
                          <div key={category} className="space-y-2">
                            <h5 className="font-medium text-sm text-muted-foreground">
                              {category}
                            </h5>
                            {metrics.map((metric) => (
                              <Card
                                key={metric.id}
                                className="p-3 cursor-grab hover:bg-accent transition-colors"
                                draggable
                                onDragStart={(e: any) => handleDragStart(e, metric.id)}
                              >
                                <div className="flex items-start space-x-2">
                                  <metric.icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{metric.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {metric.description}
                                    </p>
                                  </div>
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </Card>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Report Builder Panel */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Report Sections</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drop metrics here to build your report
                      </p>
                    </div>

                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 min-h-[400px]"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      {newTemplate.config.sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">
                            Drag metrics from the left panel to start building your report
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {newTemplate.config.sections.map((section: { metrics: string[]; id: string; title: any; chartType: any; }) => {
                              const metric = AVAILABLE_METRICS.find(m => m.id === section.metrics[0]);
                              return (
                                <Card key={section.id} className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      {metric && <metric.icon className="h-4 w-4" />}
                                      <Input
                                        value={section.title}
                                        onChange={(e: { target: { value: any; }; }) => updateSection(section.id, { title: e.target.value })}
                                        className="font-medium"
                                        placeholder="Section title"
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSection(section.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs">Chart Type</Label>
                                      <Select
                                        value={section.chartType}
                                        onValueChange={(value: any) => updateSection(section.id, { chartType: value })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {metric?.chartTypes.map((chartType) => {
                                            const chart = CHART_TYPES.find(c => c.id === chartType);
                                            return chart ? (
                                              <SelectItem key={chartType} value={chartType}>
                                                {chart.icon} {chart.name}
                                              </SelectItem>
                                            ) : null;
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label className="text-xs">Metric</Label>
                                      <div className="text-sm font-medium mt-1">
                                        {metric?.name}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Report Name *</Label>
                      <Input
                        id="name"
                        value={newTemplate.name}
                        onChange={(e: { target: { value: any; }; }) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="Enter report name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTemplate.description}
                        onChange={(e: { target: { value: any; }; }) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Describe what this report includes"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="public"
                        checked={newTemplate.isPublic}
                        onCheckedChange={(checked: any) =>
                          setNewTemplate({ ...newTemplate, isPublic: !!checked })
                        }
                      />
                      <Label htmlFor="public" className="text-sm">
                        Make this template public (visible to all users)
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select
                        value={newTemplate.config.dateRange}
                        onValueChange={(value: any) =>
                          setNewTemplate({
                            ...newTemplate,
                            config: { ...newTemplate.config, dateRange: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                          <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                          <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                          <SelectItem value="last_year">Last Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select
                        value={newTemplate.config.format}
                        onValueChange={(value: any) =>
                          setNewTemplate({
                            ...newTemplate,
                            config: { ...newTemplate.config, format: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Document</SelectItem>
                          <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                          <SelectItem value="csv">CSV Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Layout</Label>
                      <Select
                        value={newTemplate.config.layout}
                        onValueChange={(value: 'single-column' | 'two-column' | 'grid') =>
                          setNewTemplate({
                            ...newTemplate,
                            config: { ...newTemplate.config, layout: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single-column">Single Column</SelectItem>
                          <SelectItem value="two-column">Two Columns</SelectItem>
                          <SelectItem value="grid">Grid Layout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Report Preview</h4>
                    <p className="text-sm text-muted-foreground">
                      Preview your report with sample data
                    </p>
                  </div>
                  <Button onClick={generatePreview} disabled={isPreviewLoading}>
                    {isPreviewLoading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Preview
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="border rounded-lg p-6 min-h-[400px] bg-background">
                  {!previewData ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        Click "Generate Preview" to see how your report will look
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center border-b pb-4">
                        <h2 className="text-xl font-semibold">{newTemplate.name || 'Custom Report'}</h2>
                        <p className="text-sm text-muted-foreground">
                          Generated on {previewData.generatedAt.toLocaleDateString()}
                        </p>
                      </div>

                      <div className={`grid gap-6 ${newTemplate.config.layout === 'two-column' ? 'grid-cols-2' :
                        newTemplate.config.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                          'grid-cols-1'
                        }`}>
                        {newTemplate.config.sections.map((section: { metrics: string[]; id: any; title: any; chartType: string; }) => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === section.metrics[0]);
                          const value = getPreviewValue(section.metrics[0], previewData);

                          return (
                            <Card key={section.id} className="p-4">
                              <div className="flex items-center space-x-2 mb-3">
                                {metric && <metric.icon className="h-5 w-5" />}
                                <h3 className="font-medium">{section.title}</h3>
                              </div>

                              <div className="text-center">
                                {section.chartType === 'number' ? (
                                  <div className="text-3xl font-bold text-primary">
                                    {formatValue(value, metric?.dataType)}
                                  </div>
                                ) : (
                                  <div className="h-32 bg-muted rounded flex items-center justify-center">
                                    <span className="text-sm text-muted-foreground">
                                      {CHART_TYPES.find(c => c.id === section.chartType)?.name} Preview
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetTemplateForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleTemplates.map((template: { id: string; name: any; isPublic: any; description: any; templateConfig: { format: any; }; createdAt: { toLocaleDateString: () => any; }; }) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                {template.isPublic && (
                  <Badge variant="secondary" className="text-xs">
                    Public
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium uppercase">
                  {template.templateConfig.format || 'PDF'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {template.createdAt.toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerateReport(template.id)}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Generate
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>
            Automated report generation and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Weekly Performance Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Every Monday at 9:00 AM
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
                <Button variant="outline" size="sm">
                  <Pause className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Monthly Financial Report</h4>
                  <p className="text-sm text-muted-foreground">
                    First day of each month at 8:00 AM
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-gray-600">
                  Paused
                </Badge>
                <Button variant="outline" size="sm">
                  <Play className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <ReportScheduler clinicId={clinicId} />
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">
          <ExportManager clinicId={clinicId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Recently generated reports and downloads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Monthly Performance - January 2025', date: '2025-01-31', size: '2.4 MB', format: 'PDF' },
                  { name: 'No-Show Analysis - Week 4', date: '2025-01-28', size: '1.8 MB', format: 'Excel' },
                  { name: 'Revenue Report - Q4 2024', date: '2025-01-15', size: '3.1 MB', format: 'PDF' }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.date} • {report.size} • {report.format}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};