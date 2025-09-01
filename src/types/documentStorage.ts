// Document Storage and Management Types

export interface DocumentStorage {
  id: string;
  documentId: string;
  patientId?: string;
  appointmentId?: string;
  
  // File storage information
  storageBucket: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  
  // Document metadata
  documentType: DocumentType;
  documentCategory?: string;
  encryptionKeyId?: string;
  
  // Access control
  accessLevel: AccessLevel;
  retentionPolicy?: string;
  retentionUntil?: Date;
  
  // Status and metadata
  storageStatus: StorageStatus;
  isEncrypted: boolean;
  isSigned: boolean;
  
  // Audit fields
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentAccessLog {
  id: string;
  documentStorageId: string;
  
  // Access details
  accessedBy: string;
  accessType: AccessType;
  accessMethod: AccessMethod;
  
  // Request context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  
  // Access result
  accessGranted: boolean;
  denialReason?: string;
  
  // Audit metadata
  accessedAt: Date;
  durationMs?: number;
  
  // Additional context
  metadata: Record<string, any>;
}

export interface DocumentShare {
  id: string;
  documentStorageId: string;
  
  // Sharing details
  sharedBy: string;
  sharedWith?: string;
  shareType: ShareType;
  
  // External sharing
  externalEmail?: string;
  externalName?: string;
  
  // Share permissions
  permissions: SharePermissions;
  
  // Share lifecycle
  expiresAt?: Date;
  isActive: boolean;
  accessCount: number;
  maxAccessCount?: number;
  
  // Security
  shareToken?: string;
  passwordProtected: boolean;
  passwordHash?: string;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

export interface DocumentVersion {
  id: string;
  documentStorageId: string;
  
  // Version information
  versionNumber: number;
  versionLabel?: string;
  
  // File information for this version
  storagePath: string;
  fileSize: number;
  fileHash: string;
  
  // Version metadata
  changeSummary?: string;
  changeDetails: Record<string, any>;
  
  // Status
  isCurrent: boolean;
  
  // Audit fields
  createdBy: string;
  createdAt: Date;
}

// Enums and Types
export type DocumentType = 
  | 'consent'
  | 'intake'
  | 'referral'
  | 'report'
  | 'prescription'
  | 'lab_result'
  | 'imaging'
  | 'insurance'
  | 'billing'
  | 'correspondence'
  | 'other';

export type AccessLevel = 'public' | 'restricted' | 'confidential';

export type StorageStatus = 'active' | 'archived' | 'deleted';

export type AccessType = 'view' | 'download' | 'print' | 'share' | 'delete' | 'modify';

export type AccessMethod = 'web' | 'mobile' | 'api' | 'system';

export type ShareType = 'internal' | 'external' | 'public';

export interface SharePermissions {
  view: boolean;
  download: boolean;
  print: boolean;
}

// Request/Response Types
export interface CreateDocumentStorageRequest {
  documentId: string;
  patientId?: string;
  appointmentId?: string;
  file: File;
  documentType: DocumentType;
  documentCategory?: string;
  accessLevel?: AccessLevel;
  retentionPolicy?: string;
  retentionUntil?: Date;
  isEncrypted?: boolean;
}

export interface DocumentStorageFilters {
  patientId?: string;
  appointmentId?: string;
  documentType?: DocumentType;
  accessLevel?: AccessLevel;
  storageStatus?: StorageStatus;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DocumentAccessFilters {
  documentStorageId?: string;
  accessedBy?: string;
  accessType?: AccessType;
  accessMethod?: AccessMethod;
  dateFrom?: Date;
  dateTo?: Date;
  accessGranted?: boolean;
}

export interface CreateShareRequest {
  documentStorageId: string;
  sharedWith?: string;
  shareType: ShareType;
  externalEmail?: string;
  externalName?: string;
  permissions: SharePermissions;
  expiresAt?: Date;
  maxAccessCount?: number;
  passwordProtected?: boolean;
  password?: string;
}

export interface DocumentViewerProps {
  documentId: string;
  documentStorage: DocumentStorage;
  onAccessLogged?: (accessLog: DocumentAccessLog) => void;
  onError?: (error: Error) => void;
}

export interface DocumentPreviewData {
  url: string;
  mimeType: string;
  filename: string;
  fileSize: number;
  isEncrypted: boolean;
  requiresPassword?: boolean;
}

// Utility Types
export interface DocumentUploadProgress {
  documentId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface DocumentDownloadOptions {
  includeWatermark?: boolean;
  format?: 'original' | 'pdf' | 'image';
  quality?: 'low' | 'medium' | 'high';
}

export interface DocumentSearchResult {
  documentStorage: DocumentStorage;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface DocumentAuditReport {
  documentStorageId: string;
  documentName: string;
  totalAccesses: number;
  uniqueUsers: number;
  accessTypes: Record<AccessType, number>;
  accessMethods: Record<AccessMethod, number>;
  lastAccessed?: Date;
  accessLogs: DocumentAccessLog[];
}

// Error Types
export class DocumentStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DocumentStorageError';
  }
}

export class DocumentAccessError extends Error {
  constructor(
    message: string,
    public code: string,
    public requiredPermission?: string
  ) {
    super(message);
    this.name = 'DocumentAccessError';
  }
}

export class DocumentEncryptionError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DocumentEncryptionError';
  }
}