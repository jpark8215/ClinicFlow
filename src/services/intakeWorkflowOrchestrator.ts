import { supabase } from '@/integrations/supabase/client';
import { ocrService } from './ocrService';
import { dataExtractionService } from './dataExtractionService';
import { aiValidationService } from './aiValidationService';
import { automatedIntakeService } from './automatedIntakeService';
import type { 
  IntakeProcessingResult, 
  BatchIntakeProcessingResult,
  IntakeTask,
  AIValidationResult 
} from './automatedIntakeService';
import type { OCRResult } from '@/types/aiml';

/**
 * Intake Workflow Orchestrator
 * Manages the complete automated intake workflow with AI validation and exception handling
 */
export class IntakeWorkflowOrchestrator {
  private processingQueue: Map<string, ProcessingStatus> = new Map();
  private batchProcessingActive = false;

  /**
   * Process a single intake task through the complete workflow
   */
  async processIntakeTask(taskId: string): Promise<IntakeProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Mark task as processing
      this.processingQueue.set(taskId, { 
        status: 'processing', 
        startTime: new Date(),
        stage: 'initialization'
      });

      // 1. Get task details and validate
      const task = await this.getIntakeTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await this.updateTaskStatus(taskId, 'processing');
      this.updateProcessingStage(taskId, 'document_retrieval');

      // 2. Process document if available
      let ocrResult: OCRResult | null = null;
      let extractionResult: any = null;

      if (task.document_url) {
        // 2a. OCR Processing
        this.updateProcessingStage(taskId, 'ocr_processing');
        ocrResult = await this.processDocumentOCR(task.document_url, task.task_description);

        // 2b. Data Extraction
        this.updateProcessingStage(taskId, 'data_extraction');
        extractionResult = await dataExtractionService.extractStructuredData(
          ocrResult,
          this.mapTaskTypeToDocumentType(task.task_description)
        );
      }

      // 3. AI Validation
      this.updateProcessingStage(taskId, 'ai_validation');
      const validationResult = await this.performAIValidation(
        extractionResult?.extractedFields || [],
        this.mapTaskTypeToDocumentType(task.task_description),
        task
      );

      // 4. Exception Handling and Decision Making
      this.updateProcessingStage(taskId, 'decision_making');
      const workflowDecision = await this.makeWorkflowDecision(
        task,
        ocrResult,
        extractionResult,
        validationResult
      );

      // 5. Execute workflow decision
      this.updateProcessingStage(taskId, 'execution');
      await this.executeWorkflowDecision(taskId, workflowDecision);

      // 6. Update task with final results
      await this.updateTaskWithResults(taskId, {
        status: workflowDecision.nextStatus,
        ocrResult,
        extractionResult,
        validationResult,
        requiresManualReview: workflowDecision.requiresManualReview
      });

      // 7. Handle post-processing actions
      await this.handlePostProcessingActions(taskId, workflowDecision);

      const processingTime = Date.now() - startTime;
      this.processingQueue.delete(taskId);

