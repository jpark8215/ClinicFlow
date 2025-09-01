import { supabase } from '@/integrations/supabase/client';
import {
  MLModel,
  ModelTrainingRequest,
  ModelTrainingJob,
  ModelTrainingResults,
  ModelPerformance,
  TrainingData,
  ModelType,
  ModelConfiguration,
  TrainingConfiguration,
  DeploymentConfiguration,
  PerformanceMetrics,
  ModelFilters,
  ValidationResults,
  TrainingEpoch,
  FeatureImportance,
  DatasetConfiguration,
  ValidationConfiguration,
  SamplingStrategy
} from '@/types/aiml';

/**
 * ML Pipeline Service for model training, deployment, and management
 */
export class MLPipelineService {
  private trainingJobs = new Map<string, ModelTrainingJob>();

  /**
   * Create a new ML model
   */
  async createModel(
    name: string,
    type: ModelType,
    version: string,
    description?: string,
    modelConfig?: ModelConfiguration,
    trainingConfig?: TrainingConfiguration,
    deploymentConfig?: DeploymentConfiguration
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .insert({
          name,
          type,
          version,
          description,
          model_data: modelConfig || {},
          training_config: trainingConfig || this.getDefaultTrainingConfig(),
          deployment_config: deploymentConfig || this.getDefaultDeploymentConfig(),
          is_active: false,
          is_deployed: false,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating model:', error);
      throw new Error('Failed to create ML model');
    }
  }

  /**
   * Get all models with optional filtering
   */
  async getModels(filters?: ModelFilters): Promise<MLModel[]> {
    try {
      let query = supabase
        .from('ml_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.isDeployed !== undefined) {
        query = query.eq('is_deployed', filters.isDeployed);
      }
      if (filters?.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }
      if (filters?.createdAfter) {
        query = query.gte('created_at', filters.createdAfter.toISOString());
      }
      if (filters?.createdBefore) {
        query = query.lte('created_at', filters.createdBefore.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapDatabaseToModel);
    } catch (error) {
      console.error('Error getting models:', error);
      throw new Error('Failed to get ML models');
    }
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<MLModel | null> {
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapDatabaseToModel(data);
    } catch (error) {
      console.error('Error getting model:', error);
      throw new Error('Failed to get ML model');
    }
  }

  /**
   * Update model configuration
   */
  async updateModel(
    modelId: string,
    updates: Partial<{
      name: string;
      description: string;
      modelData: ModelConfiguration;
      trainingConfig: TrainingConfiguration;
      deploymentConfig: DeploymentConfiguration;
      isActive: boolean;
      isDeployed: boolean;
    }>
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.modelData) updateData.model_data = updates.modelData;
      if (updates.trainingConfig) updateData.training_config = updates.trainingConfig;
      if (updates.deploymentConfig) updateData.deployment_config = updates.deploymentConfig;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.isDeployed !== undefined) updateData.is_deployed = updates.isDeployed;

      const { error } = await supabase
        .from('ml_models')
        .update(updateData)
        .eq('id', modelId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating model:', error);
      throw new Error('Failed to update ML model');
    }
  }

