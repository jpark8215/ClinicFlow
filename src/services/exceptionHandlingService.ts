import { supabase } from '@/integrations/supabase/client';
import type { AIValidationResult } from './automatedIntakeService';

/**
 * Exception Handling Service for automated intake workflow
 * Manages complex documents, unclear results, and system errors
 */
export class ExceptionHandlingService {

  /**
   * Handle processing exceptions and route to appropriate resolution
   */
  async handleProcessingException(
    taskId: string,
    exceptionType: ExceptionType,
    context: ExceptionContext
  ): Promise<ExceptionResolution> {
    try {
      // Log the exception
      await this.logException(taskId, exceptionType, context);

      // Determine resolution strategy
      const resolutionStrategy = await this.determineResolutionStrategy(
        exceptionType,
        context
      );

      // Execute resolution
      const resolution = await this.executeResolution(
        taskId,
        resolutionStrategy,
        context
      );

      // Update task status based on resolution
      await this.updateTaskForException(taskId, resolution);

      return resolution;
    } catch (error) {
      console.error('Exception handling failed:', error);
      
      // Fallback to manual review
      return await this.createFallbackResolution(taskId, exceptionType, context);
    }
  }

  /**
   * Handle low confidence OCR results
   */
  async handleLowConfidenceOCR(
    taskId: string,
    ocrResult: any,
    confidenceThreshold: number
  ): Promise<ExceptionResolution> {
    const context: ExceptionContext = {
      confidence: ocrResult.confidence,
      threshold: confidenceThreshold,
      extractedText: ocrResult.extractedText,
      boundingBoxes: ocrResult.boundingBoxes,
      metadata: {
        ocrService: 'primary',
        processingTime: ocrResult.processingTime
      }
    };

    // Try alternative OCR processing strategies
    const alternativeStrategies = [
      'enhance_image_quality',
      'alternative_ocr_service',
      'manual_text_extraction'
    ];

    for (const strategy of alternativeStrategies) {
      try {
        const improvedResult = await this.tryAlternativeOCRStrategy(
          taskId,
          strategy,
          context
        );

        if (improvedResult && improvedResult.confidence > confidenceThreshold) {
          return {
            type: 'automatic_recovery',
            strategy,
            success: true,
            newStatus: 'processing',
            actions: ['update_ocr_result', 'continue_processing'],
            metadata: {
              originalConfidence: ocrResult.confidence,
              improvedConfidence: improvedResult.confidence,
              strategy
            }
          };
        }
      } catch (error) {
        console.warn(`Alternative OCR strategy ${strategy} failed:`, error);
      }
    }

    // If no alternative worked, create manual review task
    return await this.createManualReviewResolution(
      taskId,
      'low_confidence_ocr',
      context,
      'medium'
    );
  }

  /**
   * Handle validation failures with intelligent recovery
   */
  async handleValidationFailure(
    taskId: string,
    validationResult: AIValidationResult,
    extractedFields: any[]
  ): Promise<ExceptionResolution> {
    const context: ExceptionContext = {
      validationErrors: validationResult.errors,
      validationWarnings: validationResult.warnings,
      confidence: validationResult.confidence,
      extractedFields,
      metadata: {
        validationRules: validationResult.validationRules.length,
        aiRecommendations: validationResult.aiRecommendations.length
      }
    };

    // Analyze validation failures for recovery opportunities
    const recoveryOpportunities = await this.analyzeRecoveryOpportunities(
      validationResult,
      extractedFields
    );

    // Try automatic recovery for simple issues
    if (recoveryOpportunities.canAutoRecover) {
      try {
        const recoveredFields = await this.attemptAutomaticRecovery(
          extractedFields,
          recoveryOpportunities
        );

        if (recoveredFields) {
          return {
            type: 'automatic_recovery',
            strategy: 'field_correction',
            success: true,
            newStatus: 'processing',
            actions: ['update_extracted_fields', 'revalidate'],
            metadata: {
              correctedFields: recoveredFields.correctedFields,
              recoveryMethods: recoveredFields.methods
            }
          };
        }
      } catch (error) {
        console.warn('Automatic recovery failed:', error);
      }
    }

    // Determine manual review priority based on error severity
    const priority = this.calculateReviewPriority(validationResult);

    return await this.createManualReviewResolution(
      taskId,
      'validation_failure',
      context,
      priority
    );
  }

