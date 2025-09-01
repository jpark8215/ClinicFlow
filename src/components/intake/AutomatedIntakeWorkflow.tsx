import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Brain,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { automatedIntakeService, type IntakeProcessingResult, type BatchIntakeProcessingResult } from '@/services/automatedIntakeService';
import { ManualReviewQueue } from './ManualReviewQueue';

interface AutomatedIntakeWorkflowProps {
  className?: string;
}

interface WorkflowStats {
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  manualReviewTasks: number;
  averageProcessingTime: number;
  successRate: number;
}

interface ProcessingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  tasksProcessed: number;
  successfulTasks: number;
  failedTasks: number;
  manualReviewTasks: number;
  isActive: boolean;
}

export const AutomatedIntakeWorkflow: React.FC<AutomatedIntakeWorkflowProps> = ({ className }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<ProcessingSession | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workflow statistics
  const {
    data: workflowStats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery<WorkflowStats>({
    queryKey: ['workflowStats'],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('intake_tasks')
        .select('status, created_at, updated_at, requires_manual_review');

      if (error) throw error;

      const stats: WorkflowStats = {
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.status === 'Pending OCR').length,
        processingTasks: tasks.filter(t => t.status === 'Processing').length,
        completedTasks: tasks.filter(t => t.status === 'Complete').length,
        failedTasks: tasks.filter(t => t.status === 'Failed').length,
        manualReviewTasks: tasks.filter(t => t.requires_manual_review).length,
        averageProcessingTime: 0, // Would calculate from processing times
        successRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'Complete').length / tasks.length) * 100 : 0
      };

      return stats;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch pending tasks for processing
  const {
    data: pendingTasks,
    isLoading: pendingLoading,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['pendingIntakeTasks'],
    queryFn: () => automatedIntakeService.getPendingIntakeTasks(20),
    refetchInterval: isProcessing ? 5000 : 30000
  });

  // Process all pending tasks mutation
  const processAllTasksMutation = useMutation({
    mutationFn: () => automatedIntakeService.processAllPendingTasks(),
    onSuccess: (result: BatchIntakeProcessingResult) => {
      setIsProcessing(false);
      setCurrentSession(prev => prev ? {
        ...prev,
        endTime: new Date(),
        tasksProcessed: result.totalTasks,
        successfulTasks: result.successCount,
        failedTasks: result.failureCount,
        manualReviewTasks: result.successful.filter(r => r.requiresManualReview).length,
        isActive: false
      } : null);

      toast({
        title: "Batch Processing Complete",
        description: `Processed ${result.totalTasks} tasks. ${result.successCount} successful, ${result.failureCount} failed.`
      });

      // Refresh data
      refetchStats();
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['manualReviewTasks'] });
    },
    onError: (error) => {
      setIsProcessing(false);
      setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Process single task mutation
  const processSingleTaskMutation = useMutation({
    mutationFn: (taskId: string) => automatedIntakeService.processIntakeTask(taskId),
    onSuccess: (result: IntakeProcessingResult) => {
      toast({
        title: "Task Processed",
        description: `Task ${result.taskId} processed successfully. Status: ${result.newStatus}`
      });

      refetchStats();
      refetchPending();
      
      if (result.requiresManualReview) {
        queryClient.invalidateQueries({ queryKey: ['manualReviewTasks'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Task Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const startBatchProcessing = () => {
    if (!pendingTasks || pendingTasks.length === 0) {
      toast({
        title: "No Tasks to Process",
        description: "There are no pending tasks available for processing.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentSession({
      id: `session_${Date.now()}`,
      startTime: new Date(),
      tasksProcessed: 0,
      successfulTasks: 0,
      failedTasks: 0,
      manualReviewTasks: 0,
      isActive: true
    });

    processAllTasksMutation.mutate();
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
  };

  const processSingleTask = (taskId: string) => {
    processSingleTaskMutation.mutate(taskId);
  };

  // Simulate processing progress (in real implementation, this would come from the service)
  useEffect(() => {
    if (isProcessing && pendingTasks) {
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = Math.min(prev + (100 / pendingTasks.length), 100);
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isProcessing, pendingTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending OCR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Needs Validation':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'Pending OCR':
        return <Clock className="h-4 w-4" />;
      case 'Needs Validation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Automated Intake Workflow</h1>
            <p className="text-muted-foreground">
              AI-powered document processing and validation system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                refetchStats();
                refetchPending();
              }}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {isProcessing ? (
              <Button variant="destructive" onClick={stopProcessing}>
                <Pause className="h-4 w-4 mr-2" />
                Stop Processing
              </Button>
            ) : (
              <Button onClick={startBatchProcessing} disabled={!pendingTasks || pendingTasks.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                Start Batch Processing
              </Button>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {currentSession && currentSession.isActive && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Processing intake tasks with AI validation...</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(processingProgress)}% complete
                  </span>
                </div>
                <Progress value={processingProgress} className="w-full" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflowStats?.totalTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                All intake tasks in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflowStats?.pendingTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting OCR processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Review</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflowStats?.manualReviewTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Requiring human review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflowStats?.successRate ? Math.round(workflowStats.successRate) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Automated processing success
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">Pending Tasks</TabsTrigger>
            <TabsTrigger value="review">Manual Review</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Overview</CardTitle>
                <CardDescription>
                  Current status of the automated intake processing system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Session Info */}
                  {currentSession && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Current Processing Session</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <div className="font-medium">
                            {format(currentSession.startTime, 'HH:mm:ss')}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tasks Processed:</span>
                          <div className="font-medium">{currentSession.tasksProcessed}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Successful:</span>
                          <div className="font-medium text-green-600">{currentSession.successfulTasks}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Manual Review:</span>
                          <div className="font-medium text-orange-600">{currentSession.manualReviewTasks}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Processing Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Task Status Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Completed</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {workflowStats?.completedTasks || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pending</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {workflowStats?.pendingTasks || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Manual Review</span>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            {workflowStats?.manualReviewTasks || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Failed</span>
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {workflowStats?.failedTasks || 0}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">AI Processing Insights</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• OCR confidence threshold: 80%</p>
                        <p>• Critical field threshold: 85%</p>
                        <p>• Business rules validation: Active</p>
                        <p>• Duplicate detection: Enabled</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>
                  Tasks waiting for automated processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : pendingTasks && pendingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{task.status}</span>
                          </Badge>
                          <div>
                            <div className="font-medium">{task.task_description}</div>
                            <div className="text-sm text-muted-foreground">
                              Created: {format(new Date(task.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => processSingleTask(task.id)}
                            disabled={processSingleTaskMutation.isPending}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending tasks found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <ManualReviewQueue />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Settings</CardTitle>
                <CardDescription>
                  Configure automated intake processing parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Workflow settings configuration will be implemented in a future update.
                      Current settings are managed through the database configuration.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Current Configuration</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>OCR Confidence Threshold:</span>
                          <span className="font-medium">80%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Critical Field Threshold:</span>
                          <span className="font-medium">85%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Batch Processing Limit:</span>
                          <span className="font-medium">50 tasks</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto-retry Failed Tasks:</span>
                          <span className="font-medium">Enabled</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">AI Validation Rules</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Business rules validation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Duplicate patient detection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Field format validation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Cross-field consistency checks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AutomatedIntakeWorkflow;