  /**
   * Delete model
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ml_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting model:', error);
      throw new Error('Failed to delete ML model');
    }
  }

  /**
   * Start model training job
   */
  async startTraining(request: ModelTrainingRequest): Promise<string> {
    try {
      // Create training job record
      const jobId = crypto.randomUUID();
      const trainingJob: ModelTrainingJob = {
        id: jobId,
        modelType: request.modelType,
        status: 'queued',
        progress: 0,
        trainingConfig: request.trainingConfig,
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.trainingJobs.set(jobId, trainingJob);

      // Start training process (mock implementation)
      this.executeTrainingJob(jobId, request);

      return jobId;
    } catch (error) {
      console.error('Error starting training:', error);
      throw new Error('Failed to start model training');
    }
  }

  /**
   * Get training job status
   */
  async getTrainingJob(jobId: string): Promise<ModelTrainingJob | null> {
    return this.trainingJobs.get(jobId) || null;
  }

  /**
   * Get all training jobs
   */
  async getTrainingJobs(): Promise<ModelTrainingJob[]> {
    return Array.from(this.trainingJobs.values());
  }

  /**
   * Deploy model to production
   */
  async deployModel(modelId: string): Promise<void> {
    try {
      // First, deactivate all other models of the same type
      const model = await this.getModel(modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      // Deactivate other models of the same type
      await supabase
        .from('ml_models')
        .update({ is_active: false, is_deployed: false })
        .eq('type', model.type);

      // Activate and deploy the selected model
      await this.updateModel(modelId, {
        isActive: true,
        isDeployed: true
      });

      console.log(`Model ${modelId} deployed successfully`);
    } catch (error) {
      console.error('Error deploying model:', error);
      throw new Error('Failed to deploy ML model');
    }
  }

  /**
   * Undeploy model from production
   */
  async undeployModel(modelId: string): Promise<void> {
    try {
      await this.updateModel(modelId, {
        isActive: false,
        isDeployed: false
      });

      console.log(`Model ${modelId} undeployed successfully`);
    } catch (error) {
      console.error('Error undeploying model:', error);
      throw new Error('Failed to undeploy ML model');
    }
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(modelId: string, testData?: any[]): Promise<ModelPerformance> {
    try {
      // Mock evaluation - in production, this would run actual model evaluation
      const mockPerformance = this.generateMockPerformance(modelId);

      // Store performance metrics
      const { data, error } = await supabase
        .rpc('update_model_performance', {
          p_model_id: modelId,
          p_accuracy: mockPerformance.accuracy,
          p_precision_score: mockPerformance.precision,
          p_recall: mockPerformance.recall,
          p_f1_score: mockPerformance.f1Score,
          p_auc_roc: mockPerformance.aucRoc,
          p_confusion_matrix: mockPerformance.confusionMatrix,
          p_feature_importance: mockPerformance.featureImportance,
          p_evaluation_metrics: {},
          p_test_dataset_size: testData?.length || 1000,
          p_evaluation_notes: 'Automated evaluation'
        });

      if (error) throw error;

      return {
        id: data,
        modelId,
        evaluationDate: new Date(),
        accuracy: mockPerformance.accuracy || 0,
        precisionScore: mockPerformance.precision,
        recall: mockPerformance.recall,
        f1Score: mockPerformance.f1Score,
        aucRoc: mockPerformance.aucRoc,
        confusionMatrix: mockPerformance.confusionMatrix,
        featureImportance: mockPerformance.featureImportance,
        evaluationMetrics: {},
        testDatasetSize: testData?.length || 1000,
        evaluationNotes: 'Automated evaluation',
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'system',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error evaluating model:', error);
      throw new Error('Failed to evaluate ML model');
    }
  }

  /**
   * Get model performance history
   */
  async getModelPerformanceHistory(modelId: string): Promise<ModelPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('model_performance')
        .select('*')
        .eq('model_id', modelId)
        .order('evaluation_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((perf: any) => ({
        id: perf.id,
        modelId: perf.model_id,
        evaluationDate: new Date(perf.evaluation_date),
        accuracy: perf.accuracy,
        precisionScore: perf.precision_score,
        recall: perf.recall,
        f1Score: perf.f1_score,
        aucRoc: perf.auc_roc,
        confusionMatrix: perf.confusion_matrix,
        featureImportance: perf.feature_importance,
        evaluationMetrics: perf.evaluation_metrics || {},
        testDatasetSize: perf.test_dataset_size,
        evaluationNotes: perf.evaluation_notes,
        createdBy: perf.created_by,
        createdAt: new Date(perf.created_at)
      }));
    } catch (error) {
      console.error('Error getting performance history:', error);
      throw new Error('Failed to get model performance history');
    }
  }

