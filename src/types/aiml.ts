// AI/ML Types for ClinicFlow

export type ModelType = 'no_show_prediction' | 'scheduling_optimization' | 'authorization_recommendation' | 'ocr_extraction';

export type PredictionType = 'no_show_risk' | 'optimal_scheduling' | 'auth_recommendation' | 'document_extraction';

export type ServiceType = 'ocr' | 'nlp' | 'ml_api' | 'prediction';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Core ML Model Interface
export interface MLModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  description?: string;
  modelData: ModelConfiguration;
  performanceMetrics: PerformanceMetrics;
  trainingConfig: TrainingConfiguration;
  deploymentConfig: DeploymentConfiguration;
  isActive: boolean;
  isDeployed: boolean;
  modelFilePath?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Model Configuration
export interface ModelConfiguration {
  algorithm: string;
  hyperparameters: Record<string, any>;
  featureColumns: string[];
  targetColumn?: string;
  preprocessingSteps: PreprocessingStep[];
  validationStrategy: ValidationStrategy;
}

export interface PreprocessingStep {
  type: 'normalization' | 'encoding' | 'feature_selection' | 'imputation';
  parameters: Record<string, any>;
  order: number;
}

export interface ValidationStrategy {
  method: 'cross_validation' | 'holdout' | 'time_series_split';
  parameters: Record<string, any>;
}

// Training Configuration
export interface TrainingConfiguration {
  datasetSize: number;
  trainingRatio: number;
  validationRatio: number;
  testRatio: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  earlyStoppingConfig?: EarlyStoppingConfig;
}

export interface EarlyStoppingConfig {
  enabled: boolean;
  patience: number;
  minDelta: number;
  metric: string;
}

// Deployment Configuration
export interface DeploymentConfiguration {
  environment: 'development' | 'staging' | 'production';
  scalingConfig: ScalingConfig;
  monitoringConfig: MonitoringConfig;
  rollbackConfig?: RollbackConfig;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableLogging: boolean;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  accuracyDrop: number;
  latencyThreshold: number;
  errorRateThreshold: number;
}

export interface RollbackConfig {
  enabled: boolean;
  triggerConditions: string[];
  previousVersionId?: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  aucRoc?: number;
  confusionMatrix?: ConfusionMatrix;
  featureImportance?: FeatureImportance[];
  lastEvaluated: Date;
}

