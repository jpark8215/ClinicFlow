import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  Brain, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Upload, 
  Download,
  Settings,
  BarChart3,
  Trash2
} from 'lucide-react';
import { mlPipelineService } from '@/services/mlPipelineService';
import {
  MLModel,
  ModelTrainingJob,
  ModelPerformance,
  TrainingData,
  ModelType,
  ModelTrainingRequest,
  ModelFilters
} from '@/types/aiml';

export const MLPipelineManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<MLModel[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<ModelTrainingJob[]>([]);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<ModelPerformance[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Model creation form
  const [newModel, setNewModel] = useState({
    name: '',
    type: 'no_show_prediction' as ModelType,
    version: '1.0.0',
    description: ''
  });

  // Training configuration
  const [trainingConfig, setTrainingConfig] = useState({
    datasetSize: 1000,
    trainingRatio: 0.8,
    validationRatio: 0.1,
    testRatio: 0.1,
    epochs: 10,
    batchSize: 32,
    learningRate: 0.001
  });

  // Filters
  const [filters, setFilters] = useState<ModelFilters>({
    type: undefined,
    isActive: undefined,
    isDeployed: undefined
  });

  useEffect(() => {
    loadModels();
    loadTrainingJobs();
  }, [filters]);

  useEffect(() => {
    if (selectedModel) {
      loadPerformanceHistory(selectedModel.id);
    }
  }, [selectedModel]);

  const loadModels = async () => {
    try {
      const modelList = await mlPipelineService.getModels(filters);
      setModels(modelList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    }
  };

  const loadTrainingJobs = async () => {
    try {
      const jobs = await mlPipelineService.getTrainingJobs();
      setTrainingJobs(jobs);
    } catch (err) {
      console.error('Failed to load training jobs:', err);
    }
  };

  const loadPerformanceHistory = async (modelId: string) => {
    try {
      const history = await mlPipelineService.getModelPerformanceHistory(modelId);
      setPerformanceHistory(history);
    } catch (err) {
      console.error('Failed to load performance history:', err);
    }
  };

  const handleCreateModel = async () => {
    setLoading(true);
    setError(null);
    try {
      await mlPipelineService.createModel(
        newModel.name,
        newModel.type,
        newModel.version,
        newModel.description
      );
      setNewModel({ name: '', type: 'no_show_prediction', version: '1.0.0', description: '' });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedModel) return;

    setLoading(true);
    setError(null);
    try {
      const trainingRequest: ModelTrainingRequest = {
        modelType: selectedModel.type,
        trainingConfig,
        datasetConfig: {
          dataSource: 'appointments_table',
          featureColumns: ['age', 'previous_no_shows', 'appointment_hour', 'day_of_week'],
          targetColumn: 'no_show'
        },
        validationConfig: {
          method: 'cross_validation',
          folds: 5,
          metrics: ['accuracy', 'precision', 'recall', 'f1_score']
        }
      };

      await mlPipelineService.startTraining(trainingRequest);
      await loadTrainingJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployModel = async (modelId: string) => {
    setLoading(true);
    setError(null);
    try {
      await mlPipelineService.deployModel(modelId);
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy model');
    } finally {
      setLoading(false);
    }
  };

  const handleUndeployModel = async (modelId: string) => {
    setLoading(true);
    setError(null);
    try {
      await mlPipelineService.undeployModel(modelId);
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to undeploy model');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateModel = async (modelId: string) => {
    setLoading(true);
    setError(null);
    try {
      await mlPipelineService.evaluateModel(modelId);
      await loadPerformanceHistory(modelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate model');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    setLoading(true);
    setError(null);
    try {
      await mlPipelineService.deleteModel(modelId);
      await loadModels();
      if (selectedModel?.id === modelId) {
        setSelectedModel(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'queued': 'secondary',
      'running': 'default',
      'completed': 'default',
      'failed': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Pause className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-8 h-8" />
          ML Pipeline Manager
        </h1>
        <p className="text-muted-foreground">
          Manage machine learning models, training, and deployment
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="training">Training Jobs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="create">Create Model</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Management</CardTitle>
              <CardDescription>
                View and manage your machine learning models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    type: value === 'all' ? undefined : value as ModelType 
                  }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="no_show_prediction">No-Show Prediction</SelectItem>
                    <SelectItem value="scheduling_optimization">Scheduling Optimization</SelectItem>
                    <SelectItem value="authorization_recommendation">Authorization Recommendation</SelectItem>
                    <SelectItem value="ocr_extraction">OCR Extraction</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    isActive: value === 'all' ? undefined : value === 'true' 
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Models Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deployed</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow 
                      key={model.id}
                      className={selectedModel?.id === model.id ? 'bg-muted' : ''}
                      onClick={() => setSelectedModel(model)}
                    >
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>{model.type.replace('_', ' ')}</TableCell>
                      <TableCell>{model.version}</TableCell>
                      <TableCell>
                        <Badge variant={model.isActive ? 'default' : 'secondary'}>
                          {model.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.isDeployed ? 'default' : 'outline'}>
                          {model.isDeployed ? 'Deployed' : 'Not Deployed'}
                        </Badge>
                      </TableCell>
                      <TableCell>{model.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {model.isDeployed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUndeployModel(model.id);
                              }}
                              disabled={loading}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeployModel(model.id);
                              }}
                              disabled={loading}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEvaluateModel(model.id);
                            }}
                            disabled={loading}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModel(model.id);
                            }}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {models.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No models found. Create your first model to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {selectedModel && (
            <Card>
              <CardHeader>
                <CardTitle>Model Details: {selectedModel.name}</CardTitle>
                <CardDescription>{selectedModel.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm">{selectedModel.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label>Version</Label>
                    <p className="text-sm">{selectedModel.version}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedModel.isActive ? 'default' : 'secondary'}>
                      {selectedModel.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <Label>Deployment</Label>
                    <Badge variant={selectedModel.isDeployed ? 'default' : 'outline'}>
                      {selectedModel.isDeployed ? 'Deployed' : 'Not Deployed'}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleStartTraining} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Settings className="w-4 h-4 mr-2" />
                    Start Training
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleEvaluateModel(selectedModel.id)}
                    disabled={loading}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Evaluate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Jobs</CardTitle>
              <CardDescription>
                Monitor active and completed training jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Model Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">
                        {job.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{job.modelType.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          {getStatusBadge(job.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={job.progress} className="w-20" />
                          <span className="text-sm">{Math.round(job.progress)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.startTime ? job.startTime.toLocaleString() : 'Not started'}
                      </TableCell>
                      <TableCell>
                        {job.startTime && job.endTime ? (
                          `${Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s`
                        ) : job.startTime ? (
                          `${Math.round((Date.now() - job.startTime.getTime()) / 1000)}s`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {trainingJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No training jobs found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {selectedModel ? (
            <Card>
              <CardHeader>
                <CardTitle>Performance History: {selectedModel.name}</CardTitle>
                <CardDescription>
                  Track model performance metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Precision</TableHead>
                      <TableHead>Recall</TableHead>
                      <TableHead>F1 Score</TableHead>
                      <TableHead>AUC-ROC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceHistory.map((perf) => (
                      <TableRow key={perf.id}>
                        <TableCell>{perf.evaluationDate.toLocaleDateString()}</TableCell>
                        <TableCell>{(perf.accuracy * 100).toFixed(1)}%</TableCell>
                        <TableCell>
                          {perf.precisionScore ? (perf.precisionScore * 100).toFixed(1) + '%' : '-'}
                        </TableCell>
                        <TableCell>
                          {perf.recall ? (perf.recall * 100).toFixed(1) + '%' : '-'}
                        </TableCell>
                        <TableCell>
                          {perf.f1Score ? (perf.f1Score * 100).toFixed(1) + '%' : '-'}
                        </TableCell>
                        <TableCell>
                          {perf.aucRoc ? (perf.aucRoc * 100).toFixed(1) + '%' : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {performanceHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available. Run an evaluation to see metrics.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Select a model from the Models tab to view its performance history.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Model</CardTitle>
              <CardDescription>
                Create a new machine learning model for training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model-name">Model Name</Label>
                  <Input
                    id="model-name"
                    value={newModel.name}
                    onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter model name"
                  />
                </div>
                <div>
                  <Label htmlFor="model-version">Version</Label>
                  <Input
                    id="model-version"
                    value={newModel.version}
                    onChange={(e) => setNewModel(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="model-type">Model Type</Label>
                <Select
                  value={newModel.type}
                  onValueChange={(value) => setNewModel(prev => ({ ...prev, type: value as ModelType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_show_prediction">No-Show Prediction</SelectItem>
                    <SelectItem value="scheduling_optimization">Scheduling Optimization</SelectItem>
                    <SelectItem value="authorization_recommendation">Authorization Recommendation</SelectItem>
                    <SelectItem value="ocr_extraction">OCR Extraction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model-description">Description</Label>
                <Textarea
                  id="model-description"
                  value={newModel.description}
                  onChange={(e) => setNewModel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the model's purpose and functionality"
                />
              </div>

              <Button 
                onClick={handleCreateModel} 
                disabled={loading || !newModel.name}
                className="w-full"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Upload className="w-4 h-4 mr-2" />
                Create Model
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Configuration</CardTitle>
              <CardDescription>
                Configure training parameters for new models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="epochs">Epochs</Label>
                  <Input
                    id="epochs"
                    type="number"
                    value={trainingConfig.epochs}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      epochs: parseInt(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={trainingConfig.batchSize}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      batchSize: parseInt(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="learning-rate">Learning Rate</Label>
                  <Input
                    id="learning-rate"
                    type="number"
                    step="0.001"
                    value={trainingConfig.learningRate}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      learningRate: parseFloat(e.target.value) 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="training-ratio">Training Ratio</Label>
                  <Input
                    id="training-ratio"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={trainingConfig.trainingRatio}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      trainingRatio: parseFloat(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="validation-ratio">Validation Ratio</Label>
                  <Input
                    id="validation-ratio"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={trainingConfig.validationRatio}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      validationRatio: parseFloat(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="test-ratio">Test Ratio</Label>
                  <Input
                    id="test-ratio"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={trainingConfig.testRatio}
                    onChange={(e) => setTrainingConfig(prev => ({ 
                      ...prev, 
                      testRatio: parseFloat(e.target.value) 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};