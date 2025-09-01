import { supabase } from '@/integrations/supabase/client';
import { documentService } from './documentService';
import type {
  BatchDocumentJob,
  DocumentRequest,
  BatchJobProgress,
  BatchJobSettings,
  BatchJobResult,
  FailedDocumentRequest,
  QueuedJob,
  BatchJobFilters,
  JobPriority,
  BatchJobStatus,
  JobQueueStats,
  BatchProcessingConfig,
  GeneratedDocument
} from '@/types/batchProcessing';

export class BatchDocumentService {
  private processingJobs = new Map<string, AbortController>();
  private config: BatchProcessingConfig = {
    maxQueueSize: 100,
    maxConcurrentJobs: 3,
    defaultJobTimeout: 30 * 60 * 1000, // 30 minutes
    retryDelayMs: 5000,
    cleanupCompletedJobsAfterDays: 30,
    enableRealTimeUpdates: true
  };

  // Job Management
  async createBatchJob(
    name: string,
    templateId: string,
    requests: Omit<DocumentRequest, 'id'>[],
    settings: Partial<BatchJobSettings> = {},
    priority: JobPriority = 'normal',
    description?: string
  ): Promise<string> {
    const defaultSettings: BatchJobSettings = {
      maxConcurrentProcessing: 5,
      retryFailedDocuments: true,
      maxRetries: 3,
      notifyOnCompletion: false,
      outputFormat: 'pdf',
      compressionEnabled: true,
      generateZipArchive: true
    };

    const jobSettings = { ...defaultSettings, ...settings };
    
    // Generate IDs for requests
    const requestsWithIds: DocumentRequest[] = requests.map(req => ({
      ...req,
      id: crypto.randomUUID()
    }));

    const progress: BatchJobProgress = {
      totalDocuments: requestsWithIds.length,
      processedDocuments: 0,
      successfulDocuments: 0,
      failedDocuments: 0,
      processingRate: 0
    };

    const { data, error } = await supabase
      .from('batch_document_jobs')
      .insert({
        name,
        description,
        template_id: templateId,
        requests: requestsWithIds,
        priority,
        status: 'queued',
        progress,
        settings: jobSettings,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select('id')
      .single();

    if (error) throw error;

    // Add to processing queue
    await this.addToQueue(data.id, priority);
    
    return data.id;
  }

  async getBatchJob(jobId: string): Promise<BatchDocumentJob | null> {
    const { data, error } = await supabase
      .from('batch_document_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapBatchDocumentJob(data);
  }

  async getBatchJobs(filters?: BatchJobFilters): Promise<BatchDocumentJob[]> {
    let query = supabase
      .from('batch_document_jobs')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters?.templateId) {
      query = query.eq('template_id', filters.templateId);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(this.mapBatchDocumentJob);
  }

  async updateJobStatus(
    jobId: string, 
    status: BatchJobStatus, 
    progress?: Partial<BatchJobProgress>,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (progress) {
      const currentJob = await this.getBatchJob(jobId);
      if (currentJob) {
        updateData.progress = { ...currentJob.progress, ...progress };
      }
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (status === 'processing' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('batch_document_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) throw error;

    // Emit real-time update
    if (this.config.enableRealTimeUpdates) {
      await this.emitJobUpdate(jobId, status, progress);
    }
  }

  // Queue Management
  async addToQueue(jobId: string, priority: JobPriority): Promise<void> {
    const { error } = await supabase
      .from('batch_job_queue')
      .insert({
        job_id: jobId,
        priority,
        queued_at: new Date().toISOString()
      });

    if (error) throw error;

    // Start processing if capacity available
    await this.processQueue();
  }

  async removeFromQueue(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('batch_job_queue')
      .delete()
      .eq('job_id', jobId);

    if (error) throw error;
  }

  async getQueueStats(): Promise<JobQueueStats> {
    const { data: queueData, error: queueError } = await supabase
      .from('batch_job_queue')
      .select('*');

    if (queueError) throw queueError;

    const { data: jobsData, error: jobsError } = await supabase
      .from('batch_document_jobs')
      .select('status, created_at, completed_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (jobsError) throw jobsError;

    const totalJobs = jobsData.length;
    const queuedJobs = queueData.length;
    const processingJobs = jobsData.filter(job => job.status === 'processing').length;
    const completedJobs = jobsData.filter(job => job.status === 'completed').length;
    const failedJobs = jobsData.filter(job => job.status === 'failed').length;

    // Calculate average processing time
    const completedJobsWithTimes = jobsData.filter(job => 
      job.status === 'completed' && job.completed_at
    );
    
    const averageProcessingTime = completedJobsWithTimes.length > 0
      ? completedJobsWithTimes.reduce((sum, job) => {
          const start = new Date(job.created_at).getTime();
          const end = new Date(job.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedJobsWithTimes.length
      : 0;

    // Calculate current throughput (jobs per hour in last 24h)
    const currentThroughput = completedJobs / 24;

    return {
      totalJobs,
      queuedJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      currentThroughput
    };
  }

  // Job Processing
  async processQueue(): Promise<void> {
    const currentProcessingCount = this.processingJobs.size;
    
    if (currentProcessingCount >= this.config.maxConcurrentJobs) {
      return;
    }

    const availableSlots = this.config.maxConcurrentJobs - currentProcessingCount;
    
    // Get next jobs from queue ordered by priority and queue time
    const { data: queuedJobs, error } = await supabase
      .from('batch_job_queue')
      .select('job_id, priority')
      .order('priority', { ascending: false }) // high priority first
      .order('queued_at', { ascending: true }) // oldest first
      .limit(availableSlots);

    if (error) throw error;

    for (const queuedJob of queuedJobs) {
      await this.startJobProcessing(queuedJob.job_id);
    }
  }

  async startJobProcessing(jobId: string): Promise<void> {
    const job = await this.getBatchJob(jobId);
    if (!job || job.status !== 'queued') {
      return;
    }

    // Create abort controller for this job
    const abortController = new AbortController();
    this.processingJobs.set(jobId, abortController);

    try {
      await this.updateJobStatus(jobId, 'processing');
      await this.removeFromQueue(jobId);

      const result = await this.processJob(job, abortController.signal);
      
      await this.updateJobStatus(
        jobId, 
        'completed', 
        {
          processedDocuments: result.totalDocuments,
          successfulDocuments: result.successfulDocuments,
          failedDocuments: result.failedDocuments
        }
      );

      // Store job result
      await this.storeJobResult(jobId, result);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        await this.updateJobStatus(jobId, 'cancelled');
      } else {
        await this.updateJobStatus(
          jobId, 
          'failed', 
          undefined, 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } finally {
      this.processingJobs.delete(jobId);
      
      // Process next jobs in queue
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async processJob(job: BatchDocumentJob, signal: AbortSignal): Promise<BatchJobResult> {
    const startTime = Date.now();
    const generatedDocuments: GeneratedDocument[] = [];
    const failedRequests: FailedDocumentRequest[] = [];
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // Process documents in batches based on maxConcurrentProcessing setting
    const batchSize = job.settings.maxConcurrentProcessing;
    
    for (let i = 0; i < job.requests.length; i += batchSize) {
      if (signal.aborted) {
        throw new Error('Job was cancelled');
      }

      const batch = job.requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => 
        this.processDocumentRequest(request, job.settings)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const request = batch[j];
        
        processedCount++;
        
        if (result.status === 'fulfilled') {
          generatedDocuments.push(result.value);
          successCount++;
        } else {
          failedRequests.push({
            requestId: request.id,
            documentName: request.documentName,
            errorMessage: result.reason?.message || 'Unknown error',
            retryCount: 0,
            lastAttemptAt: new Date()
          });
          failedCount++;
        }

        // Update progress
        const progress: Partial<BatchJobProgress> = {
          processedDocuments: processedCount,
          successfulDocuments: successCount,
          failedDocuments: failedCount,
          currentDocument: request.documentName,
          processingRate: (processedCount / ((Date.now() - startTime) / 60000)) || 0
        };

        // Estimate remaining time
        if (processedCount > 0) {
          const avgTimePerDoc = (Date.now() - startTime) / processedCount;
          const remainingDocs = job.requests.length - processedCount;
          progress.estimatedTimeRemaining = Math.round(avgTimePerDoc * remainingDocs / 1000);
        }

        await this.updateJobStatus(job.id, 'processing', progress);
      }
    }

    // Handle retries for failed requests
    if (job.settings.retryFailedDocuments && failedRequests.length > 0) {
      const retriedResults = await this.retryFailedRequests(
        failedRequests, 
        job.settings, 
        signal
      );
      
      generatedDocuments.push(...retriedResults.successful);
      successCount += retriedResults.successful.length;
      failedCount = retriedResults.failed.length;
    }

    const processingTime = Date.now() - startTime;
    
    return {
      jobId: job.id,
      status: 'completed',
      totalDocuments: job.requests.length,
      successfulDocuments: successCount,
      failedDocuments: failedCount,
      generatedDocuments,
      failedRequests: failedRequests.slice(0, failedCount),
      processingTime,
      outputFiles: [] // Will be populated when files are generated
    };
  }

  private async processDocumentRequest(
    request: DocumentRequest, 
    settings: BatchJobSettings
  ): Promise<GeneratedDocument> {
    // Use existing document service to generate document
    const documentId = await documentService.generateDocument({
      templateId: request.templateId,
      documentName: request.documentName,
      mergeData: request.mergeData,
      patientId: request.patientId,
      appointmentId: request.appointmentId
    });

    // Simulate document processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Update document status to completed
    await documentService.updateDocumentStatus(documentId, 'completed');

    // Return the generated document
    const documents = await documentService.getGeneratedDocuments();
    const document = documents.find(doc => doc.id === documentId);
    
    if (!document) {
      throw new Error(`Generated document not found: ${documentId}`);
    }

    return document;
  }

  private async retryFailedRequests(
    failedRequests: FailedDocumentRequest[],
    settings: BatchJobSettings,
    signal: AbortSignal
  ): Promise<{ successful: GeneratedDocument[]; failed: FailedDocumentRequest[] }> {
    const successful: GeneratedDocument[] = [];
    const stillFailed: FailedDocumentRequest[] = [];

    for (const failedRequest of failedRequests) {
      if (signal.aborted) break;
      
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount < settings.maxRetries) {
        try {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
          
          // Attempt to process the request again
          // Note: We'd need to reconstruct the DocumentRequest from FailedDocumentRequest
          // This is a simplified version
          const result = await this.processDocumentRequest({
            id: failedRequest.requestId,
            templateId: '', // Would need to be stored in FailedDocumentRequest
            documentName: failedRequest.documentName,
            mergeData: {} // Would need to be stored in FailedDocumentRequest
          }, settings);
          
          successful.push(result);
          break;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          retryCount++;
        }
      }

      if (retryCount >= settings.maxRetries) {
        stillFailed.push({
          ...failedRequest,
          retryCount,
          errorMessage: lastError?.message || failedRequest.errorMessage,
          lastAttemptAt: new Date()
        });
      }
    }

    return { successful, failed: stillFailed };
  }

  // Job Control
  async pauseJob(jobId: string): Promise<void> {
    const abortController = this.processingJobs.get(jobId);
    if (abortController) {
      abortController.abort();
    }
    
    await this.updateJobStatus(jobId, 'paused');
  }

  async resumeJob(jobId: string): Promise<void> {
    const job = await this.getBatchJob(jobId);
    if (job && job.status === 'paused') {
      await this.updateJobStatus(jobId, 'queued');
      await this.addToQueue(jobId, job.priority);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const abortController = this.processingJobs.get(jobId);
    if (abortController) {
      abortController.abort();
    }
    
    await this.removeFromQueue(jobId);
    await this.updateJobStatus(jobId, 'cancelled');
  }

  // Utility Methods
  private async storeJobResult(jobId: string, result: BatchJobResult): Promise<void> {
    const { error } = await supabase
      .from('batch_job_results')
      .insert({
        job_id: jobId,
        result_data: result,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async emitJobUpdate(
    jobId: string, 
    status: BatchJobStatus, 
    progress?: Partial<BatchJobProgress>
  ): Promise<void> {
    // Emit real-time update via Supabase realtime
    const channel = supabase.channel(`batch-job-${jobId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'job_update',
      payload: {
        jobId,
        status,
        progress,
        timestamp: new Date().toISOString()
      }
    });
  }

  private mapBatchDocumentJob(data: any): BatchDocumentJob {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      templateId: data.template_id,
      requests: data.requests || [],
      priority: data.priority,
      status: data.status,
      progress: data.progress || {
        totalDocuments: 0,
        processedDocuments: 0,
        successfulDocuments: 0,
        failedDocuments: 0
      },
      settings: data.settings || {},
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      errorMessage: data.error_message
    };
  }
}

// Export singleton instance
export const batchDocumentService = new BatchDocumentService();