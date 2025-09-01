import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  BarChart3,
  Zap
} from 'lucide-react';
import { schedulingOptimizationService } from '@/services/schedulingOptimizationService';
import { 
  SchedulingOptimizationInput, 
  SchedulingOptimization, 
  OptimizedAppointment,
  AppointmentRequest,
  TimeSlot,
  SchedulingConstraints,
  SchedulingPreferences
} from '@/types/aiml';
import { OptimalTimeSlotSuggestions } from './OptimalTimeSlotSuggestions';
import { ProviderScheduleOptimizer } from './ProviderScheduleOptimizer';
import { ScheduleVisualization } from './ScheduleVisualization';

interface SchedulingOptimizationDashboardProps {
  providerId: string;
  onScheduleUpdate?: (schedule: OptimizedAppointment[]) => void;
}

export const SchedulingOptimizationDashboard: React.FC<SchedulingOptimizationDashboardProps> = ({
  providerId,
  onScheduleUpdate
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<SchedulingOptimization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Sample data - in real implementation, this would come from props or API
  const [appointmentRequests] = useState<AppointmentRequest[]>([
    {
      patientId: 'pat-001',
      appointmentType: 'routine',
      duration: 30,
      priority: 'medium',
      preferredTimes: [
        {
          startTime: new Date(2024, 11, 15, 9, 0),
          endTime: new Date(2024, 11, 15, 9, 30),
          preference: 8
        }
      ]
    },
    {
      patientId: 'pat-002',
      appointmentType: 'consultation',
      duration: 45,
      priority: 'high',
      preferredTimes: [
        {
          startTime: new Date(2024, 11, 15, 14, 0),
          endTime: new Date(2024, 11, 15, 14, 45),
          preference: 9
        }
      ]
    },
    {
      patientId: 'pat-003',
      appointmentType: 'follow-up',
      duration: 20,
      priority: 'low',
      preferredTimes: [
        {
          startTime: new Date(2024, 11, 15, 10, 0),
          endTime: new Date(2024, 11, 15, 10, 20),
          preference: 6
        }
      ]
    }
  ]);

  const [constraints] = useState<SchedulingConstraints>({
    workingHours: {
      start: '08:00',
      end: '17:00'
    },
    breakTimes: [
      {
        startTime: new Date(2024, 11, 15, 12, 0),
        endTime: new Date(2024, 11, 15, 13, 0),
        preference: 0
      }
    ],
    blockedTimes: [],
    maxConsecutiveAppointments: 8,
    bufferTime: 5
  });

  const [preferences] = useState<SchedulingPreferences>({
    prioritizeHighRisk: true,
    balanceWorkload: true,
    minimizeGaps: true,
    considerPatientPreferences: true,
    overbookingAllowed: false,
    overbookingPercentage: 10
  });

  const handleOptimizeSchedule = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const input: SchedulingOptimizationInput = {
        providerId,
        dateRange: {
          startDate: new Date(2024, 11, 15),
          endDate: new Date(2024, 11, 15)
        },
        appointmentRequests,
        constraints,
        preferences
      };

      const response = await schedulingOptimizationService.optimizeSchedule(input);

      if (response.success && response.data) {
        setOptimizationResult(response.data);
        onScheduleUpdate?.(response.data.optimizedSchedule);
      } else {
        setError(response.error || 'Optimization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getRiskLevelColor = (risk: number) => {
    if (risk < 0.3) return 'bg-green-100 text-green-800';
    if (risk < 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule Optimization</h2>
          <p className="text-gray-600">AI-powered scheduling recommendations and optimization</p>
        </div>
        <Button 
          onClick={handleOptimizeSchedule}
          disabled={isOptimizing}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          {isOptimizing ? 'Optimizing...' : 'Optimize Schedule'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="suggestions">Time Slots</TabsTrigger>
          <TabsTrigger value="provider">Provider Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold">{appointmentRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold">
                      {optimizationResult?.optimizedSchedule.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-2xl font-bold">
                      {optimizationResult ? `${Math.round(optimizationResult.utilizationRate * 100)}%` : '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Expected No-Shows</p>
                    <p className="text-2xl font-bold">
                      {optimizationResult ? Math.round(optimizationResult.expectedNoShows) : '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Appointment Requests
              </CardTitle>
              <CardDescription>
                Current appointment requests awaiting scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointmentRequests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Patient {request.patientId}</p>
                        <p className="text-sm text-gray-600">
                          {request.appointmentType} • {request.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      {request.preferredTimes && request.preferredTimes.length > 0 && (
                        <span className="text-sm text-gray-500">
                          Prefers {formatTime(request.preferredTimes[0].startTime)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {optimizationResult ? (
            <>
              {/* Optimization Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Optimization Results
                  </CardTitle>
                  <CardDescription>
                    {optimizationResult.explanation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(optimizationResult.utilizationRate * 100)}%
                      </p>
                      <p className="text-sm text-gray-600">Utilization Rate</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        ${optimizationResult.revenueEstimate.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">Revenue Estimate</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(optimizationResult.expectedNoShows)}
                      </p>
                      <p className="text-sm text-gray-600">Expected No-Shows</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {optimizationResult.conflictsResolved}
                      </p>
                      <p className="text-sm text-gray-600">Conflicts Resolved</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {optimizationResult.recommendations && optimizationResult.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Recommendations</h4>
                      <ul className="space-y-1">
                        {optimizationResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Optimized Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Optimized Schedule
                  </CardTitle>
                  <CardDescription>
                    AI-recommended appointment schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScheduleVisualization 
                    schedule={optimizationResult.optimizedSchedule}
                    constraints={constraints}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Optimization Results
                </h3>
                <p className="text-gray-600 mb-4">
                  Click "Optimize Schedule" to generate AI-powered scheduling recommendations
                </p>
                <Button onClick={handleOptimizeSchedule} disabled={isOptimizing}>
                  {isOptimizing ? 'Optimizing...' : 'Start Optimization'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions">
          <OptimalTimeSlotSuggestions 
            providerId={providerId}
            appointmentRequests={appointmentRequests}
            constraints={constraints}
          />
        </TabsContent>

        <TabsContent value="provider">
          <ProviderScheduleOptimizer 
            providerId={providerId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};