      return {
        taskId,
        originalStatus: task.status,
        newStatus: workflowDecision.nextStatus,
        ocrResult,
        extractionResult,
        validationResult,
        requiresManualReview: workflowDecision.requiresManualReview,
        processingTime
      };

    } catch (error) {
      console.error(`Intake workflow failed for task ${taskId}:`, error);
      
      // Update task status to failed
      await this.updateTaskStatus(taskId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      // Create exception handling task
      await this.createExceptionHandlingTask(taskId, error);
      
      this.processingQueue.delete(taskId);
      
      throw error;
    }
  }

  /**
   * Process multiple tasks in batch with intelligent queuing
   */
  async processBatchIntakeTasks(taskIds: string[]): Promise<BatchIntakeProcessingResult> {
    if (this.batchProcessingActive) {
      throw new Error('Batch processing is already active');
    }

    this.batchProcessingActive = true;
    const results: IntakeProcessingResult[] = [];
    const errors: any[] = [];

    try {
      // Process tasks with concurrency control
      const concurrencyLimit = 5; // Process max 5 tasks simultaneously
      const batches = this.createBatches(taskIds, concurrencyLimit);

      for (const batch of batches) {
        const batchPromises = batch.map(async (taskId) => {
          try {
            const result = await this.processIntakeTask(taskId);
            results.push(result);
          } catch (error) {
            errors.push({
              taskId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        // Wait for current batch to complete before starting next
        await Promise.all(batchPromises);
      }

      return {
        successful: results,
        failed: errors,
        totalTasks: taskIds.length,
        successCount: results.length,
        failureCount: errors.length
      };

    } finally {
      this.batchProcessingActive = false;
    }
  }

  /**
   * Process all pending intake tasks
   */
  async processAllPendingTasks(): Promise<BatchIntakeProcessingResult> {
    const pendingTasks = await this.getPendingIntakeTasks();
    const taskIds = pendingTasks.map(task => task.id);
    
    return await this.processBatchIntakeTasks(taskIds);
  }

  /**
   * Process document with OCR and handle errors
   */
  private async processDocumentOCR(documentUrl: string, documentType: string): Promise<OCRResult> {
    try {
      const ocrInput = {
        documentId: `doc_${Date.now()}`,
        documentType: this.mapTaskTypeToDocumentType(documentType),
        imageData: documentUrl,
        processingOptions: {
          language: 'en',
          detectOrientation: true,
          extractTables: false,
          extractSignatures: true,
          confidenceThreshold: 0.7
        }
      };

      return await ocrService.processDocument(ocrInput);
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Return minimal OCR result for error handling
      return {
        result: '',
        extractedText: '',
        confidence: 0,
        boundingBoxes: [],
        extractedFields: [],
        detectedLanguage: 'en',
        pageCount: 1,
        processingTime: 0,
        explanation: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Perform comprehensive AI validation
   */
  private async performAIValidation(
    extractedFields: any[],
    documentType: string,
    task: IntakeTask
  ): Promise<AIValidationResult> {
    try {
      return await aiValidationService.validateExtractedData(
        extractedFields,
        documentType,
        task
      );
    } catch (error) {
      console.error('AI validation failed:', error);
      
      // Return safe fallback validation result
      return {
        isValid: false,
        confidence: 0,
        validationRules: [],
        errors: [{
          type: 'validation_system_error',
          message: 'AI validation system encountered an error',
          severity: 'high',
          field: null
        }],
        warnings: [],
        requiresManualReview: true,
        aiRecommendations: [{
          type: 'system_error',
          priority: 'high',
          message: 'Manual review required due to validation system error',
          action: 'manual_review'
        }]
      };
    }
  }

  /**
   * Make intelligent workflow decision based on all available data
   */
  private async makeWorkflowDecision(
    task: IntakeTask,
    ocrResult: OCRResult | null,
    extractionResult: any,
    validationResult: AIValidationResult
  ): Promise<WorkflowDecision> {
    const decision: WorkflowDecision = {
      nextStatus: 'Needs Validation',
      requiresManualReview: false,
      actions: [],
      reasoning: []
    };

    // Decision 1: Check if OCR processing was successful
    if (!ocrResult || ocrResult.confidence < 0.5) {
      decision.nextStatus = 'Failed';
      decision.requiresManualReview = true;
      decision.actions.push('create_manual_review_task');
      decision.reasoning.push('OCR processing failed or confidence too low');
      return decision;
    }

    // Decision 2: Check validation results
    if (validationResult.errors.length > 0) {
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'high');
      
      if (criticalErrors.length > 0) {
        decision.nextStatus = 'Needs Validation';
        decision.requiresManualReview = true;
        decision.actions.push('create_manual_review_task');
        decision.reasoning.push(`${criticalErrors.length} critical validation error(s) found`);
      } else {
        decision.nextStatus = 'Needs Validation';
        decision.requiresManualReview = true;
        decision.actions.push('create_manual_review_task');
        decision.reasoning.push('Validation errors require review');
      }
      return decision;
    }

    // Decision 3: Check if manual review is explicitly required
    if (validationResult.requiresManualReview) {
      decision.nextStatus = 'Needs Validation';
      decision.requiresManualReview = true;
      decision.actions.push('create_manual_review_task');
      decision.reasoning.push('AI validation flagged for manual review');
      return decision;
    }

    // Decision 4: Check confidence thresholds
    if (validationResult.confidence < 0.9) {
      decision.nextStatus = 'Needs Validation';
      decision.requiresManualReview = true;
      decision.actions.push('create_manual_review_task');
      decision.reasoning.push(`Overall confidence (${Math.round(validationResult.confidence * 100)}%) below auto-approval threshold`);
      return decision;
    }

    // Decision 5: Check for warnings that might require attention
    const highPriorityWarnings = validationResult.warnings.filter(w => w.severity === 'high' || w.severity === 'medium');
    if (highPriorityWarnings.length > 2) {
      decision.nextStatus = 'Needs Validation';
      decision.requiresManualReview = true;
      decision.actions.push('create_manual_review_task');
      decision.reasoning.push(`Multiple warnings (${highPriorityWarnings.length}) require review`);
      return decision;
    }

    // Decision 6: Check AI recommendations
    const highPriorityRecommendations = validationResult.aiRecommendations.filter(r => r.priority === 'high');
    if (highPriorityRecommendations.some(r => r.action === 'manual_review')) {
      decision.nextStatus = 'Needs Validation';
      decision.requiresManualReview = true;
      decision.actions.push('create_manual_review_task');
      decision.reasoning.push('AI recommends manual review');
      return decision;
    }

    // Decision 7: Auto-approval conditions met
    if (validationResult.confidence >= 0.9 && 
        validationResult.errors.length === 0 && 
        highPriorityWarnings.length === 0) {
      decision.nextStatus = 'Complete';
      decision.requiresManualReview = false;
      decision.actions.push('auto_approve', 'create_patient_record', 'send_notification');
      decision.reasoning.push('High confidence with no issues - auto-approved');
      return decision;
    }

    // Default: Require manual review for safety
    decision.nextStatus = 'Needs Validation';
    decision.requiresManualReview = true;
    decision.actions.push('create_manual_review_task');
    decision.reasoning.push('Default safety measure - manual review required');
    
    return decision;
  }

  /**
   * Execute the workflow decision
   */
  private async executeWorkflowDecision(taskId: string, decision: WorkflowDecision): Promise<void> {
    for (const action of decision.actions) {
      try {
        await this.executeAction(taskId, action, decision);
      } catch (error) {
        console.error(`Failed to execute action ${action} for task ${taskId}:`, error);
        // Continue with other actions even if one fails
      }
    }
  }

  /**
   * Execute individual workflow action
   */
  private async executeAction(taskId: string, action: string, decision: WorkflowDecision): Promise<void> {
    switch (action) {
      case 'create_manual_review_task':
        await this.createManualReviewTask(taskId, decision);
        break;
      
      case 'auto_approve':
        await this.autoApproveTask(taskId);
        break;
      
      case 'create_patient_record':
        await this.createPatientRecord(taskId);
        break;
      
      case 'send_notification':
        await this.sendNotification(taskId, decision);
        break;
      
      case 'schedule_followup':
        await this.scheduleFollowup(taskId);
        break;
      
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  /**
   * Create manual review task with comprehensive metadata
   */
  private async createManualReviewTask(taskId: string, decision: WorkflowDecision): Promise<void> {
    try {
      const task = await this.getIntakeTask(taskId);
      if (!task) return;

      const priority = this.determinePriority(decision);
      
      const { error } = await supabase
        .from('manual_review_queue')
        .insert({
          intake_task_id: taskId,
          review_type: 'ai_validation_required',
          priority,
          metadata: {
            workflow_decision: decision,
            processing_timestamp: new Date().toISOString(),
            auto_processing_attempted: true
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

  /**
   * Auto-approve task and mark as complete
   */
  private async autoApproveTask(taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('intake_tasks')
        .update({
          status: 'Complete',
          auto_approved: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error auto-approving task:', error);
      }
    } catch (error) {
      console.error('Failed to auto-approve task:', error);
    }
  }

  /**
   * Create patient record from extracted data
   */
  private async createPatientRecord(taskId: string): Promise<void> {
    // This would integrate with patient management system
    // For now, just log the action
    console.log(`Creating patient record for task ${taskId}`);
  }

  /**
   * Send notification about task processing
   */
  private async sendNotification(taskId: string, decision: WorkflowDecision): Promise<void> {
    // This would integrate with notification system
    console.log(`Sending notification for task ${taskId}:`, decision.reasoning.join(', '));
  }

  /**
   * Schedule followup actions
   */
  private async scheduleFollowup(taskId: string): Promise<void> {
    // This would schedule followup tasks or reminders
    console.log(`Scheduling followup for task ${taskId}`);
  }

  /**
   * Handle post-processing actions
   */
  private async handlePostProcessingActions(taskId: string, decision: WorkflowDecision): Promise<void> {
    // Log processing results for analytics
    await this.logProcessingAnalytics(taskId, decision);
    
    // Update workflow metrics
    await this.updateWorkflowMetrics(decision);
    
    // Trigger any integration webhooks
    await this.triggerIntegrationWebhooks(taskId, decision);
  }

  /**
   * Create exception handling task for failed processing
   */
  private async createExceptionHandlingTask(taskId: string, error: any): Promise<void> {
    try {
      const { error: dbError } = await supabase
        .from('manual_review_queue')
        .insert({
          intake_task_id: taskId,
          review_type: 'processing_exception',
          priority: 'high',
          metadata: {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_stack: error instanceof Error ? error.stack : null,
            processing_timestamp: new Date().toISOString(),
            requires_technical_review: true
          },
          status: 'pending'
        });

      if (dbError) {
        console.error('Error creating exception handling task:', dbError);
      }
    } catch (err) {
      console.error('Failed to create exception handling task:', err);
    }
  }

  /**
   * Utility methods
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private updateProcessingStage(taskId: string, stage: string): void {
    const status = this.processingQueue.get(taskId);
    if (status) {
      status.stage = stage;
      status.lastUpdate = new Date();
    }
  }

  private mapTaskTypeToDocumentType(taskDescription: string): string {
    const mapping: Record<string, string> = {
      'New Patient Packet': 'new_patient_packet',
      'Insurance Card': 'insurance_card',
      'Referral Letter': 'referral_letter',
      'Medical History Form': 'medical_history_form',
      'Consent Forms': 'consent_form',
      'Lab Results': 'lab_results',
      'ID Verification': 'id_verification'
    };

    return mapping[taskDescription] || 'unknown';
  }

  private determinePriority(decision: WorkflowDecision): 'low' | 'medium' | 'high' | 'urgent' {
    if (decision.reasoning.some(r => r.includes('critical') || r.includes('failed'))) {
      return 'high';
    }
    if (decision.reasoning.some(r => r.includes('error') || r.includes('validation'))) {
      return 'medium';
    }
    return 'low';
  }

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

  private async getPendingIntakeTasks(): Promise<IntakeTask[]> {
    try {
      const { data, error } = await supabase
        .from('intake_tasks')
        .select('*')
        .eq('status', 'Pending OCR')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
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

  private async updateTaskWithResults(taskId: string, results: any): Promise<void> {
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

  private async logProcessingAnalytics(taskId: string, decision: WorkflowDecision): Promise<void> {
    // Log analytics for monitoring and improvement
    console.log(`Analytics: Task ${taskId} processed with decision:`, decision);
  }

  private async updateWorkflowMetrics(decision: WorkflowDecision): Promise<void> {
    // Update workflow performance metrics
    console.log('Updating workflow metrics:', decision);
  }

  private async triggerIntegrationWebhooks(taskId: string, decision: WorkflowDecision): Promise<void> {
    // Trigger any external system integrations
    console.log(`Triggering webhooks for task ${taskId}`);
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): Map<string, ProcessingStatus> {
    return new Map(this.processingQueue);
  }

  /**
   * Check if batch processing is active
   */
  isBatchProcessingActive(): boolean {
    return this.batchProcessingActive;
  }
}

// Types for workflow orchestrator
interface ProcessingStatus {
  status: 'processing' | 'completed' | 'failed';
  startTime: Date;
  lastUpdate?: Date;
  stage: string;
}

interface WorkflowDecision {
  nextStatus: string;
  requiresManualReview: boolean;
  actions: string[];
  reasoning: string[];
}

// Export singleton instance
export const intakeWorkflowOrchestrator = new IntakeWorkflowOrchestrator();