import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';
import { batchDocumentService } from '@/services/batchDocumentService';
import { documentService } from '@/services/documentService';
import type { 
  BatchDocumentJob, 
  DocumentRequest, 
  BatchJobSettings, 
  JobPriority,
  BatchJobStatus,
  JobQueueStats
} from '@/types/batchProcessing';
import type { DocumentTemplate } from '@/types';

interface BatchDocumentProcessorProps {
  onJobCreated?: (jobId: string) => void;
}

export const BatchDocumentProcessor: React.FC<BatchDocumentProcessorProps> = ({
  onJobCreated
}) => {
  const [activeTab, setActiveTab] = useState('create');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [jobs, setJobs] = useState<BatchDocumentJob[]>([]);
  const [queueStats, setQueueStats] = useState<JobQueueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job creation form state
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [priority, setPriority] = useState<JobPriority>('normal');
  const [requests, setRequests] = useState<Omit<DocumentRequest, 'id'>[]>([]);
  const [settings, setSettings] = useState<Partial<BatchJobSettings>>({
    maxConcurrentProcessing: 5,
    retryFailedDocuments: true,
    maxRetries: 3,
    notifyOnCompletion: false,
    outputFormat: 'pdf',
    compressionEnabled: true,
    generateZipArchive: true
  });

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [templatesData, jobsData, statsData] = await Promise.all([
        documentService.getTemplates({ isActive: true }),
        batchDocumentService.getBatchJobs(),
        batchDocumentService.getQueueStats()
      ]);
      
      setTemplates(templatesData);
      setJobs(jobsData);
      setQueueStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [jobsData, statsData] = await Promise.all([
        batchDocumentService.getBatchJobs(),
        batchDocumentService.getQueueStats()
      ]);
      
      setJobs(jobsData);
      setQueueStats(statsData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const handleCreateJob = async () => {
    if (!jobName || !selectedTemplate || requests.length === 0) {
      setError('Please fill in all required fields and add at least one document request');
      return;
    }

    try {
      setLoading(true);
      const jobId = await batchDocumentService.createBatchJob(
        jobName,
        selectedTemplate,
        requests,
        settings,
        priority,
        jobDescription
      );

      // Reset form
      setJobName('');
      setJobDescription('');
      setSelectedTemplate('');
      setRequests([]);
      setPriority('normal');
      
      // Switch to monitor tab
      setActiveTab('monitor');
      
      // Refresh data
      await refreshData();
      
      onJobCreated?.(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      switch (action) {
        case 'pause':
          await batchDocumentService.pauseJob(jobId);
          break;
        case 'resume':
          await batchDocumentService.resumeJob(jobId);
          break;
        case 'cancel':
          await batchDocumentService.cancelJob(jobId);
          break;
      }
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    }
  };

  const addDocumentRequest = () => {
    setRequests([...requests, {
      templateId: selectedTemplate,
      documentName: `Document ${requests.length + 1}`,
      mergeData: {},
      priority: 1
    }]);
  };

  const removeDocumentRequest = (index: number) => {
    setRequests(requests.filter((_, i) => i !== index));
  };

  const updateDocumentRequest = (index: number, updates: Partial<Omit<DocumentRequest, 'id'>>) => {
    setRequests(requests.map((req, i) => i === index ? { ...req, ...updates } : req));
  };

  const getStatusIcon = (status: BatchJobStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BatchJobStatus) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: JobPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Job</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Jobs</TabsTrigger>
          <TabsTrigger value="queue">Queue Status</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Batch Document Job</CardTitle>
              <CardDescription>
                Generate multiple documents from a template with batch processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobName">Job Name *</Label>
                  <Input
                    id="jobName"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Enter job name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(value: JobPriority) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Description</Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Optional job description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Document Template *</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Document Requests ({requests.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDocumentRequest}
                    disabled={!selectedTemplate}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Request
                  </Button>
                </div>

                {requests.map((request, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Document Name</Label>
                        <Input
                          value={request.documentName}
                          onChange={(e) => updateDocumentRequest(index, { documentName: e.target.value })}
                          placeholder="Document name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Patient ID</Label>
                        <Input
                          value={request.patientId || ''}
                          onChange={(e) => updateDocumentRequest(index, { patientId: e.target.value })}
                          placeholder="Optional patient ID"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDocumentRequest(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-4">
                <h4 className="font-medium mb-4">Job Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Concurrent Processing</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxConcurrentProcessing}
                      onChange={(e) => setSettings({
                        ...settings,
                        maxConcurrentProcessing: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select 
                      value={settings.outputFormat} 
                      onValueChange={(value: 'pdf' | 'docx' | 'both') => 
                        setSettings({ ...settings, outputFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word Document</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="retryFailed"
                      checked={settings.retryFailedDocuments}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, retryFailedDocuments: !!checked })
                      }
                    />
                    <Label htmlFor="retryFailed">Retry failed documents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyCompletion"
                      checked={settings.notifyOnCompletion}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, notifyOnCompletion: !!checked })
                      }
                    />
                    <Label htmlFor="notifyCompletion">Notify on completion</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateZip"
                      checked={settings.generateZipArchive}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, generateZipArchive: !!checked })
                      }
                    />
                    <Label htmlFor="generateZip">Generate ZIP archive</Label>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={handleCreateJob} 
                disabled={loading || !jobName || !selectedTemplate || requests.length === 0}
                className="w-full"
              >
                {loading ? 'Creating Job...' : 'Create Batch Job'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Monitor</CardTitle>
              <CardDescription>
                Track the progress of your batch document generation jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <p className="text-sm text-gray-500">{job.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {job.progress.processedDocuments} / {job.progress.totalDocuments}
                          </span>
                        </div>
                        <Progress 
                          value={(job.progress.processedDocuments / job.progress.totalDocuments) * 100} 
                        />
                        {job.progress.currentDocument && (
                          <p className="text-sm text-gray-500">
                            Processing: {job.progress.currentDocument}
                          </p>
                        )}
                        {job.progress.estimatedTimeRemaining && (
                          <p className="text-sm text-gray-500">
                            Estimated time remaining: {Math.round(job.progress.estimatedTimeRemaining / 60)} minutes
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-medium">{job.progress.totalDocuments}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Successful:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {job.progress.successfulDocuments}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Failed:</span>
                        <span className="ml-1 font-medium text-red-600">
                          {job.progress.failedDocuments}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Rate:</span>
                        <span className="ml-1 font-medium">
                          {job.progress.processingRate?.toFixed(1) || 0} docs/min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Created: {job.createdAt.toLocaleString()}
                        {job.completedAt && (
                          <span className="ml-4">
                            Completed: {job.completedAt.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {job.status === 'processing' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJobAction(job.id, 'pause')}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJobAction(job.id, 'resume')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {(job.status === 'processing' || job.status === 'paused' || job.status === 'queued') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJobAction(job.id, 'cancel')}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {jobs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No batch jobs found. Create your first job to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Queue Statistics</CardTitle>
              <CardDescription>
                Overview of the batch processing queue and system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-sm text-gray-500">Queued Jobs</p>
                        <p className="text-2xl font-bold">{queueStats.queuedJobs}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <Play className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-500">Processing</p>
                        <p className="text-2xl font-bold">{queueStats.processingJobs}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="text-2xl font-bold">{queueStats.completedJobs}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-gray-500">Throughput</p>
                        <p className="text-2xl font-bold">
                          {queueStats.currentThroughput.toFixed(1)}/hr
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};