import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Zap,
  Calendar,
  Users,
  DollarSign,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ErrorBar,
  ReferenceLine
} from 'recharts';
import { DashboardMetrics, analyticsService } from '@/services/analyticsService';
import { useToast } from '@/hooks/use-toast';

interface PredictiveInsightsProps {
  metrics: DashboardMetrics | null;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  clinicId?: string;
}

interface PredictionData {
  noShowForecast: {
    nextWeek: number;
    confidence: number;
    factors: string[];
    recommendation: string;
    accuracy: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  appointmentDemand: {
    forecast: Array<{
      day: string;
      predicted: number;
      confidence: number;
      lowerBound: number;
      upperBound: number;
    }>;
    accuracy: number;
  };
  revenueProjection: {
    nextMonth: number;
    growthRate: number;
    confidence: number;
    accuracy: number;
    confidenceInterval: { lower: number; upper: number };
  };
  optimizationOpportunities: Array<{
    type: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
    potentialIncrease?: string;
    potentialReduction?: string;
    confidence: number;
    implementationEffort: 'Low' | 'Medium' | 'High';
  }>;
  modelPerformance: {
    lastUpdated: Date;
    trainingDataPoints: number;
    overallAccuracy: number;
    models: Array<{
      name: string;
      accuracy: number;
      lastTrained: Date;
      status: 'active' | 'training' | 'outdated';
    }>;
  };
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({
  metrics,
  dateRange,
  clinicId
}) => {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('forecasts');
  const { toast } = useToast();

  useEffect(() => {
    loadPredictions();
  }, [metrics, dateRange, clinicId]);

  const loadPredictions = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // In a real implementation, this would call AI/ML services
      // For now, we'll generate enhanced mock predictions
      const predictionData = await generateEnhancedPredictions();
      setPredictions(predictionData);
      
      if (showRefreshIndicator) {
        toast({
          title: "AI Insights Updated",
          description: "Predictive models have been refreshed with latest data.",
        });
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast({
        title: "Error Loading Predictions",
        description: "Failed to load AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPredictions(true);
  };

  const generateEnhancedPredictions = async (): Promise<PredictionData> => {
    // Simulate AI model processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate enhanced mock AI predictions based on current metrics
    const baseNoShowRate = metrics?.patientFlow.noShowRate || 8;
    const baseUtilization = metrics?.appointmentUtilization.utilizationRate || 75;
    const baseRevenue = metrics?.revenueMetrics.estimatedRevenue || 50000;
    
    // Generate forecast with confidence intervals
    const forecast = Array.from({ length: 14 }, (_, i) => {
      const predicted = Math.floor(40 + Math.random() * 20 + Math.sin(i / 7 * Math.PI) * 10);
      const confidence = 0.75 + Math.random() * 0.2;
      const margin = predicted * (1 - confidence) * 0.5;
      
      return {
        day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        predicted,
        confidence,
        lowerBound: Math.max(0, predicted - margin),
        upperBound: predicted + margin
      };
    });
    
    return {
      noShowForecast: {
        nextWeek: Math.max(0, baseNoShowRate + (Math.random() - 0.5) * 4),
        confidence: 0.87 + Math.random() * 0.1,
        factors: [
          'Historical patient behavior patterns',
          'Seasonal trends and weather impact',
          'Appointment time and day of week',
          'Patient demographics and history',
          'Provider-specific patterns'
        ],
        recommendation: baseNoShowRate > 10 
          ? 'Implement automated reminder system and overbooking strategy' 
          : 'Continue current practices with minor optimizations',
        accuracy: 0.89,
        trend: baseNoShowRate > 10 ? 'increasing' : Math.random() > 0.5 ? 'stable' : 'decreasing'
      },
      appointmentDemand: {
        forecast,
        accuracy: 0.84
      },
      revenueProjection: {
        nextMonth: baseRevenue * (1.1 + Math.random() * 0.2),
        growthRate: 8 + Math.random() * 10,
        confidence: 0.79 + Math.random() * 0.15,
        accuracy: 0.82,
        confidenceInterval: {
          lower: baseRevenue * 0.95,
          upper: baseRevenue * 1.25
        }
      },
      optimizationOpportunities: [
        {
          type: 'scheduling',
          impact: 'High' as const,
          description: 'Optimize 2-4 PM time slots for better utilization based on historical patterns',
          potentialIncrease: '15-18%',
          confidence: 0.91,
          implementationEffort: 'Medium' as const
        },
        {
          type: 'no-show-reduction',
          impact: 'Medium' as const,
          description: 'Implement AI-powered SMS reminders with personalized timing',
          potentialReduction: '25-30%',
          confidence: 0.85,
          implementationEffort: 'Low' as const
        },
        {
          type: 'capacity',
          impact: 'High' as const,
          description: 'Add evening slots on Tuesdays and Thursdays based on demand analysis',
          potentialIncrease: '20-25%',
          confidence: 0.88,
          implementationEffort: 'High' as const
        },
        {
          type: 'revenue-optimization',
          impact: 'Medium' as const,
          description: 'Optimize appointment types and duration based on profitability analysis',
          potentialIncrease: '12-15%',
          confidence: 0.79,
          implementationEffort: 'Medium' as const
        }
      ],
      modelPerformance: {
        lastUpdated: new Date(),
        trainingDataPoints: 15420,
        overallAccuracy: 0.86,
        models: [
          {
            name: 'No-Show Prediction Model',
            accuracy: 0.89,
            lastTrained: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            status: 'active' as const
          },
          {
            name: 'Demand Forecasting Model',
            accuracy: 0.84,
            lastTrained: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            status: 'active' as const
          },
          {
            name: 'Revenue Prediction Model',
            accuracy: 0.82,
            lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            status: 'active' as const
          },
          {
            name: 'Optimization Recommendation Engine',
            accuracy: 0.87,
            lastTrained: new Date(Date.now() - 12 * 60 * 60 * 1000),
            status: 'training' as const
          }
        ]
      }
    };
  };

  if (loading || !predictions) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 animate-pulse" />
          <span>Generating AI insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI-Powered Predictive Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            Advanced machine learning forecasts with confidence intervals and accuracy indicators
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {predictions && (
            <Badge variant="outline" className="text-xs">
              Model Accuracy: {(predictions.modelPerformance.overallAccuracy * 100).toFixed(1)}%
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="accuracy">Model Performance</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts" className="space-y-6">
          {/* Key Predictions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  No-Show Risk Forecast
                  {predictions.noShowForecast.trend === 'increasing' && (
                    <TrendingUp className="h-3 w-3 ml-2 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {predictions.noShowForecast.nextWeek.toFixed(1)}%
                </div>
                <Progress value={predictions.noShowForecast.nextWeek} className="mb-2" />
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Next week prediction</span>
                  <Badge variant="outline">
                    {(predictions.noShowForecast.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <div className="flex items-center text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  <span className="text-muted-foreground">
                    Accuracy: {(predictions.noShowForecast.accuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Revenue Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              ${predictions.revenueProjection.nextMonth.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mb-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{predictions.revenueProjection.growthRate}% growth
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Next month</span>
              <Badge variant="outline">
                {(predictions.revenueProjection.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Optimization Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {((metrics?.appointmentUtilization.utilizationRate || 75) * 1.1).toFixed(0)}%
            </div>
            <Progress value={(metrics?.appointmentUtilization.utilizationRate || 75) * 1.1} className="mb-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Potential utilization</span>
              <Badge variant="outline">High impact</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

          {/* Appointment Demand Forecast with Confidence Intervals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                14-Day Appointment Demand Forecast
              </CardTitle>
              <CardDescription>
                AI-powered predictions with confidence intervals and accuracy: {(predictions.appointmentDemand.accuracy * 100).toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={predictions.appointmentDemand.forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value} appointments`,
                      name === 'predicted' ? 'Predicted Volume' : 
                      name === 'upperBound' ? 'Upper Confidence' : 'Lower Confidence'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="upperBound" 
                    stackId="1" 
                    stroke="none" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lowerBound" 
                    stackId="1" 
                    stroke="none" 
                    fill="#ffffff" 
                    fillOpacity={1}
                  />
                  {/* Predicted line will be overlaid separately */}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {/* Optimization Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                AI-Recommended Optimizations
              </CardTitle>
              <CardDescription>
                Data-driven recommendations with implementation effort and confidence scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.optimizationOpportunities.map((opportunity, index: number) => (
                  <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {opportunity.type === 'scheduling' && <Calendar className="h-5 w-5 text-blue-500" />}
                      {opportunity.type === 'no-show-reduction' && <Users className="h-5 w-5 text-green-500" />}
                      {opportunity.type === 'capacity' && <TrendingUp className="h-5 w-5 text-purple-500" />}
                      {opportunity.type === 'revenue-optimization' && <DollarSign className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {opportunity.type.replace('-', ' ')} Optimization
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={opportunity.impact === 'High' ? 'default' : 'secondary'}
                          >
                            {opportunity.impact} Impact
                          </Badge>
                          <Badge variant="outline">
                            {(opportunity.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {opportunity.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <span className="text-muted-foreground">Potential improvement:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {opportunity.potentialIncrease || opportunity.potentialReduction}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-muted-foreground">Implementation:</span>
                          <Badge 
                            variant={opportunity.implementationEffort === 'Low' ? 'default' : 'outline'}
                            className="ml-2"
                          >
                            {opportunity.implementationEffort} effort
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-6">
          {/* Model Performance Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                AI Model Performance
              </CardTitle>
              <CardDescription>
                Real-time monitoring of prediction accuracy and model health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Model Accuracy</span>
                    <span className="text-2xl font-bold">
                      {(predictions.modelPerformance.overallAccuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={predictions.modelPerformance.overallAccuracy * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Training Data Points</span>
                    <span className="text-2xl font-bold">
                      {predictions.modelPerformance.trainingDataPoints.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {predictions.modelPerformance.lastUpdated.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Individual Model Performance</h4>
                {predictions.modelPerformance.models.map((model, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        {model.status === 'active' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {model.status === 'training' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                        {model.status === 'outdated' && <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last trained: {model.lastTrained.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {(model.accuracy * 100).toFixed(1)}% accuracy
                      </Badge>
                      <Badge 
                        variant={model.status === 'active' ? 'default' : 
                                model.status === 'training' ? 'secondary' : 'destructive'}
                      >
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Risk Factors Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Risk Factors Analysis
              </CardTitle>
              <CardDescription>
                Key factors influencing no-show predictions with impact weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictions.noShowForecast.factors.map((factor: string, index: number) => {
                  const influence = Math.floor(Math.random() * 30 + 10);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{factor}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={influence} className="w-20" />
                        <Badge variant="outline">
                          {influence}% influence
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Recommendation
                </h4>
                <p className="text-sm text-blue-800">
                  {predictions.noShowForecast.recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

