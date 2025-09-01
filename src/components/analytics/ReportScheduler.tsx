import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Send,
  History,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { analyticsService, ReportTemplate } from '@/services/analyticsService';
import { reportSchedulerService, ScheduledReport, ScheduleConfig, ReportExecution } from '@/services/reportSchedulerService';
import { useToast } from '@/hooks/use-toast';

interface ReportSchedulerProps {
  clinicId?: string;
}

export const ReportScheduler: React.FC<ReportSchedulerProps> = ({ clinicId }) => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    name: '',
    templateId: '',
    scheduleConfig: {
      frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
      dayOfWeek: 1, // Monday
      dayOfMonth: 1,
      hour: 9,
      minute: 0,
      timezone: 'America/New_York'
    } as ScheduleConfig,
    recipients: [''],
    isActive: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedules, templates] = await Promise.all([
        reportSchedulerService.getScheduledReports(),
        analyticsService.getReportTemplates()
      ]);
      setScheduledReports(schedules);
      setReportTemplates(templates);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load scheduled reports and templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = async (reportId: string) => {
    try {
      const history = await reportSchedulerService.getReportHistory(reportId);
      setReportHistory(history);
      setSelectedReportId(reportId);
      setIsHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error loading report history:', error);
      toast({
        title: "Error Loading History",
        description: "Failed to load report execution history.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a schedule name.",
        variant: "destructive",
      });
      return;
    }

    if (!newSchedule.templateId) {
      toast({
        title: "Missing Template",
        description: "Please select a report template.",
        variant: "destructive",
      });
      return;
    }

    const validRecipients = newSchedule.recipients.filter(email => 
      email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );

    if (validRecipients.length === 0) {
      toast({
        title: "Invalid Recipients",
        description: "Please provide at least one valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      await reportSchedulerService.createScheduledReport(
        newSchedule.name,
        newSchedule.templateId,
        newSchedule.scheduleConfig,
        validRecipients,
        newSchedule.isActive
      );

      toast({
        title: "Schedule Created",
        description: "Report schedule has been created successfully.",
      });

      setIsCreateDialogOpen(false);
      resetScheduleForm();
      loadData();
    } catch (error) {
      toast({
        title: "Error Creating Schedule",
        description: "Failed to create report schedule.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSchedule = async (reportId: string, isActive: boolean) => {
    try {
      await reportSchedulerService.updateScheduledReport(reportId, { isActive });
      
      toast({
        title: isActive ? "Schedule Activated" : "Schedule Paused",
        description: `Report schedule has been ${isActive ? 'activated' : 'paused'}.`,
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error Updating Schedule",
        description: "Failed to update report schedule.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (reportId: string) => {
    try {
      await reportSchedulerService.deleteScheduledReport(reportId);
      
      toast({
        title: "Schedule Deleted",
        description: "Report schedule has been deleted.",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error Deleting Schedule",
        description: "Failed to delete report schedule.",
        variant: "destructive",
      });
    }
  };

  const handleRunNow = async (reportId: string) => {
    try {
      toast({
        title: "Running Report",
        description: "Report is being generated and will be sent to recipients.",
      });

      await reportSchedulerService.executeScheduledReport(reportId);
      
      toast({
        title: "Report Sent",
        description: "Report has been generated and sent successfully.",
      });
    } catch (error) {
      toast({
        title: "Error Running Report",
        description: "Failed to execute report.",
        variant: "destructive",
      });
    }
  };

  const resetScheduleForm = () => {
    setNewSchedule({
      name: '',
      templateId: '',
      scheduleConfig: {
        frequency: 'weekly',
        dayOfWeek: 1,
        dayOfMonth: 1,
        hour: 9,
        minute: 0,
        timezone: 'America/New_York'
      },
      recipients: [''],
      isActive: true
    });
  };

  const addRecipient = () => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const updateRecipient = (index: number, email: string) => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: prev.recipients.map((recipient, i) => 
        i === index ? email : recipient
      )
    }));
  };

  const removeRecipient = (index: number) => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const formatNextRun = (nextRunAt: Date | null): string => {
    if (!nextRunAt) return 'Not scheduled';
    
    const now = new Date();
    const diff = nextRunAt.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Soon';
  };

  const getStatusBadge = (report: ScheduledReport) => {
    if (!report.isActive) {
      return <Badge variant="secondary">Paused</Badge>;
    }
    
    if (report.nextRunAt && new Date(report.nextRunAt) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Scheduler</CardTitle>
          <CardDescription>Loading scheduled reports...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Report Scheduler</h3>
          <p className="text-sm text-muted-foreground">
            Automate report generation and delivery
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Schedule Automated Report</DialogTitle>
              <DialogDescription>
                Set up automated report generation and email delivery.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Schedule Name *</Label>
                  <Input
                    id="schedule-name"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    placeholder="e.g., Weekly Performance Report"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-select">Report Template *</Label>
                  <Select
                    value={newSchedule.templateId}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, templateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a report template" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Schedule Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Schedule Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={newSchedule.scheduleConfig.frequency}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                        setNewSchedule({
                          ...newSchedule,
                          scheduleConfig: { ...newSchedule.scheduleConfig, frequency: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newSchedule.scheduleConfig.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={newSchedule.scheduleConfig.dayOfWeek?.toString()}
                        onValueChange={(value) =>
                          setNewSchedule({
                            ...newSchedule,
                            scheduleConfig: { ...newSchedule.scheduleConfig, dayOfWeek: parseInt(value) }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                          <SelectItem value="0">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newSchedule.scheduleConfig.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Select
                        value={newSchedule.scheduleConfig.dayOfMonth?.toString()}
                        onValueChange={(value) =>
                          setNewSchedule({
                            ...newSchedule,
                            scheduleConfig: { ...newSchedule.scheduleConfig, dayOfMonth: parseInt(value) }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hour (24h format)</Label>
                    <Select
                      value={newSchedule.scheduleConfig.hour.toString()}
                      onValueChange={(value) =>
                        setNewSchedule({
                          ...newSchedule,
                          scheduleConfig: { ...newSchedule.scheduleConfig, hour: parseInt(value) }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={newSchedule.scheduleConfig.timezone}
                      onValueChange={(value) =>
                        setNewSchedule({
                          ...newSchedule,
                          scheduleConfig: { ...newSchedule.scheduleConfig, timezone: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recipients */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Email Recipients</h4>
                  <Button variant="outline" size="sm" onClick={addRecipient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>

                <div className="space-y-2">
                  {newSchedule.recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={recipient}
                        onChange={(e) => updateRecipient(index, e.target.value)}
                        placeholder="email@example.com"
                        type="email"
                      />
                      {newSchedule.recipients.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={newSchedule.isActive}
                  onCheckedChange={(checked) =>
                    setNewSchedule({ ...newSchedule, isActive: !!checked })
                  }
                />
                <Label htmlFor="active" className="text-sm">
                  Activate schedule immediately
                </Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchedule}>
                  Create Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>
            Manage automated report generation and delivery schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledReports.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No scheduled reports found</p>
              <p className="text-sm text-muted-foreground">
                Create your first automated report schedule
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledReports.map((report) => {
                  const template = reportTemplates.find(t => t.id === report.templateId);
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{template?.name || 'Unknown Template'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.scheduleConfig.frequency === 'daily' && 'Daily'}
                          {report.scheduleConfig.frequency === 'weekly' && 
                            `Weekly on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][report.scheduleConfig.dayOfWeek || 1]}`
                          }
                          {report.scheduleConfig.frequency === 'monthly' && 
                            `Monthly on day ${report.scheduleConfig.dayOfMonth}`
                          }
                          <br />
                          <span className="text-muted-foreground">
                            at {report.scheduleConfig.hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatNextRun(report.nextRunAt ? new Date(report.nextRunAt) : null)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRunNow(report.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => loadReportHistory(report.id)}>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleSchedule(report.id, !report.isActive)}
                            >
                              {report.isActive ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteSchedule(report.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Report Execution History</DialogTitle>
            <DialogDescription>
              View the execution history for this scheduled report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reportHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No execution history found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Error Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportHistory.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell>
                          {new Date(execution.executedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getExecutionStatusIcon(execution.status)}
                            <span className="capitalize">{execution.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {execution.executionDuration ? 
                            `${execution.executionDuration}ms` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {execution.recipientCount || 0}
                        </TableCell>
                        <TableCell>
                          {execution.errorMessage && (
                            <span className="text-sm text-destructive">
                              {execution.errorMessage}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};