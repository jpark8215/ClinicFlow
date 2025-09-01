// Batch Document Processing Types

export interface BatchDocumentJob {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  requests: DocumentRequest[];
  priority: JobPriority;
  status: BatchJobStatus;
  progress: BatchJobProgress;
  settings: BatchJobSettings;
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface DocumentRequest {
  id: string;
  templateId: string;
  documentName: string;
  mergeData: Record<string, any>;
  patientId?: string;
  appointmentId?: string;
  priority?: number;
}

export interface BatchJobProgress {
  totalDocuments: number;
  processedDocuments: number;
  successfulDocuments: number;
  failedDocuments: number;
  currentDocument?: string;
  estimatedTimeRemaining?: number;
  processingRate?: number; // documents per minute
}

export interface BatchJobSettings {
  maxConcurrentProcessing: number;
  retryFailedDocuments: boolean;
  maxRetries: number;
  notifyOnCompletion: boolean;
  notificationEmail?: string;
  outputFormat: 'pdf' | 'docx' | 'both';
  compressionEnabled: boolean;
  generateZipArchive: boolean;
}

export interface BatchJobResult {
  jobId: string;
  status: BatchJobStatus;
  totalDocuments: number;
  successfulDocuments: number;
  failedDocuments: number;
  generatedDocuments: GeneratedDocument[];
  failedRequests: FailedDocumentRequest[];
  processingTime: number;
  outputFiles: string[];
}

export interface FailedDocumentRequest {
  requestId: string;
  documentName: string;
  errorMessage: string;
  retryCount: number;
  lastAttemptAt: Date;
}

export interface QueuedJob {
  id: string;
  jobId: string;
  priority: JobPriority;
  queuedAt: Date;
  estimatedStartTime?: Date;
}

export interface BatchJobFilters {
  status?: BatchJobStatus;
  priority?: JobPriority;
  createdBy?: string;
  templateId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export type BatchJobStatus = 
  | 'queued' 
  | 'processing' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface JobQueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  currentThroughput: number;
}

export interface BatchProcessingConfig {
  maxQueueSize: number;
  maxConcurrentJobs: number;
  defaultJobTimeout: number;
  retryDelayMs: number;
  cleanupCompletedJobsAfterDays: number;
  enableRealTimeUpdates: boolean;
}

// Re-export from main types
export type { GeneratedDocument } from './index';