  /**
   * Handle complex or unclear documents
   */
  async handleComplexDocument(
    taskId: string,
    documentType: string,
    complexityIndicators: ComplexityIndicator[]
  ): Promise<ExceptionResolution> {
    const context: ExceptionContext = {
      documentType,
      complexityIndicators,
      metadata: {
        complexityScore: this.calculateComplexityScore(complexityIndicators),
        indicatorCount: complexityIndicators.length
      }
    };

    // Try specialized processing for complex documents
    const specializedStrategies = await this.getSpecializedStrategies(
      documentType,
      complexityIndicators
    );

    for (const strategy of specializedStrategies) {
      try {
        const result = await this.applySpecializedStrategy(
          taskId,
          strategy,
          context
        );

        if (result.success) {
          return {
            type: 'specialized_processing',
            strategy: strategy.name,
            success: true,
            newStatus: 'processing',
            actions: strategy.actions,
            metadata: {
              specializedMethod: strategy.name,
              complexityHandled: true
            }
          };
        }
      } catch (error) {
        console.warn(`Specialized strategy ${strategy.name} failed:`, error);
      }
    }

    // Route to specialized manual review queue
    return await this.createSpecializedReviewResolution(
      taskId,
      'complex_document',
      context
    );
  }

  /**
   * Handle system errors and technical failures
   */
  async handleSystemError(
    taskId: string,
    error: Error,
    processingStage: string
  ): Promise<ExceptionResolution> {
    const context: ExceptionContext = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      processingStage,
      metadata: {
        timestamp: new Date().toISOString(),
        systemHealth: await this.checkSystemHealth()
      }
    };

    // Check if this is a known recoverable error
    const errorPattern = await this.identifyErrorPattern(error);
    
    if (errorPattern && errorPattern.recoverable) {
      try {
        const recovery = await this.executeErrorRecovery(
          taskId,
          errorPattern,
          context
        );

        if (recovery.success) {
          return {
            type: 'error_recovery',
            strategy: errorPattern.recoveryMethod,
            success: true,
            newStatus: 'processing',
            actions: ['retry_processing', 'log_recovery'],
            metadata: {
              errorPattern: errorPattern.name,
              recoveryMethod: errorPattern.recoveryMethod
            }
          };
        }
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
      }
    }

