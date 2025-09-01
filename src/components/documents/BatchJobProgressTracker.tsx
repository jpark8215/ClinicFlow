import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Square,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { batchDocumentService } from '@/services/batchDocumentService';
import type { 
  BatchDocumentJob, 
  BatchJobProgress, 
  BatchJobStatus 
} from '@/types/batchProcessing';

interface BatchJobProgressTrackerProps {
  jobId: string;
  onJobComplete?: (job: BatchDocumentJob) => void;
  onJobError?: (error: string) => void;
}

interface JobUpdate {
  jobId: string;
  status: BatchJobStatus;
  progress?: Partial<BatchJobProgress>;
  timestamp: string;
}

export const BatchJobProgressTracker: React.FC<BatchJobProgressTrackerProps> = ({
  jobId,
  onJobComplete,
  onJobError
}) => {
  const [job, setJob] = useState<BatchDocumentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadJob();
    setupRealtimeSubscription();
    
    // Fallback polling in case realtime fails
    const pollInterval = setInterval(loadJob, 10000); // Poll every 10 seconds
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [jobId]);

  const loadJob = async () => {
    try {
      const jobData = await batchDocumentService.getBatchJob(jobId);
      if (jobData) {
        setJob(jobData);
        setLastUpdate(new Date());
        
        // Check if job is complete
        if (jobData.status === 'completed' && onJobComplete) {
          onJobComplete(jobData);
        }
      } else {
        setError('Job not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load job';
      setError(errorMessage);
      onJobError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`batch-job-${jobId}`);
    
    channel
      .on('broadcast', { event: 'job_update' }, (payload) => {
        const update = payload.payload as JobUpdate;
        if (update.jobId === jobId) {
          handleRealtimeUpdate(update);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRealtimeUpdate = (update: JobUpdate) => {
    setJob(prevJob => {
      if (!prevJob) return prevJob;
      
      const updatedJob = {
        ...prevJob,
        status: update.status,
        progress: update.progress ? { ...prevJob.progress, ...update.progress } : prevJob.progress
      };

      // Update completion time if job is finished
      if ((update.status === 'completed' || update.status === 'failed' || update.status === 'cancelled') 
          && !prevJob.completedAt) {
        updatedJob.completedAt = new Date(update.timestamp);
      }

      return updatedJob;
    });
    
    setLastUpdate(new Date());
  };

  const handleJobAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!job) return;
    
    try {
      switch (action) {
        case 'pause':
          await batchDocumentService.pauseJob(job.id);
          break;
        case 'resume':
          await batchDocumentService.resumeJob(job.id);
          break;
        case 'cancel':
          await batchDocumentService.cancelJob(job.id);
          break;
      }
      
      // Refresh job data
      await loadJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    }
  };

  const getStatusIcon = (status: BatchJobStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <Square className="h-5 w-5 text-gray-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
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

  const calculateProgress = () => {
    if (!job) return 0;
    return job.progress.totalDocuments > 0 
      ? (job.progress.processedDocuments / job.progress.totalDocuments) * 100 
      : 0;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProcessingDuration = () => {
    if (!job) return 0;
    
    const startTime = job.startedAt || job.createdAt;
    const endTime = job.completedAt || new Date();
    
    return endTime.getTime() - startTime.getTime();
  };

  const getEstimatedCompletion = () => {
    if (!job || job.status !== 'processing' || job.progress.processingRate === 0) {
      return null;
    }
    
    const remainingDocs = job.progress.totalDocuments - job.progress.processedDocuments;
    const estimatedMinutes = remainingDocs / job.progress.processingRate!;
    const completionTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    
    return completionTime;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading job details...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!job) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Job not found</AlertDescription>
      </Alert>
    );
  }

  const progress = calculateProgress();
  const estimatedCompletion = getEstimatedCompletion();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(job.status)}
            <div>
              <CardTitle className="text-lg">{job.name}</CardTitle>
              <CardDescription>{job.description}</CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(job.status)}>
            {job.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {job.progress.processedDocuments} / {job.progress.totalDocuments} documents
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.toFixed(1)}% complete</span>
            {job.status === 'processing' && job.progress.processingRate && (
              <span>{job.progress.processingRate.toFixed(1)} docs/min</span>
            )}
          </div>
        </div>

        {/* Current Status */}
        {job.status === 'processing' && job.progress.currentDocument && (
          <Alert>
            <Play className="h-4 w-4" />
            <AlertDescription>
              Currently processing: <strong>{job.progress.currentDocument}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {job.progress.totalDocuments}
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {job.progress.successfulDocuments}
            </div>
            <div className="text-sm text-gray-500">Successful</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {job.progress.failedDocuments}
            </div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {job.progress.processedDocuments}
            </div>
            <div className="text-sm text-gray-500">Processed</div>
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 font-medium">{job.createdAt.toLocaleString()}</span>
          </div>
          {job.startedAt && (
            <div>
              <span className="text-gray-500">Started:</span>
              <span className="ml-2 font-medium">{job.startedAt.toLocaleString()}</span>
            </div>
          )}
          {job.completedAt && (
            <div>
              <span className="text-gray-500">Completed:</span>
              <span className="ml-2 font-medium">{job.completedAt.toLocaleString()}</span>
            </div>
          )}
          {job.status === 'processing' && (
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 font-medium">{formatDuration(getProcessingDuration())}</span>
            </div>
          )}
          {estimatedCompletion && (
            <div>
              <span className="text-gray-500">Est. Completion:</span>
              <span className="ml-2 font-medium">{estimatedCompletion.toLocaleTimeString()}</span>
            </div>
          )}
          {job.progress.estimatedTimeRemaining && (
            <div>
              <span className="text-gray-500">Time Remaining:</span>
              <span className="ml-2 font-medium">
                {formatDuration(job.progress.estimatedTimeRemaining * 1000)}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {job.errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{job.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <div className="flex space-x-2">
            {job.status === 'processing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobAction('pause')}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            {job.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobAction('resume')}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            
            {(job.status === 'processing' || job.status === 'paused' || job.status === 'queued') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobAction('cancel')}
              >
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            
            {job.status === 'completed' && (
              <>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View Results
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadJob}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};