  /**
   * Add training data
   */
  async addTrainingData(
    modelType: ModelType,
    datasetName: string,
    dataSource: string,
    featureData: Record<string, any>,
    targetData: Record<string, any>,
    dataQualityScore?: number
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('training_data')
        .insert({
          model_type: modelType,
          dataset_name: datasetName,
          data_source: dataSource,
          feature_data: featureData,
          target_data: targetData,
          data_quality_score: dataQualityScore || 0.8,
          is_validated: false,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error adding training data:', error);
      throw new Error('Failed to add training data');
    }
  }

  /**
   * Get training data for model type
   */
  async getTrainingData(modelType: ModelType, limit?: number): Promise<TrainingData[]> {
    try {
      let query = supabase
        .from('training_data')
        .select('*')
        .eq('model_type', modelType)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((td: any) => ({
        id: td.id,
        modelType: td.model_type,
        datasetName: td.dataset_name,
        dataSource: td.data_source,
        featureData: td.feature_data,
        targetData: td.target_data,
        dataQualityScore: td.data_quality_score,
        isValidated: td.is_validated,
        validationNotes: td.validation_notes,
        createdBy: td.created_by,
        createdAt: new Date(td.created_at),
        updatedAt: new Date(td.updated_at)
      }));
    } catch (error) {
      console.error('Error getting training data:', error);
      throw new Error('Failed to get training data');
    }
  }

  /**
   * Validate training data
   */
  async validateTrainingData(dataId: string, isValid: boolean, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('training_data')
        .update({
          is_validated: isValid,
          validation_notes: notes
        })
        .eq('id', dataId);

      if (error) throw error;
    } catch (error) {
      console.error('Error validating training data:', error);
      throw new Error('Failed to validate training data');
    }
  }

  /**
   * Execute training job (mock implementation)
   */
  private async executeTrainingJob(jobId: string, request: ModelTrainingRequest): Promise<void> {
    const job = this.trainingJobs.get(jobId);
    if (!job) return;

    try {
      // Update job status to running
      job.status = 'running';
      job.startTime = new Date();
      job.progress = 0;

      // Simulate training progress
      const epochs = request.trainingConfig.epochs || 10;
      const trainingHistory: TrainingEpoch[] = [];

      for (let epoch = 1; epoch <= epochs; epoch++) {
        // Simulate training epoch
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for simulation

        const trainingLoss = 1.0 - (epoch / epochs) * 0.7 + Math.random() * 0.1;
        const validationLoss = 1.0 - (epoch / epochs) * 0.6 + Math.random() * 0.15;
        const trainingAccuracy = (epoch / epochs) * 0.8 + Math.random() * 0.1;
        const validationAccuracy = (epoch / epochs) * 0.75 + Math.random() * 0.1;

        trainingHistory.push({
          epoch,
          trainingLoss,
          validationLoss,
          trainingAccuracy,
          validationAccuracy,
          learningRate: request.trainingConfig.learningRate || 0.001,
          duration: 100 + Math.random() * 50
        });

        job.progress = (epoch / epochs) * 100;
      }

      // Create model after training
      const modelId = await this.createModel(
        `${request.modelType}_${Date.now()}`,
        request.modelType,
        '1.0.0',
        `Trained model for ${request.modelType}`,
        {
          algorithm: 'random_forest', // Mock algorithm
          hyperparameters: request.trainingConfig,
          featureColumns: request.datasetConfig.featureColumns,
          targetColumn: request.datasetConfig.targetColumn,
          preprocessingSteps: [],
          validationStrategy: {
            method: 'cross_validation',
            parameters: {}
          }
        },
        request.trainingConfig
      );

      // Generate mock performance metrics
      const performanceMetrics = this.generateMockPerformance(modelId);

      // Complete training job
      job.status = 'completed';
      job.endTime = new Date();
      job.progress = 100;
      job.results = {
        modelId,
        performanceMetrics,
        trainingHistory,
        validationResults: {
          accuracy: performanceMetrics.accuracy || 0.85,
          precision: performanceMetrics.precision || 0.83,
          recall: performanceMetrics.recall || 0.87,
          f1Score: performanceMetrics.f1Score || 0.85,
          aucRoc: performanceMetrics.aucRoc || 0.89,
          confusionMatrix: performanceMetrics.confusionMatrix || {
            truePositive: 85,
            falsePositive: 12,
            trueNegative: 88,
            falseNegative: 15
          },
          classificationReport: {
            classes: ['No-Show', 'Show'],
            precision: [0.83, 0.87],
            recall: [0.87, 0.83],
            f1Score: [0.85, 0.85],
            support: [100, 100]
          }
        },
        featureImportance: performanceMetrics.featureImportance || []
      };

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
    }
  }

