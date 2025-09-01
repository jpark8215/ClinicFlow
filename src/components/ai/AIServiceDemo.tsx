import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, FileText, Shield, Calendar } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { mlPipelineService } from '@/services/mlPipelineService';
import {
  NoShowPredictionInput,
  OCRProcessingInput,
  AuthorizationRecommendationInput,
  SchedulingOptimizationInput,
  NoShowPrediction,
  OCRResult,
  AuthorizationRecommendation,
  SchedulingOptimization,
  ModelType
} from '@/types/aiml';

export const AIServiceDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // No-Show Prediction Demo
  const [noShowInput, setNoShowInput] = useState<Partial<NoShowPredictionInput>>({
    appointmentId: 'apt-demo-001',
    patientId: 'pat-demo-001',
    appointmentTime: new Date('2025-02-01T10:00:00Z'),
    appointmentType: 'routine',
    providerId: 'prov-001',
    patientAge: 35,
    patientGender: 'female',
    previousNoShows: 1,
    previousAppointments: 5,
    daysSinceLastAppointment: 90,
    appointmentDayOfWeek: 6, // Saturday
    appointmentHour: 10,
    remindersSent: 1
  });

  // OCR Processing Demo
  const [ocrInput, setOcrInput] = useState<Partial<OCRProcessingInput>>({
    documentId: 'doc-demo-001',
    documentType: 'intake_form',
    imageData: 'demo-base64-data',
    processingOptions: {
      language: 'en',
      detectOrientation: true,
      extractTables: false,
      extractSignatures: true,
      confidenceThreshold: 0.8
    }
  });

  // Authorization Recommendation Demo
  const [authInput, setAuthInput] = useState<Partial<AuthorizationRecommendationInput>>({
    patientId: 'pat-demo-001',
    procedureCode: 'CPT-93000',
    diagnosisCode: 'ICD-I25.9',
    providerId: 'prov-001',
    insuranceType: 'Blue Cross Blue Shield',
    patientHistory: {
      previousAuthorizations: [
        {
          procedureCode: 'CPT-93005',
          status: 'approved',
          date: new Date('2024-06-01'),
          insuranceType: 'Blue Cross Blue Shield'
        }
      ],
      medicalHistory: [
        {
          condition: 'Coronary Artery Disease',
          diagnosisDate: new Date('2023-01-01'),
          severity: 'moderate',
          isActive: true
        }
      ],
      currentMedications: [
        {
          name: 'Atorvastatin',
          dosage: '20mg',
          frequency: 'daily',
          startDate: new Date('2023-01-01')
        }
      ],
      allergies: ['Penicillin']
    },
    procedureDetails: {
      procedureName: 'Electrocardiogram',
      urgency: 'routine',
      estimatedCost: 150,
      alternativeProcedures: ['Echocardiogram']
    }
  });

  const handleNoShowPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const prediction = await aiService.predictNoShowRisk(noShowInput as NoShowPredictionInput);
      setResults({ type: 'no_show', data: prediction });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict no-show risk');
    } finally {
      setLoading(false);
    }
  };

  const handleOCRProcessing = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.processDocument(ocrInput as OCRProcessingInput);
      setResults({ type: 'ocr', data: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const recommendation = await aiService.recommendAuthorization(authInput as AuthorizationRecommendationInput);
      setResults({ type: 'auth', data: recommendation });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get authorization recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      const optimizationInput: SchedulingOptimizationInput = {
        providerId: 'prov-001',
        dateRange: {
          startDate: new Date('2025-02-01T08:00:00Z'),
          endDate: new Date('2025-02-01T17:00:00Z')
        },
        appointmentRequests: [
          {
            patientId: 'pat-1',
            appointmentType: 'routine',
            duration: 30,
            priority: 'medium',
            preferredTimes: [
              {
                startTime: new Date('2025-02-01T09:00:00Z'),
                endTime: new Date('2025-02-01T09:30:00Z'),
                preference: 8
              }
            ],
            noShowRisk: 0.2
          },
          {
            patientId: 'pat-2',
            appointmentType: 'urgent',
            duration: 45,
            priority: 'high',
            preferredTimes: [
              {
                startTime: new Date('2025-02-01T10:00:00Z'),
                endTime: new Date('2025-02-01T10:45:00Z'),
                preference: 9
              }
            ],
            noShowRisk: 0.1
          }
        ],
        constraints: {
          workingHours: { start: '08:00', end: '17:00' },
          breakTimes: [
            {
              startTime: new Date('2025-02-01T12:00:00Z'),
              endTime: new Date('2025-02-01T13:00:00Z'),
              preference: 0
            }
          ],
          blockedTimes: [],
          maxConsecutiveAppointments: 8,
          bufferTime: 15
        },
        preferences: {
          prioritizeHighRisk: false,
          balanceWorkload: true,
          minimizeGaps: true,
          considerPatientPreferences: true,
          overbookingAllowed: false
        }
      };

      const optimization = await aiService.optimizeSchedule(optimizationInput);
      setResults({ type: 'schedule', data: optimization });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize schedule');
    } finally {
      setLoading(false);
    }
  };

  const renderNoShowResults = (prediction: NoShowPrediction) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={prediction.riskLevel === 'high' ? 'destructive' : prediction.riskLevel === 'medium' ? 'default' : 'secondary'}>
          {prediction.riskLevel.toUpperCase()} RISK
        </Badge>
        <span className="text-sm text-muted-foreground">
          {Math.round(prediction.riskScore * 100)}% probability
        </span>
      </div>
      
      <Progress value={prediction.riskScore * 100} className="w-full" />
      
      <div>
        <h4 className="font-medium mb-2">Risk Factors:</h4>
        <ul className="space-y-1">
          {prediction.factors.map((factor, index) => (
            <li key={index} className="text-sm flex justify-between">
              <span>{factor.description}</span>
              <span className="text-muted-foreground">+{Math.round(factor.impact * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-medium mb-2">Recommended Interventions:</h4>
        <ul className="space-y-1">
          {prediction.interventions.map((intervention, index) => (
            <li key={index} className="text-sm">
              <Badge variant="outline" className="mr-2">{intervention.type}</Badge>
              {intervention.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderOCRResults = (result: OCRResult) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {Math.round(result.confidence * 100)}% Confidence
        </Badge>
        <span className="text-sm text-muted-foreground">
          {result.processingTime}ms processing time
        </span>
      </div>

      <div>
        <h4 className="font-medium mb-2">Extracted Fields:</h4>
        <div className="space-y-2">
          {result.extractedFields.map((field, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="font-medium">{field.fieldName}:</span>
              <span>{field.fieldValue}</span>
              <Badge variant="outline">{Math.round(field.confidence * 100)}%</Badge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Extracted Text:</h4>
        <Textarea 
          value={result.extractedText} 
          readOnly 
          className="min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderAuthResults = (recommendation: AuthorizationRecommendation) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={recommendation.approvalProbability > 0.7 ? 'default' : 'destructive'}>
          {Math.round(recommendation.approvalProbability * 100)}% Approval Probability
        </Badge>
        <Badge variant="outline">
          {recommendation.recommendedApproach.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <div>
        <h4 className="font-medium mb-2">Required Documentation:</h4>
        <ul className="space-y-1">
          {recommendation.requiredDocumentation.map((doc, index) => (
            <li key={index} className="text-sm flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              {doc}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-medium mb-2">Timeline:</h4>
        <p className="text-sm">{recommendation.timelineEstimate} business days</p>
      </div>

      {recommendation.alternativeOptions.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Alternative Options:</h4>
          <div className="space-y-2">
            {recommendation.alternativeOptions.map((option, index) => (
              <div key={index} className="p-2 bg-muted rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{option.procedureName}</span>
                  <Badge variant="secondary">
                    {Math.round(option.approvalProbability * 100)}% approval
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduleResults = (optimization: SchedulingOptimization) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-muted rounded">
          <div className="text-sm text-muted-foreground">Utilization Rate</div>
          <div className="text-2xl font-bold">{Math.round(optimization.utilizationRate * 100)}%</div>
        </div>
        <div className="p-3 bg-muted rounded">
          <div className="text-sm text-muted-foreground">Expected Revenue</div>
          <div className="text-2xl font-bold">${optimization.revenueEstimate.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Optimized Schedule:</h4>
        <div className="space-y-2">
          {optimization.optimizedSchedule.map((appointment, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
              <span>Patient {appointment.patientId}</span>
              <span>{appointment.scheduledTime.toLocaleTimeString()}</span>
              <Badge variant="outline">{appointment.duration}min</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Expected no-shows: {Math.round(optimization.expectedNoShows)} | 
        Conflicts resolved: {optimization.conflictsResolved}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-8 h-8" />
          AI Service Demo
        </h1>
        <p className="text-muted-foreground">
          Explore ClinicFlow's AI-powered features for healthcare operations
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="no-show" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="no-show" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            No-Show Prediction
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            OCR Processing
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Authorization
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="no-show" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>No-Show Risk Prediction</CardTitle>
              <CardDescription>
                Predict the likelihood of a patient not showing up for their appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient-age">Patient Age</Label>
                  <Input
                    id="patient-age"
                    type="number"
                    value={noShowInput.patientAge || ''}
                    onChange={(e) => setNoShowInput(prev => ({ ...prev, patientAge: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="previous-no-shows">Previous No-Shows</Label>
                  <Input
                    id="previous-no-shows"
                    type="number"
                    value={noShowInput.previousNoShows || ''}
                    onChange={(e) => setNoShowInput(prev => ({ ...prev, previousNoShows: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleNoShowPrediction} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Predict No-Show Risk
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OCR Document Processing</CardTitle>
              <CardDescription>
                Extract text and structured data from medical documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Input
                  id="document-type"
                  value={ocrInput.documentType || ''}
                  onChange={(e) => setOcrInput(prev => ({ ...prev, documentType: e.target.value }))}
                />
              </div>
              
              <Button onClick={handleOCRProcessing} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Process Document
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prior Authorization Recommendation</CardTitle>
              <CardDescription>
                Get AI-powered recommendations for prior authorization requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="procedure-code">Procedure Code</Label>
                  <Input
                    id="procedure-code"
                    value={authInput.procedureCode || ''}
                    onChange={(e) => setAuthInput(prev => ({ ...prev, procedureCode: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="insurance-type">Insurance Type</Label>
                  <Input
                    id="insurance-type"
                    value={authInput.insuranceType || ''}
                    onChange={(e) => setAuthInput(prev => ({ ...prev, insuranceType: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleAuthRecommendation} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Get Authorization Recommendation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Optimization</CardTitle>
              <CardDescription>
                Optimize appointment scheduling using AI algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This demo will optimize a sample schedule with 2 appointment requests for February 1st, 2025.
              </p>
              
              <Button onClick={handleScheduleOptimization} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Optimize Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.type === 'no_show' && renderNoShowResults(results.data)}
            {results.type === 'ocr' && renderOCRResults(results.data)}
            {results.type === 'auth' && renderAuthResults(results.data)}
            {results.type === 'schedule' && renderScheduleResults(results.data)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};