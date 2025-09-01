import { supabase } from '@/integrations/supabase/client';
import { ocrService } from './ocrService';
import { dataExtractionService, type StructuredExtractionResult } from './dataExtractionService';
import { documentUploadService } from './documentUploadService';
import { intakeWorkflowOrchestrator } from './intakeWorkflowOrchestrator';
import type { OCRResult, ExtractedField } from '@/types/aiml';

/**
 * Automated Intake Service for AI-powered workflow automation
 * Handles document processing, validation, and task progression
 */
export class AutomatedIntakeService {
  
  /**
   * Process intake task with full automation pipeline using workflow orchestrator
   */
  async processIntakeTask(taskId: string): Promise<IntakeProcessingResult> {
    return await intakeWorkflowOrchestrator.processIntakeTask(taskId);
  }

  /**
   * Batch process multiple intake tasks using workflow orchestrator
   */
  async batchProcessIntakeTasks(taskIds: string[]): Promise<BatchIntakeProcessingResult> {
    return await intakeWorkflowOrchestrator.processBatchIntakeTasks(taskIds);
  }

  /**
   * Validate extracted data using AI and business rules
   */
  private async validateWithAI(
    task: IntakeTask,
    extractionResult: StructuredExtractionResult | null
  ): Promise<AIValidationResult> {
    const validationRules: ValidationRule[] = [];
    const validationErrors: ValidationError[] = [];
    const validationWarnings: ValidationWarning[] = [];
    let overallConfidence = 1.0;
    let requiresManualReview = false;

    // Get validation rules for task type
    const rules = await this.getValidationRules(task.task_description);
    validationRules.push(...rules);

    // Validate OCR confidence
    if (extractionResult) {
      overallConfidence = extractionResult.overallConfidence;
      
      if (overallConfidence < 0.8) {
        validationWarnings.push({
          type: 'low_confidence',
          message: `Overall OCR confidence is low (${Math.round(overallConfidence * 100)}%)`,
          severity: 'medium',
          field: null
        });
        requiresManualReview = true;
      }

      // Validate required fields
      const requiredFields = await this.getRequiredFields(task.task_description);
      for (const requiredField of requiredFields) {
        const extractedField = extractionResult.extractedFields.find(f => f.fieldName === requiredField);
        
        if (!extractedField || !extractedField.fieldValue.trim()) {
          validationErrors.push({
            type: 'missing_required_field',
            message: `Required field '${requiredField}' is missing or empty`,
            severity: 'high',
            field: requiredField
          });
          requiresManualReview = true;
        } else if (extractedField.confidence < 0.7) {
          validationWarnings.push({
            type: 'low_field_confidence',
            message: `Field '${requiredField}' has low confidence (${Math.round(extractedField.confidence * 100)}%)`,
            severity: 'medium',
            field: requiredField
          });
          requiresManualReview = true;
        }
      }

      // Apply business rules validation
      const businessRuleResults = await this.applyBusinessRules(extractionResult.extractedFields, task);
      validationErrors.push(...businessRuleResults.errors);
      validationWarnings.push(...businessRuleResults.warnings);
      
      if (businessRuleResults.requiresReview) {
        requiresManualReview = true;
      }
    } else {
      // No extraction result - document processing failed
      validationErrors.push({
        type: 'processing_failed',
        message: 'Document processing failed or no document provided',
        severity: 'high',
        field: null
      });
      requiresManualReview = true;
    }

    // Check for duplicate patient records
    if (extractionResult?.extractedFields) {
      const duplicateCheck = await this.checkForDuplicatePatient(extractionResult.extractedFields);
      if (duplicateCheck.hasDuplicates) {
        validationWarnings.push({
          type: 'potential_duplicate',
          message: `Potential duplicate patient found: ${duplicateCheck.matchingPatients.join(', ')}`,
          severity: 'medium',
          field: 'patient_name'
        });
        requiresManualReview = true;
      }
    }

    return {
      isValid: validationErrors.length === 0,
      confidence: overallConfidence,
      validationRules,
      errors: validationErrors,
      warnings: validationWarnings,
      requiresManualReview,
      aiRecommendations: await this.generateAIRecommendations(task, extractionResult, validationErrors, validationWarnings)
    };
  }

