
export interface Patient {
  name: string;
  avatarUrl?: string;
  initials: string;
}

export interface Appointment {
  id: string;
  time: string;
  patient: Patient;
  status: "Confirmed" | "Pending" | "Cancelled";
}

export interface PreAuthorization {
  id: string;
  patient: Patient;
  service: string;
  status: "Approved" | "Pending" | "Denied";
  submitted: string;
}

export interface IntakeTask {
  id: string;
  patient: Patient;
  task: string;
  status: "Pending OCR" | "Needs Validation" | "Complete";
}

// Document Template System Types
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MergeField {
  id: string;
  name: string;
  displayName: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'address';
  dataSource: 'patient' | 'appointment' | 'provider' | 'clinic' | 'custom';
  description?: string;
  validationRules: Record<string, any>;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: TemplateCategory;
  content: RichTextContent;
  mergeFields: string[]; // Array of merge field IDs
  settings: TemplateSettings;
  tags: string[];
  version: number;
  isActive: boolean;
  requiresApproval: boolean;
  approvalWorkflow: ApprovalWorkflow;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RichTextContent {
  type: 'doc';
  content: RichTextNode[];
}

export interface RichTextNode {
  type: string;
  attrs?: Record<string, any>;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
}

export interface RichTextMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface TemplateSettings {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  headerFooter?: {
    includeHeader: boolean;
    includeFooter: boolean;
    headerContent?: string;
    footerContent?: string;
  };
}

export interface ApprovalWorkflow {
  enabled: boolean;
  approvers: string[]; // Array of user IDs
  requireAllApprovals: boolean;
  autoActivateOnApproval: boolean;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  content: RichTextContent;
  mergeFields: string[];
  settings: TemplateSettings;
  changeSummary?: string;
  changeDetails: Record<string, any>;
  createdBy: string;
  createdAt: Date;
}

export interface TemplateApproval {
  id: string;
  templateId: string;
  versionId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  comments?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedDocument {
  id: string;
  templateId?: string;
  templateVersion?: number;
  documentName: string;
  documentType: string;
  mergeData: Record<string, any>;
  filePath?: string;
  fileSize?: number;
  generationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  generatedBy: string;
  generatedForPatientId?: string;
  generatedForAppointmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentRequest {
  templateId: string;
  documentName: string;
  mergeData: Record<string, any>;
  patientId?: string;
  appointmentId?: string;
}

export interface TemplateFilters {
  categoryId?: string;
  tags?: string[];
  isActive?: boolean;
  createdBy?: string;
  search?: string;
}

// Re-export batch processing types
export type {
  BatchDocumentJob,
  DocumentRequest as BatchDocumentRequest,
  BatchJobProgress,
  BatchJobSettings,
  BatchJobResult,
  FailedDocumentRequest,
  QueuedJob,
  BatchJobFilters,
  JobPriority,
  BatchJobStatus,
  JobQueueStats,
  BatchProcessingConfig
} from './batchProcessing';

// Re-export document storage types
export type {
  DocumentStorage,
  DocumentAccessLog,
  DocumentShare,
  DocumentVersion,
  DocumentType,
  AccessLevel,
  StorageStatus,
  AccessType,
  AccessMethod,
  ShareType,
  SharePermissions,
  CreateDocumentStorageRequest,
  DocumentStorageFilters,
  DocumentAccessFilters,
  CreateShareRequest,
  DocumentViewerProps,
  DocumentPreviewData,
  DocumentUploadProgress,
  DocumentDownloadOptions,
  DocumentSearchResult,
  DocumentAuditReport,
  DocumentStorageError,
  DocumentAccessError,
  DocumentEncryptionError
} from './documentStorage';
