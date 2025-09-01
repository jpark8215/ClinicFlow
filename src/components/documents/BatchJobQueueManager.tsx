import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  ArrowUp, 
  ArrowDown, 
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { batchDocumentService } from '@/services/batchDocumentService';
import type { 
  BatchDocumentJob, 
  QueuedJob, 
  JobQueueStats, 
  JobPriority,
  BatchJobStatus 
} from '@/types/batchProcessing';

interface BatchJobQueueManagerProps {
  onJobSelected?: (jobId: string) => void;
  refreshInterval?: number;
}

export const BatchJobQueueManager: React.FC<BatchJobQueueManagerProps> = ({
  onJobSelected,
  refreshInterval = 5000
}) => {
  const [queuedJobs, setQueuedJobs] = useState<BatchDocumentJob[]>([]);
  const [processingJobs, setProcessingJobs] = useState<BatchDocumentJob[]>([]);
  const [queueStats, setQueueStats] = useState<JobQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadQueueData();
    
    const interval = setInterval(loadQueueData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadQueueData = async () => {
    try {
      const [allJobs, stats] = await Promise.all([
        batchDocumentService.getBatchJobs(),
        batchDocumentService.getQueueStats()
      ]);

      const queued = allJobs.filter(job => job.status === 'queued');
      const processing = allJobs.filter(job => job.status === 'processing');

      setQueuedJobs(queued);
      setProcessingJobs(processing);
      setQueueStats(stats);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue data');
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
      
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    }
  };

  const getPriorityColor = (priority: JobPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityWeight = (priority: JobPriority) => {
    switch (priority) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  };

  const formatEstimatedWaitTime = (job: BatchDocumentJob, position: number) => {
    if (!queueStats || queueStats.currentThroughput === 0) {
      return 'Calculating...';
    }

    // Estimate based on jobs ahead in queue and current throughput
    const jobsAhead = queuedJobs
      .filter(qJob => getPriorityWeight(qJob.priority) > getPriorityWeight(job.priority))
      .length + position;

    const estimatedHours = jobsAhead / queueStats.currentThroughput;
    
    if (estimatedHours < 1) {
      return `${Math.round(estimatedHours * 60)} minutes`;
    } else if (estimatedHours < 24) {
      return `${Math.round(estimatedHours)} hours`;
    } else {
      return `${Math.round(estimatedHours / 24)} days`;
    }
  };

  const calculateJobProgress = (job: BatchDocumentJob) => {
    if (job.progress.totalDocuments === 0) return 0;
    return (job.progress.processedDocuments / job.progress.totalDocuments) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading queue data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Queue Statistics */}
      {queueStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Queue Statistics</span>
                </CardTitle>
                <CardDescription>
                  Real-time overview of batch processing performance
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadQueueData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {queueStats.queuedJobs}
                </div>
                <div className="text-sm text-gray-600">Queued</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {queueStats.processingJobs}
                </div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {queueStats.completedJobs}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {queueStats.failedJobs}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {queueStats.currentThroughput.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Jobs/Hour</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round(queueStats.averageProcessingTime / 60000)}m
                </div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currently Processing Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-blue-500" />
            <span>Currently Processing ({processingJobs.length})</span>
          </CardTitle>
          <CardDescription>
            Jobs that are actively being processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processingJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs currently processing
            </div>
          ) : (
            <div className="space-y-4">
              {processingJobs.map((job) => (
                <Card key={job.id} className="p-4 border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Play className="h-4 w-4 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{job.name}</h4>
                        <p className="text-sm text-gray-600">{job.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(job.priority)}>
                        {job.priority}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        Processing
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {job.progress.processedDocuments} / {job.progress.totalDocuments}
                      </span>
                    </div>
                    <Progress value={calculateJobProgress(job)} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{calculateJobProgress(job).toFixed(1)}% complete</span>
                      {job.progress.processingRate && (
                        <span>{job.progress.processingRate.toFixed(1)} docs/min</span>
                      )}
                    </div>
                  </div>

                  {job.progress.currentDocument && (
                    <div className="text-sm text-gray-600 mb-3">
                      Currently processing: <strong>{job.progress.currentDocument}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Started: {job.startedAt?.toLocaleTimeString() || 'Unknown'}
                      {job.progress.estimatedTimeRemaining && (
                        <span className="ml-4">
                          ETA: {Math.round(job.progress.estimatedTimeRemaining / 60)} min
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJobAction(job.id, 'pause')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJobAction(job.id, 'cancel')}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                      {onJobSelected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onJobSelected(job.id)}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span>Job Queue ({queuedJobs.length})</span>
          </CardTitle>
          <CardDescription>
            Jobs waiting to be processed, ordered by priority and creation time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queuedJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs in queue
            </div>
          ) : (
            <div className="space-y-4">
              {queuedJobs
                .sort((a, b) => {
                  // Sort by priority first, then by creation time
                  const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                  if (priorityDiff !== 0) return priorityDiff;
                  return a.createdAt.getTime() - b.createdAt.getTime();
                })
                .map((job, index) => (
                  <Card key={job.id} className="p-4 border-yellow-200 bg-yellow-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-600">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <p className="text-sm text-gray-600">{job.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Queued
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Documents:</span>
                        <span className="ml-1 font-medium">{job.progress.totalDocuments}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-1 font-medium">{job.createdAt.toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Est. Wait:</span>
                        <span className="ml-1 font-medium">{formatEstimatedWaitTime(job, index)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Position:</span>
                        <span className="ml-1 font-medium">{index + 1} of {queuedJobs.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Queued for {Math.round((Date.now() - job.createdAt.getTime()) / 60000)} minutes
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleJobAction(job.id, 'cancel')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {onJobSelected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onJobSelected(job.id)}
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Refresh Info */}
      <div className="text-center text-xs text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
        <span className="mx-2">•</span>
        Auto-refresh every {refreshInterval / 1000} seconds
      </div>
    </div>
  );
};