  /**
   * Apply business rules to extracted fields
   */
  private async applyBusinessRules(
    fields: ExtractedField[],
    task: IntakeTask
  ): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    // Rule 1: Patient name validation
    const nameField = fields.find(f => f.fieldName === 'patient_name');
    if (nameField) {
      if (nameField.fieldValue.length < 3) {
        errors.push({
          type: 'invalid_name',
          message: 'Patient name is too short',
          severity: 'high',
          field: 'patient_name'
        });
      }
      
      if (!/^[A-Za-z\s.-]+$/.test(nameField.fieldValue)) {
        warnings.push({
          type: 'name_format',
          message: 'Patient name contains unusual characters',
          severity: 'low',
          field: 'patient_name'
        });
      }
    }

    // Rule 2: Date of birth validation
    const dobField = fields.find(f => f.fieldName === 'date_of_birth');
    if (dobField) {
      const dobDate = new Date(dobField.fieldValue);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear();
      
      if (age < 0 || age > 120) {
        errors.push({
          type: 'invalid_dob',
          message: 'Date of birth results in invalid age',
          severity: 'high',
          field: 'date_of_birth'
        });
      }
      
      if (age < 18) {
        warnings.push({
          type: 'minor_patient',
          message: 'Patient appears to be a minor',
          severity: 'medium',
          field: 'date_of_birth'
        });
        requiresReview = true;
      }
    }

    // Rule 3: Insurance validation
    const insuranceField = fields.find(f => f.fieldName === 'insurance_provider');
    const memberIdField = fields.find(f => f.fieldName === 'member_id');
    
    if (insuranceField && !memberIdField) {
      warnings.push({
        type: 'missing_member_id',
        message: 'Insurance provider specified but member ID is missing',
        severity: 'medium',
        field: 'member_id'
      });
    }

    // Rule 4: Phone number validation
    const phoneField = fields.find(f => f.fieldName === 'phone');
    if (phoneField) {
      const phoneRegex = /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
      if (!phoneRegex.test(phoneField.fieldValue)) {
        errors.push({
          type: 'invalid_phone',
          message: 'Phone number format is invalid',
          severity: 'medium',
          field: 'phone'
        });
      }
    }

