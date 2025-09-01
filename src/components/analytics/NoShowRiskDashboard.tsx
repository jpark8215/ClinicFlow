import React, { useState } from 'react';
import { Calendar, AlertTriangle, TrendingUp, Users, Brain, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHighRiskAppointments, usePredictionAnalytics, useModelTraining } from '@/hooks/useNoShowPrediction';
import { format, addDays, startOfDay } from 'date-fns';

export const NoShowRiskDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [riskThreshold, setRiskThreshold] = useState(0.7);
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: startOfDay(addDays(new Date(), 7))
  });

  const { 
    highRiskAppointments, 
    isLoading: isLoadingHighRisk, 
    refetch: refetchHighRisk 
  } = useHighRiskAppointments(selectedDate, riskThreshold);

  const { 
    analytics, 
    isLoading: isLoadingAnalytics 
  } = usePredictionAnalytics(dateRange);

  const { 
    trainModel, 
    isTraining, 
    trainingProgress, 
    trainingError 
  } = useModelTraining();

  const handleDateChange = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  const handleTrainModel = () => {
    trainModel(12); // Train with 12 months of data
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Brain className="h-6 w-6 mr-2 text-blue-600" />
            No-Show Risk Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered predictions and risk management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => refetchHighRisk()}
            variant="outline"
            size="sm"
            disabled={isLoadingHighRisk}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingHighRisk ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleTrainModel}
            variant="outline"
            size="sm"
            disabled={isTraining}
          >
            {isTraining ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Training ({trainingProgress}%)
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-1" />
                Retrain Model
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Training Progress */}
      {isTraining && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Model Training Progress</span>
                <span className="text-sm text-muted-foreground">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Training model with historical appointment data...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Error */}
      {trainingError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">
                Training failed: {trainingError.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Risks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {/* Date Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date Selection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Risk Threshold:</span>
                  <Select
                    value={riskThreshold.toString()}
                    onValueChange={(value) => setRiskThreshold(parseFloat(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">50%</SelectItem>
                      <SelectItem value="0.6">60%</SelectItem>
                      <SelectItem value="0.7">70%</SelectItem>
                      <SelectItem value="0.8">80%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => handleDateChange(-1)}
                  variant="outline"
                  size="sm"
                >
                  Previous Day
                </Button>
                <span className="font-medium">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
                <Button
                  onClick={() => handleDateChange(1)}
                  variant="outline"
                  size="sm"
                >
                  Next Day
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* High Risk Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-bold text-red-600">
                      {highRiskAppointments.filter(apt => apt.prediction.riskLevel === 'high').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Medium Risk</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {highRiskAppointments.filter(apt => apt.prediction.riskLevel === 'medium').length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total At Risk</p>
                    <p className="text-2xl font-bold">
                      {highRiskAppointments.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* High Risk Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle>High Risk Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHighRisk ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading risk assessments...</span>
                </div>
              ) : highRiskAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No high-risk appointments found for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {highRiskAppointments.map((appointment) => (
                    <div
                      key={appointment.appointmentId}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {appointment.appointmentDetails.patients?.first_name}{' '}
                            {appointment.appointmentDetails.patients?.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.appointmentDetails.appointment_time), 'h:mm a')} - 
                            {appointment.appointmentDetails.appointment_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              appointment.prediction.riskLevel === 'high' ? 'destructive' :
                              appointment.prediction.riskLevel === 'medium' ? 'default' : 'secondary'
                            }
                          >
                            {Math.round(appointment.prediction.riskScore * 100)}% Risk
                          </Badge>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {appointment.prediction.factors && appointment.prediction.factors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Risk Factors:</p>
                          <div className="flex flex-wrap gap-2">
                            {appointment.prediction.factors.slice(0, 3).map((factor, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {factor.factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {appointment.prediction.recommendations && appointment.prediction.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Recommendations:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {appointment.prediction.recommendations.slice(0, 2).map((rec, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" variant="outline">
                          Call Patient
                        </Button>
                        <Button size="sm" variant="outline">
                          Send Reminder
                        </Button>
                        <Button size="sm" variant="outline">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Total Predictions</p>
                  <p className="text-2xl font-bold">{analytics.totalPredictions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analytics.averageRiskScore * 100)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.highRiskCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Low Risk</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.lowRiskCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-600">Low Risk</span>
                    <span className="text-sm">{analytics.lowRiskCount}</span>
                  </div>
                  <Progress 
                    value={analytics.totalPredictions > 0 ? (analytics.lowRiskCount / analytics.totalPredictions) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-600">Medium Risk</span>
                    <span className="text-sm">{analytics.mediumRiskCount}</span>
                  </div>
                  <Progress 
                    value={analytics.totalPredictions > 0 ? (analytics.mediumRiskCount / analytics.totalPredictions) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-600">High Risk</span>
                    <span className="text-sm">{analytics.highRiskCount}</span>
                  </div>
                  <Progress 
                    value={analytics.totalPredictions > 0 ? (analytics.highRiskCount / analytics.totalPredictions) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topRiskFactors.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No risk factor data available
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.topRiskFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{factor.factor}</span>
                      <Badge variant="secondary">{factor.count} occurrences</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Trend analysis coming soon</p>
                <p className="text-sm">Historical trend charts and predictive analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoShowRiskDashboard;