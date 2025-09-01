import { supabase } from '@/integrations/supabase/client';
import { ocrService } from './ocrService';
import type { OCRProcessingInput, OCRResult } from '@/types/aiml';

/**
 * Document Upload Service for handling file uploads and processing pipeline
 */
export class DocumentUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'application/pdf'
  ];

  /**
   * Upload and process document with OCR
   */
  async uploadAndProcessDocument(
    file: File,
    documentType: string,
    patientId?: string,
    appointmentId?: string,
    taskId?: string
  ): Promise<DocumentUploadResult> {
    try {
      // Validate file
      this.validateFile(file);

      // Create document record
      const documentId = await this.createDocumentRecord(
        file,
        documentType,
        patientId,
        appointmentId,
        taskId
      );

      // Upload file to storage
      const filePath = await this.uploadFileToStorage(file, documentId);

      // Update document record with file path
      await this.updateDocumentFilePath(documentId, filePath);

      // Process with OCR
      const ocrResult = await this.processDocumentWithOCR(
        file,
        documentId,
        documentType
      );

      // Update document status
      await this.updateDocumentStatus(documentId, 'processed', ocrResult);

      // Update related intake task if provided
      if (taskId) {
        await this.updateIntakeTaskStatus(taskId, ocrResult);
      }

      return {
        documentId,
        filePath,
        ocrResult,
        success: true
      };
    } catch (error) {
      console.error('Document upload and processing failed:', error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    // Check file name
    if (!file.name || file.name.length > 255) {
      throw new Error('Invalid file name');
    }

    // Additional validation for images
    if (file.type.startsWith('image/')) {
      this.validateImageFile(file);
    }
  }

  /**
   * Validate image file specifics
   */
  private validateImageFile(file: File): void {
    // Create a temporary image to validate dimensions
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Check minimum dimensions
        if (img.width < 100 || img.height < 100) {
          reject(new Error('Image dimensions too small. Minimum 100x100 pixels required.'));
          return;
        }

        // Check maximum dimensions
        if (img.width > 4000 || img.height > 4000) {
          reject(new Error('Image dimensions too large. Maximum 4000x4000 pixels allowed.'));
          return;
        }

        resolve();
      };

      img.onerror = () => {
        reject(new Error('Invalid image file'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create document record in database
   */
  private async createDocumentRecord(
    file: File,
    documentType: string,
    patientId?: string,
    appointmentId?: string,
    taskId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          document_type: documentType,
          patient_id: patientId,
          appointment_id: appointmentId,
          intake_task_id: taskId,
          upload_status: 'uploading',
          processing_status: 'pending',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating document record:', error);
      throw new Error('Failed to create document record');
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadFileToStorage(file: File, documentId: string): Promise<string> {
    try {
      // Generate unique file path
      const fileExtension = file.name.split('.').pop();
      const fileName = `${documentId}.${fileExtension}`;
      const filePath = `documents/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      return data.path;
    } catch (error) {
      console.error('Error uploading file to storage:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Update document record with file path
   */
  private async updateDocumentFilePath(documentId: string, filePath: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          file_path: filePath,
          upload_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating document file path:', error);
      throw new Error('Failed to update document record');
    }
  }

  /**
   * Process document with OCR
   */
  private async processDocumentWithOCR(
    file: File,
    documentId: string,
    documentType: string
  ): Promise<OCRResult> {
    try {
      // Update processing status
      await this.updateDocumentProcessingStatus(documentId, 'processing');

      // Prepare OCR input
      const ocrInput: OCRProcessingInput = {
        documentId,
        documentType,
        imageData: file,
        processingOptions: {
          language: 'en',
          detectOrientation: true,
          extractTables: documentType === 'lab_results' || documentType === 'insurance_card',
          extractSignatures: documentType === 'consent_form' || documentType === 'referral_letter',
          confidenceThreshold: 0.7
        }
      };

      // Process with OCR service
      const ocrResult = await ocrService.processDocument(ocrInput);

      return ocrResult;
    } catch (error) {
      // Update processing status to failed
      await this.updateDocumentProcessingStatus(documentId, 'failed');
      throw error;
    }
  }

  /**
   * Update document processing status
   */
  private async updateDocumentProcessingStatus(
    documentId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          processing_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating document processing status:', error);
    }
  }

  /**
   * Update document status with OCR results
   */
  private async updateDocumentStatus(
    documentId: string,
    status: 'processed' | 'failed',
    ocrResult?: OCRResult
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status,
        updated_at: new Date().toISOString()
      };

      if (ocrResult) {
        updateData.ocr_confidence = ocrResult.confidence;
        updateData.extracted_text = ocrResult.extractedText;
        updateData.extracted_fields = ocrResult.extractedFields;
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  }

  /**
   * Update related intake task status based on OCR results
   */
  private async updateIntakeTaskStatus(taskId: string, ocrResult: OCRResult): Promise<void> {
    try {
      // Determine new status based on OCR confidence
      let newStatus: 'Needs Validation' | 'Complete' = 'Needs Validation';
      
      // If confidence is high and all critical fields are present, mark as complete
      if (ocrResult.confidence >= 0.9) {
        const criticalFields = ocrResult.extractedFields.filter(field =>
          ['patient_name', 'date_of_birth'].includes(field.fieldName)
        );
        
        const highConfidenceCriticalFields = criticalFields.filter(field =>
          field.confidence >= 0.9
        );

        if (criticalFields.length > 0 && highConfidenceCriticalFields.length === criticalFields.length) {
          newStatus = 'Complete';
        }
      }

      const { error } = await supabase
        .from('intake_tasks')
        .update({
          status: newStatus,
          ocr_confidence: ocrResult.confidence,
          extracted_data: ocrResult.extractedFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating intake task status:', error);
    }
  }

  /**
   * Get document upload progress
   */
  async getUploadProgress(documentId: string): Promise<DocumentUploadProgress> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('upload_status, processing_status, ocr_confidence, created_at, updated_at')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      return {
        documentId,
        uploadStatus: data.upload_status,
        processingStatus: data.processing_status,
        ocrConfidence: data.ocr_confidence,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting upload progress:', error);
      throw new Error('Failed to get upload progress');
    }
  }

  /**
   * Batch upload multiple documents
   */
  async batchUploadDocuments(
    files: File[],
    documentType: string,
    patientId?: string,
    appointmentId?: string
  ): Promise<BatchUploadResult> {
    const results: DocumentUploadResult[] = [];
    const errors: BatchUploadError[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadAndProcessDocument(
          files[i],
          documentType,
          patientId,
          appointmentId
        );
        results.push(result);
      } catch (error) {
        errors.push({
          fileIndex: i,
          fileName: files[i].name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalFiles: files.length,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  /**
   * Get supported document types
   */
  getSupportedDocumentTypes(): DocumentTypeInfo[] {
    return [
      {
        type: 'new_patient_packet',
        name: 'New Patient Packet',
        description: 'Complete intake forms for new patients',
        expectedFields: ['patient_name', 'date_of_birth', 'phone', 'email', 'address']
      },
      {
        type: 'insurance_card',
        name: 'Insurance Card',
        description: 'Front and back of insurance cards',
        expectedFields: ['insurance_provider', 'member_id', 'group_number', 'patient_name']
      },
      {
        type: 'referral_letter',
        name: 'Referral Letter',
        description: 'Medical referrals from other providers',
        expectedFields: ['referring_provider', 'patient_name', 'referral_reason', 'date']
      },
      {
        type: 'medical_history_form',
        name: 'Medical History Form',
        description: 'Patient medical history and current medications',
        expectedFields: ['patient_name', 'medical_conditions', 'medications', 'allergies']
      },
      {
        type: 'consent_form',
        name: 'Consent Forms',
        description: 'Treatment consent and authorization forms',
        expectedFields: ['patient_name', 'procedure', 'signature', 'date']
      },
      {
        type: 'lab_results',
        name: 'Lab Results',
        description: 'Laboratory test results and reports',
        expectedFields: ['patient_name', 'test_date', 'test_results', 'provider']
      },
      {
        type: 'prescription_form',
        name: 'Prescription Forms',
        description: 'Prescription requests and medication lists',
        expectedFields: ['patient_name', 'medications', 'prescriber', 'date']
      },
      {
        type: 'id_verification',
        name: 'ID Verification',
        description: 'Driver\'s license or other identification',
        expectedFields: ['full_name', 'date_of_birth', 'id_number', 'address']
      }
    ];
  }
}

// Types for document upload service
export interface DocumentUploadResult {
  documentId: string;
  filePath: string;
  ocrResult: OCRResult;
  success: boolean;
}

export interface DocumentUploadProgress {
  documentId: string;
  uploadStatus: 'uploading' | 'completed' | 'failed';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchUploadResult {
  successful: DocumentUploadResult[];
  failed: BatchUploadError[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
}

export interface BatchUploadError {
  fileIndex: number;
  fileName: string;
  error: string;
}

export interface DocumentTypeInfo {
  type: string;
  name: string;
  description: string;
  expectedFields: string[];
}

// Export singleton instance
export const documentUploadService = new DocumentUploadService();