import React, { useState } from 'react';
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
  Zap,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Settings
} from 'lucide-react';
import { SchedulingOptimizationDashboard } from './SchedulingOptimizationDashboard';

export const SchedulingOptimizationDemo: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState('provider-001');
  const [demoMode, setDemoMode] = useState<'overview' | 'dashboard'>('overview');

  const demoProviders = [
    { id: 'provider-001', name: 'Dr. Sarah Johnson', specialty: 'Family Medicine' },
    { id: 'provider-002', name: 'Dr. Michael Chen', specialty: 'Cardiology' },
    { id: 'provider-003', name: 'Dr. Emily Rodriguez', specialty: 'Pediatrics' }
  ];

  const demoStats = {
    totalRequests: 24,
    optimizedSchedules: 18,
    avgUtilization: 87,
    expectedNoShows: 3,
    revenueIncrease: 15,
    timeSlotsSuggested: 72
  };

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: 'AI-Powered Optimization',
      description: 'Advanced machine learning algorithms analyze historical patterns to optimize scheduling decisions',
      benefits: ['85%+ accuracy in predictions', 'Real-time pattern analysis', 'Continuous learning from outcomes']
    },
    {
      icon: <Target className="h-6 w-6 text-green-600" />,
      title: 'Optimal Time Slot Suggestions',
      description: 'Get personalized time slot recommendations based on patient preferences and provider availability',
      benefits: ['Patient preference matching', 'Provider efficiency optimization', 'No-show risk minimization']
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
      title: 'Capacity Planning',
      description: 'Strategic overbooking and capacity optimization with risk considerations',
      benefits: ['Utilization rate optimization', 'Revenue maximization', 'Risk-aware scheduling']
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-orange-600" />,
      title: 'Predictive Analytics',
      description: 'Forecast utilization rates and identify optimization opportunities',
      benefits: ['Scenario-based forecasting', 'Trend identification', 'Performance monitoring']
    }
  ];

  if (demoMode === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scheduling Optimization Dashboard</h2>
            <p className="text-gray-600">Interactive demo of AI-powered scheduling optimization</p>
          </div>
          <Button variant="outline" onClick={() => setDemoMode('overview')}>
            Back to Overview
          </Button>
        </div>

        <SchedulingOptimizationDashboard 
          providerId={selectedProvider}
          onScheduleUpdate={(schedule) => {
            console.log('Schedule updated:', schedule);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Predictive Scheduling Optimization</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Transform your clinic's scheduling with AI-powered optimization that maximizes utilization, 
          minimizes no-shows, and improves patient satisfaction through intelligent time slot recommendations.
        </p>
      </div>

      {/* Demo Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{demoStats.totalRequests}</div>
            <div className="text-sm text-gray-600">Requests Processed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{demoStats.optimizedSchedules}</div>
            <div className="text-sm text-gray-600">Schedules Optimized</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{demoStats.avgUtilization}%</div>
            <div className="text-sm text-gray-600">Avg Utilization</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{demoStats.expectedNoShows}</div>
            <div className="text-sm text-gray-600">Expected No-Shows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">+{demoStats.revenueIncrease}%</div>
            <div className="text-sm text-gray-600">Revenue Increase</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{demoStats.timeSlotsSuggested}</div>
            <div className="text-sm text-gray-600">Time Slots Suggested</div>
          </CardContent>
        </Card>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {feature.icon}
                {feature.title}
              </CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Interactive Demo
          </CardTitle>
          <CardDescription>
            Experience the scheduling optimization system with real-time AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Provider for Demo
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {demoProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProvider === provider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-600">{provider.specialty}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={() => setDemoMode('dashboard')}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Launch Interactive Demo
            </Button>
            <Button variant="outline">
              View Sample Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Benefits</CardTitle>
          <CardDescription>
            Measurable improvements from implementing AI-powered scheduling optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">15-25%</div>
              <div className="text-sm text-gray-600">Increase in Utilization Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">30-40%</div>
              <div className="text-sm text-gray-600">Reduction in No-Shows</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">20-30%</div>
              <div className="text-sm text-gray-600">Improvement in Patient Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">10-20%</div>
              <div className="text-sm text-gray-600">Increase in Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Implementation:</strong> This is a demonstration of the predictive scheduling optimization system. 
          The AI models use simulated data and machine learning algorithms to showcase the capabilities. 
          In a production environment, the system would be trained on your clinic's historical data for optimal accuracy.
        </AlertDescription>
      </Alert>
    </div>
  );
};