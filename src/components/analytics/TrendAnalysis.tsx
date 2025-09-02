import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import { analyticsService } from '@/services/analyticsService';
import { TrendingUp, Calendar, BarChart3, Filter, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrendAnalysisProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  clinicId?: string;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  dateRange,
  onDateRangeChange,
  clinicId
}) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [metricType, setMetricType] = useState('appointments');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'composed'>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['appointments', 'completed']);
  const { toast } = useToast();

  useEffect(() => {
    loadTrendData();
  }, [dateRange, granularity, metricType, clinicId]);

  const loadTrendData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await analyticsService.getTrendAnalysis(
        metricType,
        dateRange,
        granularity,
        clinicId
      );
      setTrendData(data);
      
      if (showRefreshIndicator) {
        toast({
          title: "Trend Data Updated",
          description: "Historical trend analysis has been refreshed successfully.",
        });
      }
    } catch (error) {
      console.error('Error loading trend data:', error);
      toast({
        title: "Error Loading Trends",
        description: "Failed to load trend analysis data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTrendData(true);
  };

  const handleExportData = () => {
    // Convert data to CSV format
    const csvContent = [
      Object.keys(displayData[0] || {}).join(','),
      ...displayData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Trend analysis data has been exported successfully.",
    });
  };

  // Sample data for demonstration
  const sampleTrendData = [
    { period: '2025-01-01', appointments: 45, completed: 40, noShows: 3, revenue: 6750 },
    { period: '2025-01-02', appointments: 52, completed: 48, noShows: 2, revenue: 7800 },
    { period: '2025-01-03', appointments: 38, completed: 35, noShows: 2, revenue: 5700 },
    { period: '2025-01-04', appointments: 61, completed: 55, noShows: 4, revenue: 9150 },
    { period: '2025-01-05', appointments: 47, completed: 43, noShows: 3, revenue: 7050 },
    { period: '2025-01-06', appointments: 33, completed: 30, noShows: 2, revenue: 4950 },
    { period: '2025-01-07', appointments: 29, completed: 27, noShows: 1, revenue: 4350 }
  ];

  const displayData = trendData.length > 0 ? trendData : sampleTrendData;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Trend Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Historical data visualization with multiple chart types and filtering
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Analysis Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground">
                      Date range selection will be implemented with a proper date picker component
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Granularity</label>
              <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="composed">Combined Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Metric</label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointments">Appointments</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="utilization">Utilization</SelectItem>
                  <SelectItem value="no-shows">No-Shows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Metric Selection */}
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Display Metrics</label>
            <div className="flex flex-wrap gap-2">
              {['appointments', 'completed', 'noShows', 'revenue'].map(metric => (
                <Badge
                  key={metric}
                  variant={selectedMetrics.includes(metric) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedMetrics(prev => 
                      prev.includes(metric) 
                        ? prev.filter(m => m !== metric)
                        : [...prev, metric]
                    );
                  }}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            {metricType.charAt(0).toUpperCase() + metricType.slice(1)} Trends Over Time
          </CardTitle>
          <CardDescription>
            Interactive visualization with {chartType} chart showing {selectedMetrics.join(', ')} metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'line' ? (
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value, 
                    name
                  ]}
                />
                <Legend />
                {selectedMetrics.includes('appointments') && (
                  <Line 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Total Appointments"
                  />
                )}
                {selectedMetrics.includes('completed') && (
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Completed"
                  />
                )}
                {selectedMetrics.includes('noShows') && (
                  <Line 
                    type="monotone" 
                    dataKey="noShows" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="No-Shows"
                  />
                )}
                {selectedMetrics.includes('revenue') && (
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Revenue"
                  />
                )}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value, 
                    name
                  ]}
                />
                <Legend />
                {selectedMetrics.includes('appointments') && (
                  <Area 
                    type="monotone" 
                    dataKey="appointments" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Total Appointments"
                  />
                )}
                {selectedMetrics.includes('completed') && (
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="2"
                    stroke="#22c55e" 
                    fill="#22c55e"
                    fillOpacity={0.6}
                    name="Completed"
                  />
                )}
                {selectedMetrics.includes('noShows') && (
                  <Area 
                    type="monotone" 
                    dataKey="noShows" 
                    stackId="2"
                    stroke="#ef4444" 
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="No-Shows"
                  />
                )}
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value, 
                    name
                  ]}
                />
                <Legend />
                {selectedMetrics.includes('appointments') && (
                  <Bar dataKey="appointments" fill="#3b82f6" name="Total Appointments" />
                )}
                {selectedMetrics.includes('completed') && (
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                )}
                {selectedMetrics.includes('noShows') && (
                  <Bar dataKey="noShows" fill="#ef4444" name="No-Shows" />
                )}
              </BarChart>
            ) : (
              <ComposedChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value, 
                    name
                  ]}
                />
                <Legend />
                {selectedMetrics.includes('appointments') && (
                  <Bar yAxisId="left" dataKey="appointments" fill="#3b82f6" name="Total Appointments" />
                )}
                {selectedMetrics.includes('completed') && (
                  <Bar yAxisId="left" dataKey="completed" fill="#22c55e" name="Completed" />
                )}
                {selectedMetrics.includes('revenue') && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="Revenue"
                  />
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Revenue Trend Analysis
          </CardTitle>
          <CardDescription>
            Revenue patterns and financial performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value) => [`$${value}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(displayData.reduce((sum, day) => sum + day.appointments, 0) / displayData.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {displayData.length} days of data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((displayData.reduce((sum, day) => sum + day.completed, 0) / 
                 displayData.reduce((sum, day) => sum + day.appointments, 0)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(displayData.reduce((sum, day) => sum + day.revenue, 0) / displayData.length).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Average daily revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};