import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentStorage,
  DocumentAccessLog,
  DocumentShare,
  DocumentVersion,
  CreateDocumentStorageRequest,
  DocumentStorageFilters,
  DocumentAccessFilters,
  CreateShareRequest,
  DocumentPreviewData,
  DocumentDownloadOptions,
  DocumentAuditReport,
  DocumentStorageError,
  DocumentAccessError,
  AccessType,
  AccessMethod,
  SharePermissions
} from '@/types/documentStorage';

export class DocumentStorageService {
  private readonly STORAGE_BUCKET = 'documents';
  private readonly PREVIEW_BUCKET = 'document-previews';

  // Document Storage Management
  async storeDocument(request: CreateDocumentStorageRequest): Promise<string> {
    try {
      // Generate unique file path
      const fileExtension = this.getFileExtension(request.file.name);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${request.documentType}/${timestamp}-${crypto.randomUUID()}${fileExtension}`;

      // Calculate file hash for integrity
      const fileHash = await this.calculateFileHash(request.file);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, request.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new DocumentStorageError(
          `Failed to upload file: ${uploadError.message}`,
          'UPLOAD_FAILED',
          uploadError
        );
      }

      // Create document storage record
      const { data, error } = await supabase
        .from('document_storage')
        .insert({
          document_id: request.documentId,
          patient_id: request.patientId,
          appointment_id: request.appointmentId,
          storage_bucket: this.STORAGE_BUCKET,
          storage_path: storagePath,
          original_filename: request.file.name,
          file_size: request.file.size,
          mime_type: request.file.type,
          file_hash: fileHash,
          document_type: request.documentType,
          document_category: request.documentCategory,
          access_level: request.accessLevel || 'restricted',
          retention_policy: request.retentionPolicy,
          retention_until: request.retentionUntil?.toISOString(),
          is_encrypted: request.isEncrypted || false,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (error) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from(this.STORAGE_BUCKET).remove([storagePath]);
        throw new DocumentStorageError(
          `Failed to create storage record: ${error.message}`,
          'STORAGE_RECORD_FAILED',
          error
        );
      }

      // Log the storage action
      await this.logDocumentAccess(
        data.id,
        'view',
        'system',
        undefined,
        undefined,
        undefined,
        undefined,
        true,
        undefined,
        undefined,
        { action: 'document_stored', original_filename: request.file.name }
      );

      return data.id;
    } catch (error) {
      if (error instanceof DocumentStorageError) {
        throw error;
      }
      throw new DocumentStorageError(
        `Unexpected error storing document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNEXPECTED_ERROR',
        error
      );
    }
  }

  async getDocumentStorage(id: string): Promise<DocumentStorage | null> {
    const { data, error } = await supabase
      .from('document_storage')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new DocumentStorageError(
        `Failed to fetch document storage: ${error.message}`,
        'FETCH_FAILED',
        error
      );
    }

    return this.mapDocumentStorage(data);
  }

  async getDocumentStorageList(filters?: DocumentStorageFilters): Promise<DocumentStorage[]> {
    let query = supabase
      .from('document_storage')
      .select('*');

    // Apply filters
    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }
    if (filters?.appointmentId) {
      query = query.eq('appointment_id', filters.appointmentId);
    }
    if (filters?.documentType) {
      query = query.eq('document_type', filters.documentType);
    }
    if (filters?.accessLevel) {
      query = query.eq('access_level', filters.accessLevel);
    }
    if (filters?.storageStatus) {
      query = query.eq('storage_status', filters.storageStatus);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }
    if (filters?.search) {
      query = query.or(`original_filename.ilike.%${filters.search}%,document_category.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new DocumentStorageError(
        `Failed to fetch document storage list: ${error.message}`,
        'FETCH_LIST_FAILED',
        error
      );
    }

    return data.map(this.mapDocumentStorage);
  }

  async updateDocumentStorage(
    id: string,
    updates: Partial<Pick<DocumentStorage, 'documentCategory' | 'accessLevel' | 'retentionPolicy' | 'retentionUntil' | 'storageStatus'>>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.documentCategory !== undefined) updateData.document_category = updates.documentCategory;
    if (updates.accessLevel !== undefined) updateData.access_level = updates.accessLevel;
    if (updates.retentionPolicy !== undefined) updateData.retention_policy = updates.retentionPolicy;
    if (updates.retentionUntil !== undefined) updateData.retention_until = updates.retentionUntil?.toISOString();
    if (updates.storageStatus !== undefined) updateData.storage_status = updates.storageStatus;

    const { error } = await supabase
      .from('document_storage')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new DocumentStorageError(
        `Failed to update document storage: ${error.message}`,
        'UPDATE_FAILED',
        error
      );
    }

    // Log the update action
    await this.logDocumentAccess(
      id,
      'modify',
      'web',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      { action: 'document_updated', updates }
    );
  }

  async deleteDocument(id: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
      // Get document info for cleanup
      const document = await this.getDocumentStorage(id);
      if (!document) {
        throw new DocumentStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([document.storagePath]);

      if (storageError) {
        throw new DocumentStorageError(
          `Failed to delete file from storage: ${storageError.message}`,
          'STORAGE_DELETE_FAILED',
          storageError
        );
      }

      // Delete database record
      const { error } = await supabase
        .from('document_storage')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DocumentStorageError(
          `Failed to delete document record: ${error.message}`,
          'DELETE_FAILED',
          error
        );
      }
    } else {
      // Soft delete - mark as deleted
      await this.updateDocumentStorage(id, { storageStatus: 'deleted' });
    }

    // Log the deletion
    await this.logDocumentAccess(
      id,
      'delete',
      'web',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      { action: permanent ? 'document_permanently_deleted' : 'document_soft_deleted' }
    );
  }

  // Document Access and Viewing
  async getDocumentPreview(id: string): Promise<DocumentPreviewData> {
    // Check access permissions
    const hasAccess = await this.checkDocumentAccess(id, 'view');
    if (!hasAccess) {
      throw new DocumentAccessError(
        'Access denied to document',
        'ACCESS_DENIED',
        'view'
      );
    }

    const document = await this.getDocumentStorage(id);
    if (!document) {
      throw new DocumentStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // Get signed URL for file access
    const { data: urlData, error: urlError } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .createSignedUrl(document.storagePath, 3600); // 1 hour expiry

    if (urlError) {
      throw new DocumentStorageError(
        `Failed to generate preview URL: ${urlError.message}`,
        'PREVIEW_URL_FAILED',
        urlError
      );
    }

    // Log the access
    await this.logDocumentAccess(id, 'view', 'web');

    return {
      url: urlData.signedUrl,
      mimeType: document.mimeType,
      filename: document.originalFilename,
      fileSize: document.fileSize,
      isEncrypted: document.isEncrypted,
      requiresPassword: document.isEncrypted
    };
  }

  async downloadDocument(id: string, options?: DocumentDownloadOptions): Promise<string> {
    // Check access permissions
    const hasAccess = await this.checkDocumentAccess(id, 'download');
    if (!hasAccess) {
      throw new DocumentAccessError(
        'Download access denied',
        'DOWNLOAD_ACCESS_DENIED',
        'download'
      );
    }

    const document = await this.getDocumentStorage(id);
    if (!document) {
      throw new DocumentStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // Get signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .createSignedUrl(document.storagePath, 300, {
        download: true
      });

    if (urlError) {
      throw new DocumentStorageError(
        `Failed to generate download URL: ${urlError.message}`,
        'DOWNLOAD_URL_FAILED',
        urlError
      );
    }

    // Log the download
    await this.logDocumentAccess(
      id,
      'download',
      'web',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      { download_options: options }
    );

    return urlData.signedUrl;
  }

  // Document Sharing
  async createDocumentShare(request: CreateShareRequest): Promise<string> {
    // Check if user owns the document
    const document = await this.getDocumentStorage(request.documentStorageId);
    if (!document) {
      throw new DocumentStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const { data, error } = await supabase.rpc('create_document_share', {
      p_document_storage_id: request.documentStorageId,
      p_shared_with: request.sharedWith,
      p_share_type: request.shareType,
      p_external_email: request.externalEmail,
      p_external_name: request.externalName,
      p_permissions: request.permissions,
      p_expires_at: request.expiresAt?.toISOString(),
      p_max_access_count: request.maxAccessCount,
      p_password_protected: request.passwordProtected || false
    });

    if (error) {
      throw new DocumentStorageError(
        `Failed to create document share: ${error.message}`,
        'SHARE_CREATE_FAILED',
        error
      );
    }

    // Log the sharing action
    await this.logDocumentAccess(
      request.documentStorageId,
      'share',
      'web',
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      { 
        action: 'document_shared',
        share_type: request.shareType,
        shared_with: request.sharedWith || request.externalEmail
      }
    );

    return data;
  }

  async getDocumentShares(documentStorageId: string): Promise<DocumentShare[]> {
    const { data, error } = await supabase
      .from('document_shares')
      .select('*')
      .eq('document_storage_id', documentStorageId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DocumentStorageError(
        `Failed to fetch document shares: ${error.message}`,
        'FETCH_SHARES_FAILED',
        error
      );
    }

    return data.map(this.mapDocumentShare);
  }

  async updateDocumentShare(
    shareId: string,
    updates: Partial<Pick<DocumentShare, 'permissions' | 'expiresAt' | 'isActive' | 'maxAccessCount'>>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt?.toISOString();
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.maxAccessCount !== undefined) updateData.max_access_count = updates.maxAccessCount;

    const { error } = await supabase
      .from('document_shares')
      .update(updateData)
      .eq('id', shareId);

    if (error) {
      throw new DocumentStorageError(
        `Failed to update document share: ${error.message}`,
        'SHARE_UPDATE_FAILED',
        error
      );
    }
  }

  // Document Access Logging
  async logDocumentAccess(
    documentStorageId: string,
    accessType: AccessType,
    accessMethod: AccessMethod = 'web',
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
    requestId?: string,
    accessGranted: boolean = true,
    denialReason?: string,
    durationMs?: number,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await supabase.rpc('log_document_access', {
      p_document_storage_id: documentStorageId,
      p_access_type: accessType,
      p_access_method: accessMethod,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_session_id: sessionId,
      p_request_id: requestId,
      p_access_granted: accessGranted,
      p_denial_reason: denialReason,
      p_duration_ms: durationMs,
      p_metadata: metadata
    });

    if (error) {
      // Don't throw error for logging failures to avoid breaking main functionality
      console.error('Failed to log document access:', error);
      return '';
    }

    return data;
  }

  async getDocumentAccessLogs(filters?: DocumentAccessFilters): Promise<DocumentAccessLog[]> {
    let query = supabase
      .from('document_access_log')
      .select('*');

    // Apply filters
    if (filters?.documentStorageId) {
      query = query.eq('document_storage_id', filters.documentStorageId);
    }
    if (filters?.accessedBy) {
      query = query.eq('accessed_by', filters.accessedBy);
    }
    if (filters?.accessType) {
      query = query.eq('access_type', filters.accessType);
    }
    if (filters?.accessMethod) {
      query = query.eq('access_method', filters.accessMethod);
    }
    if (filters?.dateFrom) {
      query = query.gte('accessed_at', filters.dateFrom.toISOString());
    }
    if (filters?.dateTo) {
      query = query.lte('accessed_at', filters.dateTo.toISOString());
    }
    if (filters?.accessGranted !== undefined) {
      query = query.eq('access_granted', filters.accessGranted);
    }

    const { data, error } = await query.order('accessed_at', { ascending: false });

    if (error) {
      throw new DocumentStorageError(
        `Failed to fetch access logs: ${error.message}`,
        'FETCH_LOGS_FAILED',
        error
      );
    }

    return data.map(this.mapDocumentAccessLog);
  }

  async generateDocumentAuditReport(documentStorageId: string): Promise<DocumentAuditReport> {
    const document = await this.getDocumentStorage(documentStorageId);
    if (!document) {
      throw new DocumentStorageError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const accessLogs = await this.getDocumentAccessLogs({ documentStorageId });

    // Calculate statistics
    const totalAccesses = accessLogs.length;
    const uniqueUsers = new Set(accessLogs.map(log => log.accessedBy)).size;
    
    const accessTypes = accessLogs.reduce((acc, log) => {
      acc[log.accessType] = (acc[log.accessType] || 0) + 1;
      return acc;
    }, {} as Record<AccessType, number>);

    const accessMethods = accessLogs.reduce((acc, log) => {
      acc[log.accessMethod] = (acc[log.accessMethod] || 0) + 1;
      return acc;
    }, {} as Record<AccessMethod, number>);

    const lastAccessed = accessLogs.length > 0 ? accessLogs[0].accessedAt : undefined;

    return {
      documentStorageId,
      documentName: document.originalFilename,
      totalAccesses,
      uniqueUsers,
      accessTypes,
      accessMethods,
      lastAccessed,
      accessLogs
    };
  }

  // Access Control
  async checkDocumentAccess(documentStorageId: string, accessType: AccessType = 'view'): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_document_access', {
      p_document_storage_id: documentStorageId,
      p_access_type: accessType
    });

    if (error) {
      console.error('Error checking document access:', error);
      return false;
    }

    return data;
  }

  // Utility Methods
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  }

  private async calculateFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Data Mapping Methods
  private mapDocumentStorage(data: any): DocumentStorage {
    return {
      id: data.id,
      documentId: data.document_id,
      patientId: data.patient_id,
      appointmentId: data.appointment_id,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      originalFilename: data.original_filename,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      fileHash: data.file_hash,
      documentType: data.document_type,
      documentCategory: data.document_category,
      encryptionKeyId: data.encryption_key_id,
      accessLevel: data.access_level,
      retentionPolicy: data.retention_policy,
      retentionUntil: data.retention_until ? new Date(data.retention_until) : undefined,
      storageStatus: data.storage_status,
      isEncrypted: data.is_encrypted,
      isSigned: data.is_signed,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDocumentAccessLog(data: any): DocumentAccessLog {
    return {
      id: data.id,
      documentStorageId: data.document_storage_id,
      accessedBy: data.accessed_by,
      accessType: data.access_type,
      accessMethod: data.access_method,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      sessionId: data.session_id,
      requestId: data.request_id,
      accessGranted: data.access_granted,
      denialReason: data.denial_reason,
      accessedAt: new Date(data.accessed_at),
      durationMs: data.duration_ms,
      metadata: data.metadata || {}
    };
  }

  private mapDocumentShare(data: any): DocumentShare {
    return {
      id: data.id,
      documentStorageId: data.document_storage_id,
      sharedBy: data.shared_by,
      sharedWith: data.shared_with,
      shareType: data.share_type,
      externalEmail: data.external_email,
      externalName: data.external_name,
      permissions: data.permissions,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      isActive: data.is_active,
      accessCount: data.access_count,
      maxAccessCount: data.max_access_count,
      shareToken: data.share_token,
      passwordProtected: data.password_protected,
      passwordHash: data.password_hash,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastAccessedAt: data.last_accessed_at ? new Date(data.last_accessed_at) : undefined
    };
  }
}

// Export singleton instance
export const documentStorageService = new DocumentStorageService();