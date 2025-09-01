import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  MoreHorizontal,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { DashboardMetrics, analyticsService } from '@/services/analyticsService';
import { useToast } from '@/hooks/use-toast';

interface MetricsOverviewProps {
  metrics: DashboardMetrics | null;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  clinicId?: string;
}

interface DrillDownData {
  type: 'patientFlow' | 'utilization' | 'revenue';
  title: string;
  data: any[];
  description: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  dateRange,
  onDateRangeChange,
  clinicId
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('appointments');
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = useState<DashboardMetrics | null>(metrics);
  const { toast } = useToast();

  // Real-time data fetching
  useEffect(() => {
    setRealTimeMetrics(metrics);
  }, [metrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isRefreshing) {
        await refreshMetrics(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange, clinicId, isRefreshing]);

  const refreshMetrics = async (showToast = true) => {
    try {
      setIsRefreshing(true);
      const updatedMetrics = await analyticsService.computeRealTimeMetrics(dateRange, clinicId);
      setRealTimeMetrics(updatedMetrics);
      
      if (showToast) {
        toast({
          title: "Metrics Updated",
          description: "Real-time metrics have been refreshed successfully.",
        });
      }
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      if (showToast) {
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh metrics. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDrillDown = async (type: 'patientFlow' | 'utilization' | 'revenue') => {
    try {
      let drillDownInfo: DrillDownData;
      
      switch (type) {
        case 'patientFlow':
          // Get detailed appointment data for drill-down
          const trendData = await analyticsService.getTrendAnalysis('appointments', dateRange, 'day', clinicId);
          drillDownInfo = {
            type: 'patientFlow',
            title: 'Patient Flow Details',
            description: 'Detailed breakdown of appointment statuses over time',
            data: trendData.map(item => ({
              date: new Date(item.date).toLocaleDateString(),
              completed: item.completed,
              noShows: item.noShows,
              cancelled: item.cancelled,
              pending: item.appointments - item.completed - item.noShows - item.cancelled
            }))
          };
          break;
        case 'utilization':
          drillDownInfo = {
            type: 'utilization',
            title: 'Schedule Utilization Details',
            description: 'Hourly breakdown of appointment scheduling patterns',
            data: realTimeMetrics?.appointmentUtilization.peakHours.map(hour => ({
              hour: `${hour.hour}:00`,
              bookings: hour.bookings,
              utilization: ((hour.bookings / (realTimeMetrics?.appointmentUtilization.totalSlots || 1)) * 100).toFixed(1)
            })) || []
          };
          break;
        case 'revenue':
          drillDownInfo = {
            type: 'revenue',
            title: 'Revenue Analysis Details',
            description: 'Daily revenue breakdown with appointment correlation',
            data: realTimeMetrics?.revenueMetrics.revenueTrend.map(item => ({
              date: new Date(item.date).toLocaleDateString(),
              revenue: item.revenue,
              appointments: item.appointments,
              avgPerAppointment: (item.revenue / item.appointments).toFixed(2)
            })) || []
          };
          break;
      }
      
      setDrillDownData(drillDownInfo);
    } catch (error) {
      console.error('Error loading drill-down data:', error);
      toast({
        title: "Error Loading Details",
        description: "Failed to load detailed metrics. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!realTimeMetrics) {
    return <div>Loading metrics...</div>;
  }

  // Prepare data for charts
  const appointmentStatusData = [
    { name: 'Completed', value: realTimeMetrics.patientFlow.completedAppointments, color: '#22c55e' },
    { name: 'No-Shows', value: realTimeMetrics.patientFlow.noShows, color: '#ef4444' },
    { name: 'Cancelled', value: realTimeMetrics.patientFlow.cancellations, color: '#f59e0b' },
    { name: 'Pending', value: realTimeMetrics.patientFlow.pendingAppointments, color: '#3b82f6' }
  ];

  const utilizationData = [
    { name: 'Booked', value: realTimeMetrics.appointmentUtilization.bookedSlots },
    { name: 'Available', value: realTimeMetrics.appointmentUtilization.availableSlots }
  ];

  const peakHoursData = realTimeMetrics.appointmentUtilization.peakHours.map(hour => ({
    hour: `${hour.hour}:00`,
    bookings: hour.bookings
  }));

  const revenueTrendData = realTimeMetrics.revenueMetrics.revenueTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    revenue: item.revenue,
    appointments: item.appointments
  }));

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Metrics Overview</h3>
          <p className="text-sm text-muted-foreground">
            Real-time KPI dashboard with interactive drill-down capabilities
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMetrics(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Flow Efficiency</CardTitle>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDrillDown('patientFlow')}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {realTimeMetrics.patientFlow.completionRate.toFixed(1)}%
            </div>
            <Progress 
              value={realTimeMetrics.patientFlow.completionRate} 
              className="mb-2"
            />
            <div className="flex items-center text-xs text-muted-foreground">
              {realTimeMetrics.patientFlow.completionRate > 80 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {realTimeMetrics.patientFlow.completedAppointments} completed of {realTimeMetrics.patientFlow.totalAppointments}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedule Utilization</CardTitle>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDrillDown('utilization')}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {realTimeMetrics.appointmentUtilization.utilizationRate.toFixed(1)}%
            </div>
            <Progress 
              value={realTimeMetrics.appointmentUtilization.utilizationRate} 
              className="mb-2"
            />
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {realTimeMetrics.appointmentUtilization.bookedSlots} / {realTimeMetrics.appointmentUtilization.totalSlots} slots
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Performance</CardTitle>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDrillDown('revenue')}
                className="h-6 w-6 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              ${realTimeMetrics.revenueMetrics.estimatedRevenue.toLocaleString()}
            </div>
            <Progress 
              value={Math.min((realTimeMetrics.revenueMetrics.estimatedRevenue / 10000) * 100, 100)} 
              className="mb-2"
            />
            <div className="flex items-center text-xs text-muted-foreground">
              {realTimeMetrics.patientFlow.noShowRate < 10 ? (
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
              )}
              ${realTimeMetrics.revenueMetrics.averagePerAppointment.toFixed(0)} avg per appointment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of appointment outcomes for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Hours Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours Analysis</CardTitle>
            <CardDescription>
              Appointment volume by hour of day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Daily revenue and appointment volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `$${value}` : value,
                    name === 'revenue' ? 'Revenue' : 'Appointments'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Capacity Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Utilization</CardTitle>
            <CardDescription>
              Available vs booked appointment slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics Summary</CardTitle>
          <CardDescription>
            Comprehensive overview of all key performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Patient Flow</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Appointments:</span>
                  <span className="font-medium">{realTimeMetrics.patientFlow.totalAppointments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-green-600">{realTimeMetrics.patientFlow.completedAppointments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No-Shows:</span>
                  <span className="font-medium text-red-600">{realTimeMetrics.patientFlow.noShows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelled:</span>
                  <span className="font-medium text-yellow-600">{realTimeMetrics.patientFlow.cancellations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Duration:</span>
                  <span className="font-medium">{realTimeMetrics.patientFlow.averageDuration.toFixed(0)} min</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Utilization</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Slots:</span>
                  <span className="font-medium">{realTimeMetrics.appointmentUtilization.totalSlots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booked Slots:</span>
                  <span className="font-medium">{realTimeMetrics.appointmentUtilization.bookedSlots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">{realTimeMetrics.appointmentUtilization.availableSlots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization Rate:</span>
                  <span className="font-medium">{realTimeMetrics.appointmentUtilization.utilizationRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Revenue</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Revenue:</span>
                  <span className="font-medium">${realTimeMetrics.revenueMetrics.estimatedRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg per Appointment:</span>
                  <span className="font-medium">${realTimeMetrics.revenueMetrics.averagePerAppointment.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue Appointments:</span>
                  <span className="font-medium">{realTimeMetrics.revenueMetrics.totalAppointments}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDownData} onOpenChange={() => setDrillDownData(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{drillDownData?.title}</DialogTitle>
            <DialogDescription>{drillDownData?.description}</DialogDescription>
          </DialogHeader>
          
          {drillDownData && (
            <div className="mt-4">
              {drillDownData.type === 'patientFlow' && (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={drillDownData.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="completed" stackId="1" stroke="#22c55e" fill="#22c55e" />
                    <Area type="monotone" dataKey="noShows" stackId="1" stroke="#ef4444" fill="#ef4444" />
                    <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                    <Area type="monotone" dataKey="pending" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              
              {drillDownData.type === 'utilization' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={drillDownData.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'utilization' ? `${value}%` : value,
                        name === 'utilization' ? 'Utilization' : 'Bookings'
                      ]}
                    />
                    <Bar dataKey="bookings" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              
              {drillDownData.type === 'revenue' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={drillDownData.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${value}` : value,
                        name === 'revenue' ? 'Revenue' : name === 'appointments' ? 'Appointments' : 'Avg per Appointment'
                      ]}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* Data Table */}
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Detailed Data</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {drillDownData.data.length > 0 && Object.keys(drillDownData.data[0]).map(key => (
                          <th key={key} className="p-2 text-left capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drillDownData.data.map((row, index) => (
                        <tr key={index} className="border-b">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="p-2">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};