  /**
   * Generate mock performance metrics
   */
  private generateMockPerformance(modelId: string): PerformanceMetrics {
    return {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.83 + Math.random() * 0.1,
      recall: 0.87 + Math.random() * 0.08,
      f1Score: 0.85 + Math.random() * 0.09,
      aucRoc: 0.89 + Math.random() * 0.06,
      confusionMatrix: {
        truePositive: Math.floor(80 + Math.random() * 20),
        falsePositive: Math.floor(10 + Math.random() * 10),
        trueNegative: Math.floor(85 + Math.random() * 15),
        falseNegative: Math.floor(12 + Math.random() * 8)
      },
      featureImportance: [
        { feature: 'previous_no_shows', importance: 0.25, rank: 1 },
        { feature: 'appointment_hour', importance: 0.18, rank: 2 },
        { feature: 'days_since_last_appointment', importance: 0.15, rank: 3 },
        { feature: 'patient_age', importance: 0.12, rank: 4 },
        { feature: 'day_of_week', importance: 0.10, rank: 5 },
        { feature: 'weather_conditions', importance: 0.08, rank: 6 },
        { feature: 'appointment_type', importance: 0.07, rank: 7 },
        { feature: 'insurance_type', importance: 0.05, rank: 8 }
      ],
      lastEvaluated: new Date()
    };
  }

  /**
   * Get default training configuration
   */
  private getDefaultTrainingConfig(): TrainingConfiguration {
    return {
      datasetSize: 1000,
      trainingRatio: 0.8,
      validationRatio: 0.1,
      testRatio: 0.1,
      epochs: 10,
      batchSize: 32,
      learningRate: 0.001,
      earlyStoppingConfig: {
        enabled: true,
        patience: 5,
        minDelta: 0.001,
        metric: 'accuracy'
      }
    };
  }

  /**
   * Get default deployment configuration
   */
  private getDefaultDeploymentConfig(): DeploymentConfiguration {
    return {
      environment: 'development',
      scalingConfig: {
        minInstances: 1,
        maxInstances: 5,
        targetCPUUtilization: 70,
        targetMemoryUtilization: 80
      },
      monitoringConfig: {
        enableMetrics: true,
        enableLogging: true,
        alertThresholds: {
          accuracyDrop: 0.05,
          latencyThreshold: 2000,
          errorRateThreshold: 0.05
        }
      },
      rollbackConfig: {
        enabled: true,
        triggerConditions: ['accuracy_drop', 'high_error_rate']
      }
    };
  }

  /**
   * Map database record to MLModel interface
   */
  private mapDatabaseToModel(data: any): MLModel {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      version: data.version,
      description: data.description,
      modelData: data.model_data || {},
      performanceMetrics: data.performance_metrics || { lastEvaluated: new Date() },
      trainingConfig: data.training_config || this.getDefaultTrainingConfig(),
      deploymentConfig: data.deployment_config || this.getDefaultDeploymentConfig(),
      isActive: data.is_active,
      isDeployed: data.is_deployed,
      modelFilePath: data.model_file_path,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Export singleton instance
export const mlPipelineService = new MLPipelineService();