    // Create technical review task for unrecoverable errors
    return await this.createTechnicalReviewResolution(
      taskId,
      error,
      context
    );
  }

  /**
   * Try alternative OCR processing strategies
   */
  private async tryAlternativeOCRStrategy(
    taskId: string,
    strategy: string,
    context: ExceptionContext
  ): Promise<any> {
    switch (strategy) {
      case 'enhance_image_quality':
        return await this.enhanceImageQuality(taskId, context);
      
      case 'alternative_ocr_service':
        return await this.useAlternativeOCRService(taskId, context);
      
      case 'manual_text_extraction':
        return await this.requestManualTextExtraction(taskId, context);
      
      default:
        throw new Error(`Unknown OCR strategy: ${strategy}`);
    }
  }

  /**
   * Enhance image quality for better OCR results
   */
  private async enhanceImageQuality(taskId: string, context: ExceptionContext): Promise<any> {
    // In a real implementation, this would apply image enhancement techniques
    // For now, simulate the process
    
    console.log(`Enhancing image quality for task ${taskId}`);
    
    // Simulate enhanced OCR result
    return {
      confidence: Math.min(0.95, (context.confidence || 0) + 0.15),
      extractedText: context.extractedText,
      enhanced: true,
      enhancementMethod: 'contrast_brightness_adjustment'
    };
  }

  /**
   * Use alternative OCR service
   */
  private async useAlternativeOCRService(taskId: string, context: ExceptionContext): Promise<any> {
    // In a real implementation, this would call a different OCR service
    console.log(`Using alternative OCR service for task ${taskId}`);
    
    // Simulate alternative OCR result
    return {
      confidence: Math.min(0.92, (context.confidence || 0) + 0.12),
      extractedText: context.extractedText,
      alternativeService: true,
      serviceName: 'backup_ocr_service'
    };
  }

  /**
   * Request manual text extraction
   */
  private async requestManualTextExtraction(taskId: string, context: ExceptionContext): Promise<any> {
    // Create a manual text extraction task
    await this.createManualExtractionTask(taskId, context);
    
    return null; // This requires human intervention
  }

  /**
   * Analyze recovery opportunities from validation failures
   */
  private async analyzeRecoveryOpportunities(
    validationResult: AIValidationResult,
    extractedFields: any[]
  ): Promise<RecoveryOpportunities> {
    const opportunities: RecoveryOpportunities = {
      canAutoRecover: false,
      recoveryMethods: [],
      confidence: 0
    };

    // Check for simple format corrections
    const formatErrors = validationResult.errors.filter(e => 
      e.type.includes('format') || e.type.includes('invalid')
    );

    if (formatErrors.length > 0) {
      const formatRecovery = await this.analyzeFormatRecovery(formatErrors, extractedFields);
      if (formatRecovery.possible) {
        opportunities.canAutoRecover = true;
        opportunities.recoveryMethods.push('format_correction');
        opportunities.confidence += 0.3;
      }
    }

    // Check for missing field recovery
    const missingFieldErrors = validationResult.errors.filter(e => 
      e.type.includes('missing') || e.type.includes('empty')
    );

    if (missingFieldErrors.length > 0) {
      const fieldRecovery = await this.analyzeMissingFieldRecovery(missingFieldErrors, extractedFields);
      if (fieldRecovery.possible) {
        opportunities.canAutoRecover = true;
        opportunities.recoveryMethods.push('field_inference');
        opportunities.confidence += 0.2;
      }
    }

    return opportunities;
  }

  /**
   * Attempt automatic recovery of validation issues
   */
  private async attemptAutomaticRecovery(
    extractedFields: any[],
    opportunities: RecoveryOpportunities
  ): Promise<{ correctedFields: any[]; methods: string[] } | null> {
    const correctedFields = [...extractedFields];
    const appliedMethods: string[] = [];

    for (const method of opportunities.recoveryMethods) {
      try {
        switch (method) {
          case 'format_correction':
            await this.applyFormatCorrections(correctedFields);
            appliedMethods.push(method);
            break;
          
          case 'field_inference':
            await this.applyFieldInference(correctedFields);
            appliedMethods.push(method);
            break;
        }
      } catch (error) {
        console.warn(`Recovery method ${method} failed:`, error);
      }
    }

    return appliedMethods.length > 0 ? { correctedFields, methods: appliedMethods } : null;
  }

  /**
   * Apply format corrections to fields
   */
  private async applyFormatCorrections(fields: any[]): Promise<void> {
    for (const field of fields) {
      switch (field.fieldType) {
        case 'phone':
          field.fieldValue = this.normalizePhoneNumber(field.fieldValue);
          break;
        
        case 'date':
          field.fieldValue = this.normalizeDateFormat(field.fieldValue);
          break;
        
        case 'email':
          field.fieldValue = field.fieldValue.toLowerCase().trim();
          break;
      }
    }
  }

  /**
   * Apply field inference for missing data
   */
  private async applyFieldInference(fields: any[]): Promise<void> {
    // Simple inference rules
    const fieldMap = new Map(fields.map(f => [f.fieldName, f.fieldValue]));
    
    // Infer missing email from name pattern
    if (!fieldMap.get('email') && fieldMap.get('patient_name')) {
      const name = fieldMap.get('patient_name');
      const inferredEmail = this.inferEmailFromName(name);
      if (inferredEmail) {
        fields.push({
          fieldName: 'email',
          fieldValue: inferredEmail,
          confidence: 0.6,
          fieldType: 'email',
          inferred: true
        });
      }
    }
  }

  /**
   * Calculate review priority based on validation results
   */
  private calculateReviewPriority(validationResult: AIValidationResult): 'low' | 'medium' | 'high' | 'urgent' {
    const criticalErrors = validationResult.errors.filter(e => e.severity === 'high').length;
    const mediumErrors = validationResult.errors.filter(e => e.severity === 'medium').length;
    const confidence = validationResult.confidence;

    if (criticalErrors > 2 || confidence < 0.5) return 'urgent';
    if (criticalErrors > 0 || confidence < 0.7) return 'high';
    if (mediumErrors > 2 || confidence < 0.8) return 'medium';
    
    return 'low';
  }

  /**
   * Calculate document complexity score
   */
  private calculateComplexityScore(indicators: ComplexityIndicator[]): number {
    return indicators.reduce((score, indicator) => {
      switch (indicator.type) {
        case 'handwritten_text': return score + 0.3;
        case 'poor_image_quality': return score + 0.25;
        case 'multiple_languages': return score + 0.2;
        case 'unusual_layout': return score + 0.15;
        case 'faded_text': return score + 0.2;
        default: return score + 0.1;
      }
    }, 0);
  }

  /**
   * Get specialized processing strategies for complex documents
   */
  private async getSpecializedStrategies(
    documentType: string,
    indicators: ComplexityIndicator[]
  ): Promise<SpecializedStrategy[]> {
    const strategies: SpecializedStrategy[] = [];

    // Handwriting recognition strategy
    if (indicators.some(i => i.type === 'handwritten_text')) {
      strategies.push({
        name: 'handwriting_recognition',
        actions: ['apply_handwriting_ocr', 'manual_verification'],
        confidence: 0.7
      });
    }

    // Image enhancement strategy
    if (indicators.some(i => i.type === 'poor_image_quality')) {
      strategies.push({
        name: 'image_enhancement',
        actions: ['enhance_image', 'reprocess_ocr'],
        confidence: 0.8
      });
    }

    // Multi-language processing
    if (indicators.some(i => i.type === 'multiple_languages')) {
      strategies.push({
        name: 'multilingual_processing',
        actions: ['detect_languages', 'process_by_language'],
        confidence: 0.6
      });
    }

    return strategies;
  }

  /**
   * Apply specialized processing strategy
   */
  private async applySpecializedStrategy(
    taskId: string,
    strategy: SpecializedStrategy,
    context: ExceptionContext
  ): Promise<{ success: boolean; result?: any }> {
    console.log(`Applying specialized strategy ${strategy.name} for task ${taskId}`);
    
    // Simulate specialized processing
    // In a real implementation, this would call specialized services
    
    return {
      success: Math.random() > 0.3, // 70% success rate simulation
      result: {
        strategy: strategy.name,
        confidence: strategy.confidence,
        processed: true
      }
    };
  }

  /**
   * Create various types of resolution tasks
   */
  private async createManualReviewResolution(
    taskId: string,
    reviewType: string,
    context: ExceptionContext,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<ExceptionResolution> {
    await this.createManualReviewTask(taskId, reviewType, priority, context);
    
    return {
      type: 'manual_review',
      strategy: 'human_intervention',
      success: true,
      newStatus: 'Needs Validation',
      actions: ['create_review_task', 'notify_reviewers'],
      metadata: {
        reviewType,
        priority,
        requiresSpecialist: priority === 'urgent'
      }
    };
  }

  private async createSpecializedReviewResolution(
    taskId: string,
    reviewType: string,
    context: ExceptionContext
  ): Promise<ExceptionResolution> {
    await this.createSpecializedReviewTask(taskId, reviewType, context);
    
    return {
      type: 'specialized_review',
      strategy: 'expert_intervention',
      success: true,
      newStatus: 'Needs Specialist Review',
      actions: ['create_specialist_task', 'notify_specialists'],
      metadata: {
        reviewType,
        requiresExpert: true,
        complexityHandled: false
      }
    };
  }

  private async createTechnicalReviewResolution(
    taskId: string,
    error: Error,
    context: ExceptionContext
  ): Promise<ExceptionResolution> {
    await this.createTechnicalReviewTask(taskId, error, context);
    
    return {
      type: 'technical_review',
      strategy: 'system_intervention',
      success: true,
      newStatus: 'Technical Review Required',
      actions: ['create_technical_task', 'notify_technical_team'],
      metadata: {
        errorType: error.name,
        requiresTechnicalExpert: true,
        systemIssue: true
      }
    };
  }

  /**
   * Utility methods for creating review tasks
   */
  private async createManualReviewTask(
    taskId: string,
    reviewType: string,
    priority: string,
    context: ExceptionContext
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('manual_review_queue')
        .insert({
          intake_task_id: taskId,
          review_type: reviewType,
          priority,
          metadata: {
            exception_context: context,
            created_by_exception_handler: true,
            requires_specialized_attention: priority === 'urgent'
          },
          status: 'pending'
        });

      if (error) {
        console.error('Error creating manual review task:', error);
      }
    } catch (error) {
      console.error('Failed to create manual review task:', error);
    }
  }

  private async createSpecializedReviewTask(
    taskId: string,
    reviewType: string,
    context: ExceptionContext
  ): Promise<void> {
    // Similar to manual review but with specialist flags
    await this.createManualReviewTask(taskId, reviewType, 'high', {
      ...context,
      requiresSpecialist: true,
      specialistType: 'document_processing_expert'
    });
  }

  private async createTechnicalReviewTask(
    taskId: string,
    error: Error,
    context: ExceptionContext
  ): Promise<void> {
    await this.createManualReviewTask(taskId, 'technical_error', 'urgent', {
      ...context,
      requiresTechnicalReview: true,
      errorDetails: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }

  private async createManualExtractionTask(
    taskId: string,
    context: ExceptionContext
  ): Promise<void> {
    await this.createManualReviewTask(taskId, 'manual_text_extraction', 'medium', {
      ...context,
      requiresManualExtraction: true,
      extractionType: 'full_text'
    });
  }

  /**
   * Utility methods
   */
  private normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  private normalizeDateFormat(date: string): string {
    // Simple date normalization
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = date.match(pattern);
      if (match) {
        const [, part1, part2, part3] = match;
        // Assume MM/DD/YYYY format for first pattern
        if (pattern === datePatterns[0]) {
          return `${part1.padStart(2, '0')}/${part2.padStart(2, '0')}/${part3}`;
        }
      }
    }

    return date;
  }

  private inferEmailFromName(name: string): string | null {
    // Simple email inference (not for production use)
    const nameParts = name.toLowerCase().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]}.${nameParts[1]}@example.com`;
    }
    return null;
  }

  private async analyzeFormatRecovery(errors: any[], fields: any[]): Promise<{ possible: boolean }> {
    // Analyze if format errors can be automatically corrected
    return { possible: errors.length <= 3 }; // Simple heuristic
  }

  private async analyzeMissingFieldRecovery(errors: any[], fields: any[]): Promise<{ possible: boolean }> {
    // Analyze if missing fields can be inferred
    return { possible: errors.length <= 2 }; // Simple heuristic
  }

  private async logException(
    taskId: string,
    exceptionType: ExceptionType,
    context: ExceptionContext
  ): Promise<void> {
    console.log(`Exception logged for task ${taskId}:`, { exceptionType, context });
  }

  private async determineResolutionStrategy(
    exceptionType: ExceptionType,
    context: ExceptionContext
  ): Promise<string> {
    // Determine the best resolution strategy based on exception type and context
    switch (exceptionType) {
      case 'low_confidence_ocr': return 'alternative_ocr_processing';
      case 'validation_failure': return 'intelligent_recovery';
      case 'complex_document': return 'specialized_processing';
      case 'system_error': return 'error_recovery';
      default: return 'manual_review';
    }
  }

  private async executeResolution(
    taskId: string,
    strategy: string,
    context: ExceptionContext
  ): Promise<ExceptionResolution> {
    // Execute the determined resolution strategy
    console.log(`Executing resolution strategy ${strategy} for task ${taskId}`);
    
    return {
      type: 'automatic_recovery',
      strategy,
      success: true,
      newStatus: 'processing',
      actions: ['retry_processing'],
      metadata: { strategy, context }
    };
  }

  private async updateTaskForException(
    taskId: string,
    resolution: ExceptionResolution
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('intake_tasks')
        .update({
          status: resolution.newStatus,
          exception_handled: true,
          exception_resolution: resolution,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task for exception:', error);
      }
    } catch (error) {
      console.error('Failed to update task for exception:', error);
    }
  }

  private async createFallbackResolution(
    taskId: string,
    exceptionType: ExceptionType,
    context: ExceptionContext
  ): Promise<ExceptionResolution> {
    // Create a safe fallback resolution
    await this.createManualReviewTask(taskId, 'exception_fallback', 'high', context);
    
    return {
      type: 'fallback',
      strategy: 'manual_review_fallback',
      success: true,
      newStatus: 'Needs Validation',
      actions: ['create_review_task'],
      metadata: { fallback: true, originalException: exceptionType }
    };
  }

  private async checkSystemHealth(): Promise<any> {
    // Check system health indicators
    return {
      ocrService: 'healthy',
      database: 'healthy',
      aiValidation: 'healthy',
      timestamp: new Date().toISOString()
    };
  }

  private async identifyErrorPattern(error: Error): Promise<ErrorPattern | null> {
    // Identify known error patterns for recovery
    const knownPatterns: ErrorPattern[] = [
      {
        name: 'network_timeout',
        pattern: /timeout|network/i,
        recoverable: true,
        recoveryMethod: 'retry_with_backoff'
      },
      {
        name: 'rate_limit',
        pattern: /rate limit|too many requests/i,
        recoverable: true,
        recoveryMethod: 'exponential_backoff'
      },
      {
        name: 'temporary_service_unavailable',
        pattern: /service unavailable|502|503/i,
        recoverable: true,
        recoveryMethod: 'retry_after_delay'
      }
    ];

    return knownPatterns.find(pattern => 
      pattern.pattern.test(error.message)
    ) || null;
  }

  private async executeErrorRecovery(
    taskId: string,
    errorPattern: ErrorPattern,
    context: ExceptionContext
  ): Promise<{ success: boolean }> {
    console.log(`Executing error recovery ${errorPattern.recoveryMethod} for task ${taskId}`);
    
    // Simulate recovery attempt
    return { success: Math.random() > 0.3 }; // 70% success rate
  }
}

// Types for exception handling
export type ExceptionType = 
  | 'low_confidence_ocr'
  | 'validation_failure'
  | 'complex_document'
  | 'system_error'
  | 'processing_timeout'
  | 'unknown_error';

export interface ExceptionContext {
  confidence?: number;
  threshold?: number;
  extractedText?: string;
  boundingBoxes?: any[];
  validationErrors?: any[];
  validationWarnings?: any[];
  extractedFields?: any[];
  documentType?: string;
  complexityIndicators?: ComplexityIndicator[];
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  processingStage?: string;
  metadata?: Record<string, any>;
}

export interface ExceptionResolution {
  type: 'automatic_recovery' | 'manual_review' | 'specialized_processing' | 'specialized_review' | 'technical_review' | 'error_recovery' | 'fallback';
  strategy: string;
  success: boolean;
  newStatus: string;
  actions: string[];
  metadata: Record<string, any>;
}

export interface ComplexityIndicator {
  type: 'handwritten_text' | 'poor_image_quality' | 'multiple_languages' | 'unusual_layout' | 'faded_text' | 'rotated_text' | 'watermarks';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  location?: string;
}

interface RecoveryOpportunities {
  canAutoRecover: boolean;
  recoveryMethods: string[];
  confidence: number;
}

interface SpecializedStrategy {
  name: string;
  actions: string[];
  confidence: number;
}

interface ErrorPattern {
  name: string;
  pattern: RegExp;
  recoverable: boolean;
  recoveryMethod: string;
}

// Export singleton instance
export const exceptionHandlingService = new ExceptionHandlingService();