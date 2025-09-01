import { supabase } from '@/integrations/supabase/client';
import {
  MLModel,
  PredictionResult,
  NoShowPredictionInput,
  NoShowPrediction,
  OCRProcessingInput,
  OCRResult,
  AuthorizationRecommendationInput,
  AuthorizationRecommendation,
  SchedulingOptimizationInput,
  SchedulingOptimization,
  AIServiceResponse,
  BatchPredictionRequest,
  BatchPredictionResponse,
  ModelType,
  PredictionType,
  AIServiceConfig,
  PredictionCache,
  RiskFactor,
  InterventionRecommendation,
  BoundingBox,
  ExtractedField,
  AlternativeOption
} from '@/types/aiml';

/**
 * AI Service for managing machine learning models and predictions
 */
export class AIService {
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get active model by type
   */
  async getActiveModel(modelType: ModelType): Promise<MLModel | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_active_model', { model_type: modelType });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No active model found for type: ${modelType}`);
        return null;
      }

      const modelData = data[0];
      return {
        id: modelData.id,
        name: modelData.name,
        version: modelData.version,
        type: modelType,
        description: '',
        modelData: modelData.model_data || {},
        performanceMetrics: {
          lastEvaluated: new Date()
        },
        trainingConfig: {
          datasetSize: 0,
          trainingRatio: 0.8,
          validationRatio: 0.1,
          testRatio: 0.1
        },
        deploymentConfig: modelData.deployment_config || {},
        isActive: true,
        isDeployed: true,
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting active model:', error);
      throw new Error(`Failed to get active model for type: ${modelType}`);
    }
  }

  /**
   * Predict no-show risk for an appointment
   */
  async predictNoShowRisk(input: NoShowPredictionInput): Promise<NoShowPrediction> {
    try {
      const cacheKey = `no_show_${input.appointmentId}`;
      
      // Check cache first
      const cached = await this.getCachedPrediction(cacheKey);
      if (cached) {
        return cached as NoShowPrediction;
      }

      // Get active no-show prediction model
      const model = await this.getActiveModel('no_show_prediction');
      if (!model) {
        // Return mock prediction if no model is available
        return this.generateMockNoShowPrediction(input);
      }

      // For now, use mock prediction logic
      // In production, this would call the actual ML model
      const prediction = this.generateMockNoShowPrediction(input);

      // Log the prediction result
      await this.logPredictionResult(
        model.id,
        'no_show_risk',
        input,
        prediction,
        prediction.riskScore,
        input.appointmentId,
        input.patientId
      );

      // Cache the result
      await this.cachePrediction(cacheKey, model.id, prediction, prediction.riskScore);

      return prediction;
    } catch (error) {
      console.error('Error predicting no-show risk:', error);
      throw new Error('Failed to predict no-show risk');
    }
  }

  /**
   * Process document with OCR
   */
  async processDocument(input: OCRProcessingInput): Promise<OCRResult> {
    try {
      const cacheKey = `ocr_${input.documentId}`;
      
      // Check cache first
      const cached = await this.getCachedPrediction(cacheKey);
      if (cached) {
        return cached as OCRResult;
      }

      // Get active OCR model
      const model = await this.getActiveModel('ocr_extraction');
      if (!model) {
        // Return mock OCR result if no model is available
        return this.generateMockOCRResult(input);
      }

      // For now, use mock OCR logic
      // In production, this would call external OCR service (Google Vision, AWS Textract, etc.)
      const result = this.generateMockOCRResult(input);

      // Log the prediction result
      await this.logPredictionResult(
        model.id,
        'document_extraction',
        input,
        result,
        result.confidence,
        undefined,
        undefined
      );

      // Cache the result
      await this.cachePrediction(cacheKey, model.id, result, result.confidence);

      return result;
    } catch (error) {
      console.error('Error processing document with OCR:', error);
      throw new Error('Failed to process document with OCR');
    }
  }

  /**
   * Get prior authorization recommendation
   */
  async recommendAuthorization(input: AuthorizationRecommendationInput): Promise<AuthorizationRecommendation> {
    try {
      const cacheKey = `auth_${input.patientId}_${input.procedureCode}`;
      
      // Check cache first
      const cached = await this.getCachedPrediction(cacheKey);
      if (cached) {
        return cached as AuthorizationRecommendation;
      }

      // Get active authorization recommendation model
      const model = await this.getActiveModel('authorization_recommendation');
      if (!model) {
        // Return mock recommendation if no model is available
        return this.generateMockAuthRecommendation(input);
      }

      // For now, use mock recommendation logic
      // In production, this would use historical approval data and ML models
      const recommendation = this.generateMockAuthRecommendation(input);

      // Log the prediction result
      await this.logPredictionResult(
        model.id,
        'auth_recommendation',
        input,
        recommendation,
        recommendation.approvalProbability,
        undefined,
        input.patientId
      );

      // Cache the result
      await this.cachePrediction(cacheKey, model.id, recommendation, recommendation.approvalProbability);

      return recommendation;
    } catch (error) {
      console.error('Error getting authorization recommendation:', error);
      throw new Error('Failed to get authorization recommendation');
    }
  }

  /**
   * Optimize appointment scheduling
   */
  async optimizeSchedule(input: SchedulingOptimizationInput): Promise<SchedulingOptimization> {
    try {
      const cacheKey = `schedule_${input.providerId}_${input.dateRange.startDate.toISOString()}`;
      
      // Check cache first
      const cached = await this.getCachedPrediction(cacheKey);
      if (cached) {
        return cached as SchedulingOptimization;
      }

      // Get active scheduling optimization model
      const model = await this.getActiveModel('scheduling_optimization');
      if (!model) {
        // Return mock optimization if no model is available
        return this.generateMockScheduleOptimization(input);
      }

      // For now, use mock optimization logic
      // In production, this would use optimization algorithms and ML models
      const optimization = this.generateMockScheduleOptimization(input);

      // Log the prediction result
      await this.logPredictionResult(
        model.id,
        'optimal_scheduling',
        input,
        optimization,
        optimization.utilizationRate,
        undefined,
        undefined
      );

      // Cache the result
      await this.cachePrediction(cacheKey, model.id, optimization, optimization.utilizationRate);

      return optimization;
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      throw new Error('Failed to optimize schedule');
    }
  }

  /**
   * Batch prediction processing
   */
  async batchPredict(request: BatchPredictionRequest): Promise<BatchPredictionResponse> {
    try {
      const results: PredictionResult[] = [];
      const errors: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < request.inputs.length; i++) {
        try {
          const input = request.inputs[i];
          let prediction: any;

          switch (request.modelType) {
            case 'no_show_prediction':
              prediction = await this.predictNoShowRisk(input as NoShowPredictionInput);
              break;
            case 'ocr_extraction':
              prediction = await this.processDocument(input as OCRProcessingInput);
              break;
            case 'authorization_recommendation':
              prediction = await this.recommendAuthorization(input as AuthorizationRecommendationInput);
              break;
            case 'scheduling_optimization':
              prediction = await this.optimizeSchedule(input as SchedulingOptimizationInput);
              break;
            default:
              throw new Error(`Unsupported model type: ${request.modelType}`);
          }

          results.push({
            id: `batch_${Date.now()}_${i}`,
            modelId: 'mock_model',
            predictionType: this.getModelPredictionType(request.modelType),
            inputData: input,
            prediction,
            confidence: prediction.confidence || prediction.riskScore || 0.8,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          errors.push({
            inputIndex: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            inputData: request.inputs[i]
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const averageConfidence = results.length > 0 
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
        : 0;

      return {
        results,
        errors,
        summary: {
          totalRequests: request.inputs.length,
          successfulPredictions: results.length,
          failedPredictions: errors.length,
          averageConfidence,
          processingTime
        }
      };
    } catch (error) {
      console.error('Error in batch prediction:', error);
      throw new Error('Failed to process batch predictions');
    }
  }

  /**
   * Log prediction result to database
   */
  private async logPredictionResult(
    modelId: string,
    predictionType: string,
    inputData: any,
    prediction: any,
    confidence?: number,
    appointmentId?: string,
    patientId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('log_prediction_result', {
          p_model_id: modelId,
          p_prediction_type: predictionType,
          p_input_data: inputData,
          p_prediction: prediction,
          p_confidence: confidence,
          p_appointment_id: appointmentId,
          p_patient_id: patientId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging prediction result:', error);
      throw new Error('Failed to log prediction result');
    }
  }

  /**
   * Cache prediction result
   */
  private async cachePrediction(
    cacheKey: string,
    modelId: string,
    predictionData: any,
    confidence?: number,
    ttlHours: number = 24
  ): Promise<void> {
    try {
      const inputHash = this.generateHash(cacheKey);
      
      await supabase
        .rpc('cache_prediction', {
          p_cache_key: cacheKey,
          p_model_id: modelId,
          p_input_hash: inputHash,
          p_prediction_data: predictionData,
          p_confidence: confidence,
          p_ttl_hours: ttlHours
        });

      // Also cache in memory for faster access
      this.cache.set(cacheKey, {
        data: predictionData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error caching prediction:', error);
      // Don't throw error for caching failures
    }
  }

  /**
   * Get cached prediction
   */
  private async getCachedPrediction(cacheKey: string): Promise<any | null> {
    try {
      // Check memory cache first
      const memoryCache = this.cache.get(cacheKey);
      if (memoryCache && (Date.now() - memoryCache.timestamp) < this.CACHE_TTL) {
        return memoryCache.data;
      }

      // Check database cache
      const { data, error } = await supabase
        .rpc('get_cached_prediction', { p_cache_key: cacheKey });

      if (error) throw error;

      if (data && data.length > 0) {
        const cached = data[0];
        // Update memory cache
        this.cache.set(cacheKey, {
          data: cached.prediction_data,
          timestamp: Date.now()
        });
        return cached.prediction_data;
      }

      return null;
    } catch (error) {
      console.error('Error getting cached prediction:', error);
      return null;
    }
  }

  /**
   * Generate mock no-show prediction (placeholder for actual ML model)
   */
  private generateMockNoShowPrediction(input: NoShowPredictionInput): NoShowPrediction {
    // Mock risk calculation based on input factors
    let riskScore = 0.3; // Base risk

    // Adjust based on previous no-shows
    if (input.previousNoShows > 0) {
      riskScore += Math.min(input.previousNoShows * 0.15, 0.4);
    }

    // Adjust based on appointment time
    if (input.appointmentHour < 9 || input.appointmentHour > 16) {
      riskScore += 0.1;
    }

    // Adjust based on day of week (Monday = 1, Friday = 5)
    if (input.appointmentDayOfWeek === 1 || input.appointmentDayOfWeek === 5) {
      riskScore += 0.05;
    }

    // Adjust based on days since last appointment
    if (input.daysSinceLastAppointment > 180) {
      riskScore += 0.1;
    }

    // Adjust based on weather (if available)
    if (input.weatherConditions?.precipitation > 0.5) {
      riskScore += 0.05;
    }

    // Cap at 0.95
    riskScore = Math.min(riskScore, 0.95);

    const riskLevel: 'low' | 'medium' | 'high' = 
      riskScore < 0.3 ? 'low' : riskScore < 0.6 ? 'medium' : 'high';

    const factors: RiskFactor[] = [
      {
        factor: 'Previous No-Shows',
        impact: input.previousNoShows * 0.15,
        description: `Patient has ${input.previousNoShows} previous no-shows`
      },
      {
        factor: 'Appointment Time',
        impact: (input.appointmentHour < 9 || input.appointmentHour > 16) ? 0.1 : 0,
        description: `Appointment scheduled at ${input.appointmentHour}:00`
      },
      {
        factor: 'Day of Week',
        impact: (input.appointmentDayOfWeek === 1 || input.appointmentDayOfWeek === 5) ? 0.05 : 0,
        description: `Appointment on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][input.appointmentDayOfWeek]}`
      }
    ].filter(f => f.impact > 0);

    const interventions: InterventionRecommendation[] = [];
    
    if (riskScore > 0.5) {
      interventions.push({
        type: 'reminder',
        description: 'Send additional reminder 24 hours before appointment',
        priority: 1,
        estimatedImpact: 0.15
      });
    }

    if (riskScore > 0.7) {
      interventions.push({
        type: 'confirmation',
        description: 'Require confirmation call 48 hours before appointment',
        priority: 2,
        estimatedImpact: 0.25
      });
    }

    return {
      result: riskLevel,
      riskScore,
      riskLevel,
      probability: riskScore,
      factors,
      recommendations: [
        `Risk level: ${riskLevel.toUpperCase()}`,
        `Estimated no-show probability: ${Math.round(riskScore * 100)}%`,
        ...interventions.map(i => i.description)
      ],
      interventions,
      explanation: `Based on historical patterns and patient factors, this appointment has a ${Math.round(riskScore * 100)}% probability of no-show.`
    };
  }

  /**
   * Generate mock OCR result (placeholder for actual OCR service)
   */
  private generateMockOCRResult(input: OCRProcessingInput): OCRResult {
    const mockText = `
PATIENT INTAKE FORM

Patient Name: John Doe
Date of Birth: 01/15/1980
Phone: (555) 123-4567
Email: john.doe@email.com

Chief Complaint: Routine checkup
Medical History: Hypertension, Diabetes Type 2
Current Medications: Metformin 500mg, Lisinopril 10mg
Allergies: Penicillin

Insurance: Blue Cross Blue Shield
Policy Number: BC123456789
Group Number: GRP001

Patient Signature: [Signature Present]
Date: ${new Date().toLocaleDateString()}
    `.trim();

    const boundingBoxes: BoundingBox[] = [
      {
        x: 50, y: 100, width: 200, height: 25,
        confidence: 0.95,
        text: 'Patient Name: John Doe'
      },
      {
        x: 50, y: 130, width: 180, height: 25,
        confidence: 0.92,
        text: 'Date of Birth: 01/15/1980'
      },
      {
        x: 50, y: 160, width: 160, height: 25,
        confidence: 0.88,
        text: 'Phone: (555) 123-4567'
      }
    ];

    const extractedFields: ExtractedField[] = [
      {
        fieldName: 'patient_name',
        fieldValue: 'John Doe',
        confidence: 0.95,
        fieldType: 'text',
        boundingBox: boundingBoxes[0]
      },
      {
        fieldName: 'date_of_birth',
        fieldValue: '01/15/1980',
        confidence: 0.92,
        fieldType: 'date',
        boundingBox: boundingBoxes[1]
      },
      {
        fieldName: 'phone',
        fieldValue: '(555) 123-4567',
        confidence: 0.88,
        fieldType: 'text',
        boundingBox: boundingBoxes[2]
      }
    ];

    return {
      result: mockText,
      extractedText: mockText,
      confidence: 0.91,
      boundingBoxes,
      extractedFields,
      detectedLanguage: 'en',
      pageCount: 1,
      processingTime: 1250,
      explanation: 'Document processed successfully with high confidence'
    };
  }

  /**
   * Generate mock authorization recommendation (placeholder for actual ML model)
   */
  private generateMockAuthRecommendation(input: AuthorizationRecommendationInput): AuthorizationRecommendation {
    // Mock approval probability based on procedure and insurance
    let approvalProbability = 0.7; // Base probability

    // Adjust based on procedure urgency
    if (input.procedureDetails.urgency === 'emergent') {
      approvalProbability += 0.2;
    } else if (input.procedureDetails.urgency === 'routine') {
      approvalProbability -= 0.1;
    }

    // Adjust based on previous authorizations
    const approvedCount = input.patientHistory.previousAuthorizations
      .filter(auth => auth.status === 'approved').length;
    const deniedCount = input.patientHistory.previousAuthorizations
      .filter(auth => auth.status === 'denied').length;

    if (approvedCount > deniedCount) {
      approvalProbability += 0.1;
    } else if (deniedCount > approvedCount) {
      approvalProbability -= 0.15;
    }

    // Cap probability
    approvalProbability = Math.max(0.1, Math.min(0.95, approvalProbability));

    const recommendedApproach: 'standard' | 'peer_to_peer' | 'appeal' | 'alternative' = 
      approvalProbability > 0.7 ? 'standard' :
      approvalProbability > 0.4 ? 'peer_to_peer' : 'alternative';

    const requiredDocumentation = [
      'Medical necessity documentation',
      'Provider notes and treatment history',
      'Diagnostic test results'
    ];

    if (input.procedureDetails.urgency === 'emergent') {
      requiredDocumentation.push('Emergency documentation');
    }

    const alternativeOptions: AlternativeOption[] = [
      {
        procedureCode: 'ALT001',
        procedureName: 'Alternative Procedure A',
        approvalProbability: Math.min(0.95, approvalProbability + 0.2),
        costDifference: -500,
        description: 'Less invasive alternative with similar outcomes'
      }
    ];

    return {
      result: recommendedApproach,
      approvalProbability,
      recommendedApproach,
      requiredDocumentation,
      timelineEstimate: recommendedApproach === 'standard' ? 3 : 7, // days
      alternativeOptions,
      recommendations: [
        `Approval probability: ${Math.round(approvalProbability * 100)}%`,
        `Recommended approach: ${recommendedApproach.replace('_', ' ')}`,
        `Expected timeline: ${recommendedApproach === 'standard' ? 3 : 7} business days`
      ],
      explanation: `Based on historical approval patterns and patient factors, this authorization has a ${Math.round(approvalProbability * 100)}% probability of approval using the ${recommendedApproach} approach.`
    };
  }

  /**
   * Generate mock schedule optimization (placeholder for actual optimization algorithm)
   */
  private generateMockScheduleOptimization(input: SchedulingOptimizationInput): SchedulingOptimization {
    const optimizedAppointments = input.appointmentRequests.map((request, index) => {
      // Simple scheduling logic - assign to preferred times or next available
      const preferredTime = request.preferredTimes[0]?.startTime || 
        new Date(input.dateRange.startDate.getTime() + (index * 60 * 60 * 1000)); // 1 hour intervals

      return {
        appointmentRequestId: `req_${index}`,
        patientId: request.patientId,
        scheduledTime: preferredTime,
        duration: request.duration,
        confidence: 0.85,
        alternativeSlots: request.preferredTimes.slice(1, 3)
      };
    });

    const utilizationRate = Math.min(0.95, optimizedAppointments.length / 16); // Assuming 16 slots per day
    const expectedNoShows = optimizedAppointments.length * 0.15; // 15% average no-show rate
    const revenueEstimate = optimizedAppointments.length * 150; // $150 per appointment

    return {
      result: optimizedAppointments,
      optimizedSchedule: optimizedAppointments,
      utilizationRate,
      expectedNoShows,
      revenueEstimate,
      conflictsResolved: Math.floor(input.appointmentRequests.length * 0.1),
      recommendations: [
        `Utilization rate: ${Math.round(utilizationRate * 100)}%`,
        `Expected no-shows: ${Math.round(expectedNoShows)}`,
        `Estimated revenue: $${revenueEstimate.toLocaleString()}`
      ],
      explanation: `Optimized schedule achieves ${Math.round(utilizationRate * 100)}% utilization with minimal conflicts.`
    };
  }

  /**
   * Get prediction type for model type
   */
  private getModelPredictionType(modelType: ModelType): PredictionType {
    const mapping: Record<ModelType, PredictionType> = {
      'no_show_prediction': 'no_show_risk',
      'scheduling_optimization': 'optimal_scheduling',
      'authorization_recommendation': 'auth_recommendation',
      'ocr_extraction': 'document_extraction'
    };
    return mapping[modelType];
  }

  /**
   * Generate hash for caching
   */
  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get AI service configurations
   */
  async getServiceConfigs(): Promise<AIServiceConfig[]> {
    try {
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((config: any) => ({
        id: config.id,
        serviceName: config.service_name,
        serviceType: config.service_type,
        apiEndpoint: config.api_endpoint,
        apiKeyEncrypted: config.api_key_encrypted,
        configuration: config.configuration || {},
        rateLimits: config.rate_limits || {},
        isActive: config.is_active,
        lastHealthCheck: config.last_health_check ? new Date(config.last_health_check) : undefined,
        healthStatus: config.health_status,
        createdBy: config.created_by,
        createdAt: new Date(config.created_at),
        updatedAt: new Date(config.updated_at)
      }));
    } catch (error) {
      console.error('Error getting service configs:', error);
      throw new Error('Failed to get AI service configurations');
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_predictions');

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();