export interface ConfusionMatrix {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

// Prediction Results
export interface PredictionResult {
  id: string;
  modelId: string;
  predictionType: PredictionType;
  inputData: Record<string, any>;
  prediction: PredictionOutput;
  confidence: number;
  actualOutcome?: Record<string, any>;
  feedbackScore?: number;
  appointmentId?: string;
  patientId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionOutput {
  result: any;
  probability?: number;
  riskScore?: number;
  recommendations?: string[];
  explanation?: string;
  factors?: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

// Training Data
export interface TrainingData {
  id: string;
  modelType: ModelType;
  datasetName: string;
  dataSource: string;
  featureData: Record<string, any>;
  targetData: Record<string, any>;
  dataQualityScore: number;
  isValidated: boolean;
  validationNotes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Model Performance Tracking
export interface ModelPerformance {
  id: string;
  modelId: string;
  evaluationDate: Date;
  accuracy: number;
  precisionScore?: number;
  recall?: number;
  f1Score?: number;
  aucRoc?: number;
  confusionMatrix?: ConfusionMatrix;
  featureImportance?: FeatureImportance[];
  evaluationMetrics: Record<string, any>;
  testDatasetSize?: number;
  evaluationNotes?: string;
  createdBy: string;
  createdAt: Date;
}

// AI Service Configuration
export interface AIServiceConfig {
  id: string;
  serviceName: string;
  serviceType: ServiceType;
  apiEndpoint?: string;
  apiKeyEncrypted?: string;
  configuration: ServiceConfiguration;
  rateLimits: RateLimits;
  isActive: boolean;
  lastHealthCheck?: Date;
  healthStatus: HealthStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceConfiguration {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize?: number;
  customHeaders?: Record<string, string>;
  customParameters?: Record<string, any>;
}

export interface RateLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
}

// Prediction Cache
export interface PredictionCache {
  id: string;
  cacheKey: string;
  modelId: string;
  inputHash: string;
  predictionData: PredictionOutput;
  confidence?: number;
  expiresAt: Date;
  hitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// No-Show Prediction Specific Types
export interface NoShowPredictionInput {
  appointmentId: string;
  patientId: string;
  appointmentTime: Date;
  appointmentType: string;
  providerId: string;
  patientAge: number;
  patientGender: string;
  previousNoShows: number;
  previousAppointments: number;
  daysSinceLastAppointment: number;
  appointmentDayOfWeek: number;
  appointmentHour: number;
  weatherConditions?: WeatherData;
  insuranceType?: string;
  distanceToClinic?: number;
  remindersSent: number;
}

export interface WeatherData {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  conditions: string;
}

export interface NoShowPrediction extends PredictionOutput {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  recommendations: string[];
  interventions: InterventionRecommendation[];
}

export interface InterventionRecommendation {
  type: 'reminder' | 'reschedule' | 'confirmation' | 'incentive';
  description: string;
  priority: number;
  estimatedImpact: number;
}

// OCR Processing Types
export interface OCRProcessingInput {
  documentId: string;
  documentType: string;
  imageData: string | File;
  processingOptions: OCROptions;
}

export interface OCROptions {
  language: string;
  detectOrientation: boolean;
  extractTables: boolean;
  extractSignatures: boolean;
  confidenceThreshold: number;
}

export interface OCRResult extends PredictionOutput {
  extractedText: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
  extractedFields: ExtractedField[];
  detectedLanguage?: string;
  pageCount: number;
  processingTime: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  text: string;
}

export interface ExtractedField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
  boundingBox: BoundingBox;
  fieldType: 'text' | 'number' | 'date' | 'signature' | 'checkbox';
}

// Authorization Recommendation Types
export interface AuthorizationRecommendationInput {
  patientId: string;
  procedureCode: string;
  diagnosisCode: string;
  providerId: string;
  insuranceType: string;
  patientHistory: PatientHistoryData;
  procedureDetails: ProcedureDetails;
}

export interface PatientHistoryData {
  previousAuthorizations: PreviousAuthorization[];
  medicalHistory: MedicalCondition[];
  currentMedications: Medication[];
  allergies: string[];
}

export interface PreviousAuthorization {
  procedureCode: string;
  status: 'approved' | 'denied' | 'pending';
  date: Date;
  insuranceType: string;
  denialReason?: string;
}

export interface MedicalCondition {
  condition: string;
  diagnosisDate: Date;
  severity: 'mild' | 'moderate' | 'severe';
  isActive: boolean;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
}

export interface ProcedureDetails {
  procedureName: string;
  urgency: 'routine' | 'urgent' | 'emergent';
  estimatedCost: number;
  alternativeProcedures: string[];
}

export interface AuthorizationRecommendation extends PredictionOutput {
  approvalProbability: number;
  recommendedApproach: 'standard' | 'peer_to_peer' | 'appeal' | 'alternative';
  requiredDocumentation: string[];
  timelineEstimate: number;
  alternativeOptions: AlternativeOption[];
}

export interface AlternativeOption {
  procedureCode: string;
  procedureName: string;
  approvalProbability: number;
  costDifference: number;
  description: string;
}

// Scheduling Optimization Types
export interface SchedulingOptimizationInput {
  providerId: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  appointmentRequests: AppointmentRequest[];
  constraints: SchedulingConstraints;
  preferences: SchedulingPreferences;
}

export interface AppointmentRequest {
  patientId: string;
  appointmentType: string;
  duration: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  preferredTimes: TimeSlot[];
  noShowRisk?: number;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  preference: number; // 1-10 scale
}

export interface SchedulingConstraints {
  workingHours: {
    start: string;
    end: string;
  };
  breakTimes: TimeSlot[];
  blockedTimes: TimeSlot[];
  maxConsecutiveAppointments: number;
  bufferTime: number;
}

export interface SchedulingPreferences {
  prioritizeHighRisk: boolean;
  balanceWorkload: boolean;
  minimizeGaps: boolean;
  considerPatientPreferences: boolean;
  overbookingAllowed: boolean;
  overbookingPercentage?: number;
}

export interface SchedulingOptimization extends PredictionOutput {
  optimizedSchedule: OptimizedAppointment[];
  utilizationRate: number;
  expectedNoShows: number;
  revenueEstimate: number;
  conflictsResolved: number;
}

export interface OptimizedAppointment {
  appointmentRequestId: string;
  patientId: string;
  scheduledTime: Date;
  duration: number;
  confidence: number;
  alternativeSlots?: TimeSlot[];
}

// API Response Types
export interface AIServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  processingTime: number;
  modelVersion?: string;
}

export interface BatchPredictionRequest {
  modelType: ModelType;
  inputs: Record<string, any>[];
  options?: {
    useCache: boolean;
    priority: 'low' | 'normal' | 'high';
    timeout: number;
  };
}

export interface BatchPredictionResponse {
  results: PredictionResult[];
  errors: BatchPredictionError[];
  summary: {
    totalRequests: number;
    successfulPredictions: number;
    failedPredictions: number;
    averageConfidence: number;
    processingTime: number;
  };
}

export interface BatchPredictionError {
  inputIndex: number;
  error: string;
  inputData: Record<string, any>;
}

// Model Training Types
export interface ModelTrainingRequest {
  modelType: ModelType;
  trainingConfig: TrainingConfiguration;
  datasetConfig: DatasetConfiguration;
  validationConfig: ValidationConfiguration;
}

export interface DatasetConfiguration {
  dataSource: string;
  featureColumns: string[];
  targetColumn: string;
  filters?: Record<string, any>;
  samplingStrategy?: SamplingStrategy;
}

export interface SamplingStrategy {
  method: 'random' | 'stratified' | 'time_based';
  parameters: Record<string, any>;
}

export interface ValidationConfiguration {
  method: 'cross_validation' | 'holdout' | 'time_series_split';
  folds?: number;
  testSize?: number;
  metrics: string[];
}

export interface ModelTrainingJob {
  id: string;
  modelType: ModelType;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  trainingConfig: TrainingConfiguration;
  results?: ModelTrainingResults;
  error?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelTrainingResults {
  modelId: string;
  performanceMetrics: PerformanceMetrics;
  trainingHistory: TrainingEpoch[];
  validationResults: ValidationResults;
  featureImportance: FeatureImportance[];
}

export interface TrainingEpoch {
  epoch: number;
  trainingLoss: number;
  validationLoss: number;
  trainingAccuracy: number;
  validationAccuracy: number;
  learningRate: number;
  duration: number;
}

export interface ValidationResults {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  confusionMatrix: ConfusionMatrix;
  classificationReport: ClassificationReport;
}

export interface ClassificationReport {
  classes: string[];
  precision: number[];
  recall: number[];
  f1Score: number[];
  support: number[];
}

// Error Types
export interface AIServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

// Filter and Query Types
export interface ModelFilters {
  type?: ModelType;
  isActive?: boolean;
  isDeployed?: boolean;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PredictionFilters {
  modelId?: string;
  predictionType?: PredictionType;
  appointmentId?: string;
  patientId?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface TrainingDataFilters {
  modelType?: ModelType;
  dataSource?: string;
  isValidated?: boolean;
  qualityScoreMin?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}