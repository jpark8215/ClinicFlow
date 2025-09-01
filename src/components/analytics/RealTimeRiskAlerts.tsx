import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  Bell,
  Settings
} from 'lucide-react';
import { realTimeRiskAssessmentService } from '@/services/realTimeRiskAssessment';
import { riskFactorAnalysisService } from '@/services/riskFactorAnalysis';
import { useToast } from '@/hooks/use-toast';

interface RiskAlert {
  id: string;
  appointment_id: string;
  alert_type: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  recommendations: string[];
  alert_status: 'active' | 'acknowledged' | 'resolved' | 'expired';
  created_at: string;
  appointments: {
    id: string;
    appointment_time: string;
    status: string;
    patients: {
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    };
  };
}

interface RiskStatistics {
  totalAssessments: number;
  averageRiskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  riskDistribution: { low: number; medium: number; high: number };
  trendData: Array<{
    date: string;
    averageRisk: number;
    assessmentCount: number;
  }>;
}

export const RealTimeRiskAlerts: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<RiskAlert[]>([]);
  const [riskStatistics, setRiskStatistics] = useState<RiskStatistics | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch active alerts
  const fetchActiveAlerts = useCallback(async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const alerts = await realTimeRiskAssessmentService.getActiveRiskAlerts(today, tomorrow);
      setActiveAlerts(alerts);
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch risk alerts',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Fetch risk statistics
  const fetchRiskStatistics = useCallback(async () => {
    try {
      const stats = await realTimeRiskAssessmentService.getRiskStatistics(undefined, undefined, 30);
      setRiskStatistics(stats);
    } catch (error) {
      console.error('Error fetching risk statistics:', error);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchActiveAlerts(), fetchRiskStatistics()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchActiveAlerts, fetchRiskStatistics]);

  // Auto-refresh alerts
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActiveAlerts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchActiveAlerts]);

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string, action?: string) => {
    try {
      await realTimeRiskAssessmentService.acknowledgeRiskAlert(alertId, 'current-user-id', action);
      await fetchActiveAlerts();
      toast({
        title: 'Alert Acknowledged',
        description: 'The risk alert has been acknowledged successfully.'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive'
      });
    }
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get risk level icon
  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Risk Alerts</h2>
          <p className="text-gray-600">Monitor and manage high-risk appointments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Bell className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchActiveAlerts}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {riskStatistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{activeAlerts.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.round(riskStatistics.averageRiskScore * 100)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{riskStatistics.highRiskCount}</p>
                </div>
                <Users className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assessed</p>
                  <p className="text-2xl font-bold text-blue-600">{riskStatistics.totalAssessments}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
          <TabsTrigger value="settings">Alert Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                <p className="text-gray-600">All appointments are currently at acceptable risk levels.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getRiskLevelIcon(alert.risk_level)}
                        <CardTitle className="text-lg">
                          {alert.appointments.patients.first_name} {alert.appointments.patients.last_name}
                        </CardTitle>
                      </div>
                      <Badge className={getRiskLevelColor(alert.risk_level)}>
                        {Math.round(alert.risk_score * 100)}% Risk
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(alert.appointments.appointment_time).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Risk Factors */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Top Risk Factors</h4>
                      <div className="space-y-1">
                        {alert.risk_factors.slice(0, 3).map((factor, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{factor.factor}</span>
                            <span className="text-red-600 font-medium">
                              {Math.round(factor.impact * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {alert.recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id, 'called_patient')}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call Patient
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id, 'sent_reminder')}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id, 'acknowledged')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {riskStatistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-sm">High Risk</span>
                      </div>
                      <span className="font-medium">{riskStatistics.riskDistribution.high}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-sm">Medium Risk</span>
                      </div>
                      <span className="font-medium">{riskStatistics.riskDistribution.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm">Low Risk</span>
                      </div>
                      <span className="font-medium">{riskStatistics.riskDistribution.low}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trend Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {riskStatistics.trendData.slice(-7).map((trend, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{new Date(trend.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{Math.round(trend.averageRisk * 100)}%</span>
                          <span className="text-gray-500">({trend.assessmentCount})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
              <p className="text-sm text-gray-600">Configure when and how you receive risk alerts</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Alert settings can be configured in the notification preferences. 
                  Contact your administrator to modify system-wide alert rules.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">High Risk Threshold</label>
                  <p className="text-sm text-gray-600">Currently set to 70%</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alert Frequency</label>
                  <p className="text-sm text-gray-600">Immediate notifications enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeRiskAlerts;