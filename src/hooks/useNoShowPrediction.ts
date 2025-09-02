import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mlIntegrationService } from '@/services/mlIntegrationService';
import { NoShowPrediction } from '@/types/aiml';

/**
 * Hook for managing no-show predictions
 */
export const useNoShowPrediction = (appointmentId?: string) => {
  const queryClient = useQueryClient();

  // Get prediction for a specific appointment
  const {
    data: prediction,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['noShowPrediction', appointmentId],
    queryFn: () => appointmentId ? mlIntegrationService.getAppointmentRiskPrediction(appointmentId) : null,
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update prediction outcome
  const updateOutcomeMutation = useMutation({
    mutationFn: ({ appointmentId, outcome }: { appointmentId: string; outcome: 'show' | 'no-show' }) =>
      mlIntegrationService.updatePredictionOutcome(appointmentId, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noShowPrediction', appointmentId] });
    },
  });

  const updateOutcome = useCallback((outcome: 'show' | 'no-show') => {
    if (appointmentId) {
      updateOutcomeMutation.mutate({ appointmentId, outcome });
    }
  }, [appointmentId, updateOutcomeMutation]);

  return {
    prediction,
    isLoading,
    error,
    refetch,
    updateOutcome,
    isUpdatingOutcome: updateOutcomeMutation.isPending,
  };
};

/**
 * Hook for getting batch predictions
 */
export const useBatchNoShowPredictions = (appointmentIds: string[]) => {
  const [predictions, setPredictions] = useState<Map<string, NoShowPrediction>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (appointmentIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await mlIntegrationService.getBatchRiskPredictions(appointmentIds);
      setPredictions(results);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentIds]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    isLoading,
    error,
    refetch: fetchPredictions,
  };
};

/**
 * Hook for getting high-risk appointments
 */
export const useHighRiskAppointments = (date: Date, riskThreshold: number = 0.7) => {
  const {
    data: highRiskAppointments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['highRiskAppointments', date.toDateString(), riskThreshold],
    queryFn: () => mlIntegrationService.getHighRiskAppointments(date, riskThreshold),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    highRiskAppointments: highRiskAppointments || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for training the model
 */
export const useModelTraining = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingError, setTrainingError] = useState<Error | null>(null);

  const trainModel = useCallback(async (months: number = 12) => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingError(null);

    try {
      // Simulate training progress
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      await mlIntegrationService.trainModelWithHistoricalData(months);

      clearInterval(progressInterval);
      setTrainingProgress(100);
    } catch (err) {
      setTrainingError(err as Error);
    } finally {
      setIsTraining(false);
    }
  }, []);

  return {
    trainModel,
    isTraining,
    trainingProgress,
    trainingError,
  };
};

/**
 * Hook for getting predictions in a date range
 */
export const usePredictionsForDateRange = (startDate: Date, endDate: Date, clinicId?: string) => {
  const {
    data: predictions,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['predictionsDateRange', startDate.toISOString(), endDate.toISOString(), clinicId],
    queryFn: () => mlIntegrationService.getPredictionsForDateRange(startDate, endDate, clinicId),
    enabled: startDate <= endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    predictions: predictions || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for real-time prediction updates
 */
export const useRealTimePredictions = (appointmentIds: string[]) => {
  const [predictions, setPredictions] = useState<Map<string, NoShowPrediction>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const updatePrediction = useCallback(async (appointmentId: string) => {
    try {
      const prediction = await mlIntegrationService.getAppointmentRiskPrediction(appointmentId);
      if (prediction) {
        setPredictions(prev => new Map(prev).set(appointmentId, prediction));
      }
    } catch (error) {
      console.error('Error updating prediction:', error);
    }
  }, []);

  const refreshAllPredictions = useCallback(async () => {
    if (appointmentIds.length === 0) return;

    setIsLoading(true);
    try {
      const results = await mlIntegrationService.getBatchRiskPredictions(appointmentIds);
      setPredictions(results);
    } catch (error) {
      console.error('Error refreshing predictions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentIds]);

  useEffect(() => {
    refreshAllPredictions();
  }, [refreshAllPredictions]);

  return {
    predictions,
    isLoading,
    updatePrediction,
    refreshAllPredictions,
  };
};

/**
 * Hook for prediction analytics
 */
export const usePredictionAnalytics = (dateRange: { start: Date; end: Date }) => {
  const { predictions, isLoading, error } = usePredictionsForDateRange(
    dateRange.start,
    dateRange.end
  );

  const analytics = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      return {
        totalPredictions: 0,
        averageRiskScore: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        topRiskFactors: [],
      };
    }

    const totalPredictions = predictions.length;
    const averageRiskScore = predictions.reduce((sum, p) => sum + p.riskScore, 0) / totalPredictions;
    
    const riskCounts = predictions.reduce(
      (acc, p) => {
        acc[p.riskLevel]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Aggregate risk factors
    const factorCounts = new Map<string, number>();
    predictions.forEach(p => {
      p.factors?.forEach(factor => {
        factorCounts.set(factor.factor, (factorCounts.get(factor.factor) || 0) + 1);
      });
    });

    const topRiskFactors = Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor, count]) => ({ factor, count }));

    return {
      totalPredictions,
      averageRiskScore,
      highRiskCount: riskCounts.high,
      mediumRiskCount: riskCounts.medium,
      lowRiskCount: riskCounts.low,
      riskDistribution: riskCounts,
      topRiskFactors,
    };
  }, [predictions]);

  return {
    analytics,
    isLoading,
    error,
  };
};

// Import useMemo for analytics hook
import { useMemo } from 'react';