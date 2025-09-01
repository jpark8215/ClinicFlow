import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realTimeRiskAssessmentService } from '@/services/realTimeRiskAssessment';
import { NoShowPrediction } from '@/types/aiml';

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

/**
 * Hook for managing real-time risk alerts
 */
export const useRealTimeRiskAlerts = (dateRange?: { start: Date; end: Date }) => {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const defaultDateRange = {
    start: new Date(),
    end: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })()
  };

  const range = dateRange || defaultDateRange;

  // Fetch active risk alerts
  const {
    data: activeAlerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['activeRiskAlerts', range.start.toISOString(), range.end.toISOString()],
    queryFn: () => realTimeRiskAssessmentService.getActiveRiskAlerts(range.start, range.end),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is on
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Fetch risk statistics
  const {
    data: riskStatistics,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['riskStatistics', 30], // Last 30 days
    queryFn: () => realTimeRiskAssessmentService.getRiskStatistics(undefined, undefined, 30),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: ({ alertId, action }: { alertId: string; action?: string }) =>
      realTimeRiskAssessmentService.acknowledgeRiskAlert(alertId, 'current-user-id', action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRiskAlerts'] });
    },
  });

  // Calculate real-time risk mutation
  const calculateRiskMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      realTimeRiskAssessmentService.calculateRealTimeRisk(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeRiskAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['riskStatistics'] });
    },
  });

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string, action?: string) => {
    return acknowledgeAlertMutation.mutateAsync({ alertId, action });
  }, [acknowledgeAlertMutation]);

  // Calculate risk for appointment
  const calculateRisk = useCallback((appointmentId: string) => {
    return calculateRiskMutation.mutateAsync(appointmentId);
  }, [calculateRiskMutation]);

  // Manual refresh
  const refresh = useCallback(() => {
    refetchAlerts();
    refetchStats();
  }, [refetchAlerts, refetchStats]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  return {
    // Data
    activeAlerts: activeAlerts || [],
    riskStatistics,
    
    // Loading states
    isLoading: alertsLoading || statsLoading,
    alertsLoading,
    statsLoading,
    
    // Error states
    error: alertsError || statsError,
    alertsError,
    statsError,
    
    // Actions
    acknowledgeAlert,
    calculateRisk,
    refresh,
    
    // Auto-refresh control
    autoRefresh,
    toggleAutoRefresh,
    
    // Mutation states
    isAcknowledging: acknowledgeAlertMutation.isPending,
    isCalculatingRisk: calculateRiskMutation.isPending,
  };
};

/**
 * Hook for real-time risk assessment of a specific appointment
 */
export const useAppointmentRiskAssessment = (appointmentId?: string) => {
  const queryClient = useQueryClient();

  // Get current risk assessment
  const {
    data: riskAssessment,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['appointmentRiskAssessment', appointmentId],
    queryFn: () => appointmentId ? realTimeRiskAssessmentService.calculateRealTimeRisk(appointmentId) : null,
    enabled: !!appointmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Recalculate risk mutation
  const recalculateRiskMutation = useMutation({
    mutationFn: () => {
      if (!appointmentId) throw new Error('No appointment ID provided');
      return realTimeRiskAssessmentService.calculateRealTimeRisk(appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointmentRiskAssessment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['activeRiskAlerts'] });
    },
  });

  const recalculateRisk = useCallback(() => {
    return recalculateRiskMutation.mutateAsync();
  }, [recalculateRiskMutation]);

  return {
    riskAssessment,
    isLoading,
    error,
    refetch,
    recalculateRisk,
    isRecalculating: recalculateRiskMutation.isPending,
  };
};

/**
 * Hook for managing risk alert subscriptions
 */
export const useRiskAlertSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, Set<string>>>(new Map());

  // Subscribe to alerts for specific appointments
  const subscribeToAlerts = useCallback((subscriberId: string, appointmentIds: string[]) => {
    realTimeRiskAssessmentService.subscribeToRiskAlerts(subscriberId, appointmentIds);
    
    setSubscriptions(prev => {
      const newSubscriptions = new Map(prev);
      if (!newSubscriptions.has(subscriberId)) {
        newSubscriptions.set(subscriberId, new Set());
      }
      const userSubscriptions = newSubscriptions.get(subscriberId)!;
      appointmentIds.forEach(id => userSubscriptions.add(id));
      return newSubscriptions;
    });
  }, []);

  // Unsubscribe from alerts
  const unsubscribeFromAlerts = useCallback((subscriberId: string, appointmentIds?: string[]) => {
    realTimeRiskAssessmentService.unsubscribeFromRiskAlerts(subscriberId, appointmentIds);
    
    setSubscriptions(prev => {
      const newSubscriptions = new Map(prev);
      if (appointmentIds) {
        const userSubscriptions = newSubscriptions.get(subscriberId);
        if (userSubscriptions) {
          appointmentIds.forEach(id => userSubscriptions.delete(id));
        }
      } else {
        newSubscriptions.delete(subscriberId);
      }
      return newSubscriptions;
    });
  }, []);

  // Get subscriptions for a user
  const getSubscriptions = useCallback((subscriberId: string) => {
    return Array.from(subscriptions.get(subscriberId) || []);
  }, [subscriptions]);

  return {
    subscribeToAlerts,
    unsubscribeFromAlerts,
    getSubscriptions,
    subscriptions: subscriptions,
  };
};

/**
 * Hook for risk alert analytics and insights
 */
export const useRiskAlertAnalytics = (days: number = 30) => {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['riskAlertAnalytics', days],
    queryFn: () => realTimeRiskAssessmentService.getRiskStatistics(undefined, undefined, days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate additional insights
  const insights = useMemo(() => {
    if (!analytics) return null;

    const totalRisk = analytics.highRiskCount + analytics.mediumRiskCount + analytics.lowRiskCount;
    const highRiskPercentage = totalRisk > 0 ? (analytics.highRiskCount / totalRisk) * 100 : 0;
    
    // Trend analysis
    const trendDirection = analytics.trendData.length >= 2 
      ? analytics.trendData[analytics.trendData.length - 1].averageRisk > analytics.trendData[0].averageRisk
        ? 'increasing'
        : 'decreasing'
      : 'stable';

    return {
      ...analytics,
      highRiskPercentage,
      trendDirection,
      riskLevel: highRiskPercentage > 20 ? 'high' : highRiskPercentage > 10 ? 'medium' : 'low',
    };
  }, [analytics]);

  return {
    analytics: insights,
    isLoading,
    error,
    refetch,
  };
};

// Import useMemo for analytics hook
import { useMemo } from 'react';