    // Rule 5: Email validation
    const emailField = fields.find(f => f.fieldName === 'email');
    if (emailField) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailField.fieldValue)) {
        errors.push({
          type: 'invalid_email',
          message: 'Email format is invalid',
          severity: 'medium',
          field: 'email'
        });
      }
    }

    return {
      errors,
      warnings,
      requiresReview: requiresReview || errors.length > 0
    };
  }

  /**
   * Generate AI recommendations based on validation results
   */
  private async generateAIRecommendations(
    task: IntakeTask,
    extractionResult: StructuredExtractionResult | null,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Recommendation based on confidence
    if (extractionResult && extractionResult.overallConfidence < 0.9) {
      recommendations.push({
        type: 'improve_quality',
        priority: 'medium',
        message: 'Consider rescanning the document with better lighting or resolution',
        action: 'rescan_document'
      });
    }

    // Recommendations based on errors
    if (errors.some(e => e.type === 'missing_required_field')) {
      recommendations.push({
        type: 'manual_entry',
        priority: 'high',
        message: 'Missing required fields should be entered manually',
        action: 'manual_review'
      });
    }

    // Recommendations based on warnings
    if (warnings.some(w => w.type === 'potential_duplicate')) {
      recommendations.push({
        type: 'duplicate_check',
        priority: 'high',
        message: 'Review potential duplicate patient records before proceeding',
        action: 'duplicate_resolution'
      });
    }

    // Task-specific recommendations
    if (task.task_description === 'Insurance Card' && !extractionResult?.extractedFields.find(f => f.fieldName === 'member_id')) {
      recommendations.push({
        type: 'insurance_verification',
        priority: 'high',
        message: 'Insurance member ID is required for eligibility verification',
        action: 'manual_review'
      });
    }

    return recommendations;
  }

  /**
   * Determine next task status based on validation results
   */
  private determineNextStatus(
    validationResult: AIValidationResult,
    extractionResult: StructuredExtractionResult | null
  ): IntakeTaskStatus {
    // If there are validation errors or manual review is required
    if (validationResult.requiresManualReview || validationResult.errors.length > 0) {
      return 'Needs Validation';
    }

    // If confidence is high and no issues
    if (validationResult.confidence >= 0.9 && validationResult.warnings.length === 0) {
      return 'Complete';
    }

    // Default to needs validation for safety
    return 'Needs Validation';
  }

  /**
   * Create manual review task for complex cases
   */
  private async createManualReviewTask(
    taskId: string,
    validationResult: AIValidationResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('manual_review_queue')
        .insert({
          intake_task_id: taskId,
          review_type: 'ai_validation_failed',
          priority: this.determinePriority(validationResult),
          metadata: {
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            confidence: validationResult.confidence,
            recommendations: validationResult.aiRecommendations
          },
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating manual review task:', error);
    }
  }

  /**
   * Determine priority for manual review
   */
  private determinePriority(validationResult: AIValidationResult): 'low' | 'medium' | 'high' | 'urgent' {
    const highSeverityErrors = validationResult.errors.filter(e => e.severity === 'high');
    const mediumSeverityErrors = validationResult.errors.filter(e => e.severity === 'medium');

    if (highSeverityErrors.length > 0) return 'high';
    if (mediumSeverityErrors.length > 1) return 'medium';
    if (validationResult.confidence < 0.7) return 'medium';
    
    return 'low';
  }

  /**
   * Send notifications based on processing results
   */
  private async sendNotifications(
    task: IntakeTask,
    newStatus: IntakeTaskStatus,
    validationResult: AIValidationResult
  ): Promise<void> {
    // Send notification for completed tasks
    if (newStatus === 'Complete') {
      // TODO: Implement notification service
      console.log(`Task ${task.id} completed automatically`);
    }

    // Send notification for tasks requiring manual review
    if (validationResult.requiresManualReview) {
      // TODO: Implement notification service
      console.log(`Task ${task.id} requires manual review`);
    }
  }

  /**
   * Process document from URL
   */
  private async processDocumentFromUrl(documentUrl: string, documentType: string): Promise<OCRResult> {
    // In a real implementation, this would download the document and process it
    // For now, we'll simulate the process
    
    const mockInput = {
      documentId: `doc_${Date.now()}`,
      documentType: this.mapTaskTypeToDocumentType(documentType),
      imageData: documentUrl, // In real implementation, this would be the downloaded file
      processingOptions: {
        language: 'en',
        detectOrientation: true,
        extractTables: false,
        extractSignatures: true,
        confidenceThreshold: 0.7
      }
    };

    return await ocrService.processDocument(mockInput);
  }

  /**
   * Map task description to document type
   */
  private mapTaskTypeToDocumentType(taskDescription: string): string {
    const mapping: Record<string, string> = {
      'New Patient Packet': 'new_patient_packet',
      'Insurance Card': 'insurance_card',
      'Referral Letter': 'referral_letter',
      'Medical History Form': 'medical_history_form',
      'Consent Forms': 'consent_form',
      'Lab Results': 'lab_results',
      'Prescription Forms': 'prescription_form',
      'ID Verification': 'id_verification'
    };

    return mapping[taskDescription] || 'unknown';
  }

  /**
   * Get intake task from database
   */
  private async getIntakeTask(taskId: string): Promise<IntakeTask | null> {
    try {
      const { data, error } = await supabase
        .from('intake_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching intake task:', error);
      return null;
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: IntakeTaskStatus | 'processing' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('intake_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  /**
   * Update task with processing results
   */
  private async updateTaskWithResults(
    taskId: string,
    results: TaskUpdateResults
  ): Promise<void> {
    try {
      const updateData: any = {
        status: results.status,
        ocr_confidence: results.ocrResult?.confidence,
        extracted_data: results.extractionResult?.extractedFields || [],
        requires_manual_review: results.requiresManualReview,
        ai_validation_results: results.validationResult,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('intake_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task with results:', error);
    }
  }

  /**
   * Get validation rules for task type
   */
  private async getValidationRules(taskType: string): Promise<ValidationRule[]> {
    // In a real implementation, this would fetch from database
    const rules: ValidationRule[] = [
      {
        id: 'confidence_threshold',
        name: 'OCR Confidence Threshold',
        description: 'Overall OCR confidence must be above 80%',
        threshold: 0.8,
        severity: 'medium'
      },
      {
        id: 'required_fields',
        name: 'Required Fields Present',
        description: 'All required fields must be extracted',
        threshold: 1.0,
        severity: 'high'
      }
    ];

    return rules;
  }

  /**
   * Get required fields for task type
   */
  private async getRequiredFields(taskType: string): Promise<string[]> {
    const requiredFieldsMap: Record<string, string[]> = {
      'New Patient Packet': ['patient_name', 'date_of_birth', 'phone'],
      'Insurance Card': ['patient_name', 'insurance_provider', 'member_id'],
      'Referral Letter': ['patient_name', 'referring_provider', 'referral_reason'],
      'Medical History Form': ['patient_name', 'date_of_birth'],
      'Consent Forms': ['patient_name', 'signature', 'date'],
      'Lab Results': ['patient_name', 'test_date', 'test_results'],
      'ID Verification': ['full_name', 'date_of_birth', 'id_number']
    };

    return requiredFieldsMap[taskType] || ['patient_name'];
  }

  /**
   * Check for duplicate patient records
   */
  private async checkForDuplicatePatient(fields: ExtractedField[]): Promise<DuplicateCheckResult> {
    const nameField = fields.find(f => f.fieldName === 'patient_name');
    const dobField = fields.find(f => f.fieldName === 'date_of_birth');

    if (!nameField) {
      return { hasDuplicates: false, matchingPatients: [] };
    }

    try {
      let query = supabase
        .from('patients')
        .select('id, full_name, date_of_birth')
        .ilike('full_name', `%${nameField.fieldValue}%`);

      if (dobField) {
        query = query.eq('date_of_birth', dobField.fieldValue);
      }

      const { data, error } = await query.limit(5);

      if (error) throw error;

      return {
        hasDuplicates: data.length > 0,
        matchingPatients: data.map(p => p.full_name)
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicates: false, matchingPatients: [] };
    }
  }

  /**
   * Get pending intake tasks for automated processing
   */
  async getPendingIntakeTasks(limit: number = 10): Promise<IntakeTask[]> {
    try {
      const { data, error } = await supabase
        .from('intake_tasks')
        .select('*')
        .eq('status', 'Pending OCR')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Process all pending intake tasks using workflow orchestrator
   */
  async processAllPendingTasks(): Promise<BatchIntakeProcessingResult> {
    return await intakeWorkflowOrchestrator.processAllPendingTasks();
  }
}

// Types for automated intake service
export interface IntakeProcessingResult {
  taskId: string;
  originalStatus: string;
  newStatus: IntakeTaskStatus;
  ocrResult: OCRResult | null;
  extractionResult: StructuredExtractionResult | null;
  validationResult: AIValidationResult;
  requiresManualReview: boolean;
  processingTime: number;
}

export interface BatchIntakeProcessingResult {
  successful: IntakeProcessingResult[];
  failed: BatchProcessingError[];
  totalTasks: number;
  successCount: number;
  failureCount: number;
}

export interface BatchProcessingError {
  taskId: string;
  error: string;
}

export interface AIValidationResult {
  isValid: boolean;
  confidence: number;
  validationRules: ValidationRule[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  requiresManualReview: boolean;
  aiRecommendations: AIRecommendation[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ValidationError {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  field: string | null;
}

export interface ValidationWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  field: string | null;
}

export interface AIRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  message: string;
  action: string;
}

export interface BusinessRuleResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  requiresReview: boolean;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matchingPatients: string[];
}

export interface TaskUpdateResults {
  status: IntakeTaskStatus;
  ocrResult: OCRResult | null;
  extractionResult: StructuredExtractionResult | null;
  validationResult: AIValidationResult;
  requiresManualReview: boolean;
}

export interface IntakeTask {
  id: string;
  patient_id: string;
  task_description: string;
  status: IntakeTaskStatus;
  document_url?: string;
  ocr_confidence?: number;
  extracted_data?: ExtractedField[];
  requires_manual_review?: boolean;
  created_at: string;
  updated_at: string;
}

export type IntakeTaskStatus = 'Pending OCR' | 'Needs Validation' | 'Complete';

// Export singleton instance
export const automatedIntakeService = new AutomatedIntakeService();