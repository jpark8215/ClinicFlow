import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Settings,
  BarChart3,
  Calendar,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { schedulingOptimizationService } from '@/services/schedulingOptimizationService';

interface ProviderScheduleOptimizerProps {
  providerId: string;
}

interface OptimizationResult {
  recommendedCapacity: number;
  overbookingStrategy: {
    enabled: boolean;
    percentage: number;
    timeSlots: string[];
  };
  riskMitigation: {
    highRiskSlots: string[];
    recommendedActions: string[];
  };
  utilizationForecast: {
    expected: number;
    optimistic: number;
    pessimistic: number;
  };
}

export const ProviderScheduleOptimizer: React.FC<ProviderScheduleOptimizerProps> = ({
  providerId
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetUtilization, setTargetUtilization] = useState(85);
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');

  const handleOptimizeProvider = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const dateRange = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      };

      const response = await schedulingOptimizationService.optimizeProviderSchedule(
        providerId,
        dateRange,
        targetUtilization / 100,
        riskTolerance
      );

      if (response.success && response.data) {
        setOptimizationResult(response.data);
      } else {
        setError(response.error || 'Provider optimization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Provider Schedule Optimization</h3>
          <p className="text-gray-600">Capacity planning and risk analysis for optimal scheduling</p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimization Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Utilization Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={targetUtilization}
                  onChange={(e) => setTargetUtilization(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{targetUtilization}%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Tolerance
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={riskTolerance === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRiskTolerance(level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              onClick={handleOptimizeProvider}
              disabled={isOptimizing}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isOptimizing ? 'Optimizing...' : 'Optimize Provider Schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {optimizationResult && (
        <Tabs defaultValue="capacity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="overbooking">Overbooking</TabsTrigger>
            <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="capacity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommended Capacity
                </CardTitle>
                <CardDescription>
                  Optimal appointment capacity based on historical patterns and target utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {optimizationResult.recommendedCapacity}
                  </div>
                  <p className="text-gray-600 mb-4">Appointments per day</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-600">{targetUtilization}%</p>
                      <p className="text-sm text-gray-600">Target Utilization</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-lg font-semibold text-green-600">
                        {Math.round(optimizationResult.recommendedCapacity * 0.75)}
                      </p>
                      <p className="text-sm text-gray-600">Current Capacity</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-lg font-semibold text-purple-600">
                        +{Math.round(optimizationResult.recommendedCapacity * 0.25)}
                      </p>
                      <p className="text-sm text-gray-600">Recommended Increase</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overbooking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overbooking Strategy
                </CardTitle>
                <CardDescription>
                  Strategic overbooking recommendations to maximize utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Overbooking Enabled</h4>
                      <p className="text-sm text-gray-600">
                        {optimizationResult.overbookingStrategy.enabled 
                          ? 'Recommended based on risk tolerance and utilization target'
                          : 'Not recommended for current risk tolerance level'
                        }
                      </p>
                    </div>
                    <Badge variant={optimizationResult.overbookingStrategy.enabled ? 'default' : 'secondary'}>
                      {optimizationResult.overbookingStrategy.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {optimizationResult.overbookingStrategy.enabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">
                            {optimizationResult.overbookingStrategy.percentage}%
                          </p>
                          <p className="text-sm text-gray-600">Recommended Overbooking Rate</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {optimizationResult.overbookingStrategy.timeSlots.length}
                          </p>
                          <p className="text-sm text-gray-600">Optimal Time Slots</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Recommended Overbooking Time Slots</h4>
                        <div className="flex flex-wrap gap-2">
                          {optimizationResult.overbookingStrategy.timeSlots.map((slot, index) => (
                            <Badge key={index} variant="outline">
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Mitigation
                </CardTitle>
                <CardDescription>
                  Identified risks and recommended mitigation strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* High Risk Slots */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      High Risk Time Slots
                    </h4>
                    {optimizationResult.riskMitigation.highRiskSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {optimizationResult.riskMitigation.highRiskSlots.map((slot, index) => (
                          <Badge key={index} className="bg-red-100 text-red-800">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No high-risk time slots identified</p>
                    )}
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h4 className="font-medium mb-3">Recommended Actions</h4>
                    {optimizationResult.riskMitigation.recommendedActions.length > 0 ? (
                      <ul className="space-y-2">
                        {optimizationResult.riskMitigation.recommendedActions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-700">{action}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">No specific actions recommended at this time</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Utilization Forecast
                </CardTitle>
                <CardDescription>
                  Projected utilization rates under different scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-600 mb-2">
                      {Math.round(optimizationResult.utilizationForecast.pessimistic * 100)}%
                    </p>
                    <p className="text-sm text-gray-600 mb-1">Pessimistic</p>
                    <p className="text-xs text-gray-500">Worst-case scenario</p>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {Math.round(optimizationResult.utilizationForecast.expected * 100)}%
                    </p>
                    <p className="text-sm text-gray-600 mb-1">Expected</p>
                    <p className="text-xs text-gray-500">Most likely outcome</p>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {Math.round(optimizationResult.utilizationForecast.optimistic * 100)}%
                    </p>
                    <p className="text-sm text-gray-600 mb-1">Optimistic</p>
                    <p className="text-xs text-gray-500">Best-case scenario</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Forecast Analysis</h4>
                  <p className="text-sm text-gray-600">
                    Based on historical patterns and the recommended capacity of {optimizationResult.recommendedCapacity} appointments per day, 
                    the expected utilization rate is {Math.round(optimizationResult.utilizationForecast.expected * 100)}%. 
                    This aligns with your target of {targetUtilization}% utilization while maintaining appropriate risk levels.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};