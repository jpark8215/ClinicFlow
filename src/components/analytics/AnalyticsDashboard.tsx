import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock,
  RefreshCw,
  Settings,
  Download,
  Filter
} from 'lucide-react';
import { analyticsService, DashboardMetrics } from '@/services/analyticsService';
import { MetricsOverview } from './MetricsOverview';
import { TrendAnalysis } from './TrendAnalysis';
import { PredictiveInsights } from './PredictiveInsights';
import { CustomReports } from './CustomReports';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsDashboardProps {
  clinicId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ clinicId }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date()
  });
  
  const { toast } = useToast();

  const loadMetrics = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const dashboardMetrics = await analyticsService.computeRealTimeMetrics(dateRange, clinicId);
      setMetrics(dashboardMetrics);
      
      if (showRefreshIndicator) {
        toast({
          title: "Dashboard Updated",
          description: "Analytics data has been refreshed successfully.",
        });
      }
    } catch (error) {
      console.error('Error loading analytics metrics:', error);
      toast({
        title: "Error Loading Analytics",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [dateRange, clinicId]);

  const handleRefresh = () => {
    loadMetrics(true);
  };

  const handleExport = async () => {
    try {
      // This would implement actual export functionality
      toast({
        title: "Export Started",
        description: "Your analytics report is being generated.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <AnalyticsDashboardSkeleton />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your clinic operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {metrics?.lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.patientFlow.totalAppointments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.patientFlow.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.appointmentUtilization.utilizationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.appointmentUtilization.bookedSlots} of {metrics?.appointmentUtilization.totalSlots} slots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.patientFlow.noShowRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.patientFlow.noShows} no-shows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.revenueMetrics.estimatedRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${metrics?.revenueMetrics.averagePerAppointment.toFixed(0)} avg per appointment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MetricsOverview 
            metrics={metrics} 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            clinicId={clinicId}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendAnalysis 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            clinicId={clinicId}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <PredictiveInsights 
            metrics={metrics}
            dateRange={dateRange}
            clinicId={clinicId}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <CustomReports 
            clinicId={clinicId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AnalyticsDashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Quick Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};