import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';
import { realTimeRiskAssessmentService } from '@/services/realTimeRiskAssessment';
import { riskFactorAnalysisService } from '@/services/riskFactorAnalysis';
import { NoShowPredictionInput, NoShowPrediction } from '@/types/aiml';
import RiskFactorExplanation from './RiskFactorExplanation';

/**
 * Demo component to showcase real-time risk assessment capabilities
 */
export const RiskAssessmentDemo: React.FC = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<NoShowPrediction | null>(null);
  const [demoInput, setDemoInput] = useState<NoShowPredictionInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate demo appointment data
  const generateDemoData = (): NoShowPredictionInput => {
    const appointmentTime = new Date();
    appointmentTime.setDate(appointmentTime.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now
    appointmentTime.setHours(8 + Math.floor(Math.random() * 10)); // 8 AM - 6 PM

    const scenarios = [
      // High risk scenario
      {
        patientAge: 28,
        patientGender: 'male',
        previousNoShows: 3,
        previousAppointments: 6,
        daysSinceLastAppointment: 45,
        insuranceType: 'medicaid',
        distanceToClinic: 35,
        remindersSent: 0,
        weatherConditions: {
          temperature: 25,
          precipitation: 1.5,
          windSpeed: 25,
          conditions: 'rainy'
        }
      },
      // Medium risk scenario
      {
        patientAge: 45,
        patientGender: 'female',
        previousNoShows: 1,
        previousAppointments: 8,
        daysSinceLastAppointment: 60,
        insuranceType: 'private',
        distanceToClinic: 18,
        remindersSent: 1,
        weatherConditions: {
          temperature: 75,
          precipitation: 0.1,
          windSpeed: 10,
          conditions: 'cloudy'
        }
      },
      // Low risk scenario
      {
        patientAge: 55,
        patientGender: 'female',
        previousNoShows: 0,
        previousAppointments: 12,
        daysSinceLastAppointment: 30,
        insuranceType: 'medicare',
        distanceToClinic: 8,
        remindersSent: 2,
        weatherConditions: {
          temperature: 72,
          precipitation: 0,
          windSpeed: 5,
          conditions: 'sunny'
        }
      }
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    return {
      appointmentId: `demo-apt-${Date.now()}`,
      patientId: `demo-pat-${Date.now()}`,
      appointmentTime,
      appointmentType: ['routine', 'follow-up', 'consultation'][Math.floor(Math.random() * 3)],
      providerId: 'demo-provider',
      appointmentDayOfWeek: appointmentTime.getDay(),
      appointmentHour: appointmentTime.getHours(),
      ...scenario
    };
  };

  // Simulate risk calculation using the ML service
  const calculateDemoRisk = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const input = generateDemoData();
      setDemoInput(input);

      // Simulate ML prediction based on input characteristics
      let riskScore = 0.15; // Base risk

      // Adjust based on historical behavior
      if (input.previousAppointments > 0) {
        const historicalRate = input.previousNoShows / input.previousAppointments;
        riskScore += historicalRate * 0.4;
      }

      // Adjust based on other factors
      if (input.appointmentHour < 9 || input.appointmentHour > 16) riskScore += 0.1;
      if (input.distanceToClinic && input.distanceToClinic > 20) riskScore += 0.15;
      if (input.insuranceType === 'medicaid' || input.insuranceType === 'self-pay') riskScore += 0.2;
      if (input.remindersSent === 0) riskScore += 0.1;
      if (input.weatherConditions && input.weatherConditions.precipitation > 0.5) riskScore += 0.15;

      riskScore = Math.min(riskScore, 0.95); // Cap at 95%

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 0.7) riskLevel = 'high';
      else if (riskScore >= 0.3) riskLevel = 'medium';

      // Generate mock features for risk factor analysis
      const features = [
        input.appointmentDayOfWeek / 6,
        input.appointmentHour / 23,
        [0, 6].includes(input.appointmentDayOfWeek) ? 1 : 0,
        input.appointmentHour < 9 ? 1 : 0,
        input.appointmentHour > 16 ? 1 : 0,
        Math.random() * 0.5,
        Math.random() * 0.5,
        input.patientAge / 100,
        input.patientGender === 'male' ? 1 : 0,
        input.previousAppointments > 0 ? input.previousNoShows / input.previousAppointments : 0,
        Math.random() * 0.5,
        input.weatherConditions ? (input.weatherConditions.precipitation + input.weatherConditions.windSpeed / 30) / 2 : 0.5,
        input.distanceToClinic ? Math.min(input.distanceToClinic / 50, 1) : 0.5,
        input.remindersSent > 0 ? 0.8 : 0.2,
        input.insuranceType === 'medicaid' || input.insuranceType === 'self-pay' ? 0.8 : 0.3,
        input.remindersSent / 3
      ];

      // Generate risk factors using the analysis service
      const riskFactors = riskFactorAnalysisService.generateRiskFactorExplanations(
        input,
        riskScore,
        features
      );

      // Generate recommendations
      const recommendations = [
        'Send appointment reminder 24 hours before',
        'Consider calling patient to confirm attendance',
        'Offer alternative appointment times if needed'
      ];

      if (riskLevel === 'high') {
        recommendations.unshift('Send multiple reminders via phone, text, and email');
        recommendations.push('Consider overbooking this time slot');
      }

      const prediction: NoShowPrediction = {
        result: riskScore,
        riskScore,
        riskLevel,
        probability: riskScore,
        factors: riskFactors,
        recommendations,
        interventions: [
          {
            type: 'reminder',
            description: 'Send appointment reminder',
            priority: 1,
            estimatedImpact: 0.15
          },
          {
            type: 'confirmation',
            description: 'Call patient to confirm',
            priority: 2,
            estimatedImpact: 0.25
          }
        ],
        explanation: `This appointment has a ${Math.round(riskScore * 100)}% predicted no-show risk. ${
          riskLevel === 'high' ? 'Immediate intervention recommended.' :
          riskLevel === 'medium' ? 'Monitor and send reminders.' :
          'Standard appointment management is sufficient.'
        }`
      };

      setRiskAssessment(prediction);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during risk calculation');
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate on component mount
  useEffect(() => {
    calculateDemoRisk();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Risk Assessment Demo</h2>
          <p className="text-gray-600">Experience AI-powered no-show prediction and risk factor analysis</p>
        </div>
        <Button 
          onClick={calculateDemoRisk} 
          disabled={isCalculating}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
          <span>{isCalculating ? 'Calculating...' : 'New Assessment'}</span>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Demo Scenario Info */}
      {demoInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Demo Appointment Scenario</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Patient Age:</span>
                <p>{demoInput.patientAge} years old</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Appointment:</span>
                <p>{demoInput.appointmentTime.toLocaleDateString()} at {demoInput.appointmentTime.toLocaleTimeString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">History:</span>
                <p>{demoInput.previousNoShows}/{demoInput.previousAppointments} no-shows</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Distance:</span>
                <p>{demoInput.distanceToClinic} miles</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Insurance:</span>
                <p className="capitalize">{demoInput.insuranceType}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reminders:</span>
                <p>{demoInput.remindersSent} sent</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Weather:</span>
                <p className="capitalize">{demoInput.weatherConditions?.conditions}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <p className="capitalize">{demoInput.appointmentType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment Results */}
      {riskAssessment && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {getRiskIcon(riskAssessment.riskLevel)}
                  <span>Risk Assessment Result</span>
                </CardTitle>
                <Badge className={getRiskColor(riskAssessment.riskLevel)}>
                  {Math.round(riskAssessment.riskScore * 100)}% No-Show Risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Risk Level: {riskAssessment.riskLevel.toUpperCase()}</span>
                      <span className="text-sm text-gray-600">{Math.round(riskAssessment.riskScore * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          riskAssessment.riskLevel === 'high' ? 'bg-red-500' :
                          riskAssessment.riskLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${riskAssessment.riskScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {riskAssessment.explanation && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>{riskAssessment.explanation}</AlertDescription>
                  </Alert>
                )}

                {/* Quick Recommendations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Immediate Recommendations</h4>
                  <ul className="space-y-1">
                    {riskAssessment.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Risk Factor Analysis */}
          {demoInput && (
            <RiskFactorExplanation 
              prediction={riskAssessment}
              input={demoInput}
            />
          )}
        </div>
      )}

      {/* Loading State */}
      {isCalculating && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Calculating Risk Assessment</h3>
            <p className="text-gray-600">Analyzing appointment factors and generating predictions...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiskAssessmentDemo;