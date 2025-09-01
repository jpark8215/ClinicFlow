import { supabase } from '@/integrations/supabase/client';
import {
  SchedulingOptimizationInput,
  SchedulingOptimization,
  OptimizedAppointment,
  AppointmentRequest,
  TimeSlot,
  SchedulingConstraints,
  SchedulingPreferences,
  NoShowPredictionInput,
  AIServiceResponse
} from '@/types/aiml';
import { noShowMLService } from './noShowMLService';

/**
 * Advanced Scheduling Optimization Service
 * Implements AI-powered scheduling recommendations based on historical patterns,
 * optimal time slot suggestions using optimization algorithms, and provider
 * schedule optimization with risk considerations and capacity planning.
 */
export class SchedulingOptimizationService {
  private readonly OPTIMIZATION_WEIGHTS = {
    UTILIZATION: 0.3,
    NO_SHOW_RISK: 0.25,
    PATIENT_PREFERENCE: 0.2,
    REVENUE: 0.15,
    PROVIDER_EFFICIENCY: 0.1
  };

  private readonly TIME_SLOT_DURATION = 15; // minutes
  private readonly MAX_OPTIMIZATION_ITERATIONS = 1000;

  /**
   * Generate optimal schedule recommendations based on historical patterns and constraints
   */
  async optimizeSchedule(input: SchedulingOptimizationInput): Promise<AIServiceResponse<SchedulingOptimization>> {
    const startTime = Date.now();
    const requestId = `sched_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log('Starting schedule optimization for provider:', input.providerId);

      // Validate input
      this.validateOptimizationInput(input);

      // Get historical data for pattern analysis
      const historicalData = await this.getHistoricalSchedulingData(input.providerId, input.dateRange);

      // Generate available time slots
      const availableSlots = this.generateAvailableTimeSlots(input.dateRange, input.constraints);

      // Calculate no-show risk for each appointment request
      const appointmentsWithRisk = await this.calculateNoShowRisks(input.appointmentRequests);

      // Apply optimization algorithm
      const optimizedSchedule = await this.runOptimizationAlgorithm(
        appointmentsWithRisk,
        availableSlots,
        input.constraints,
        input.preferences,
        historicalData
      );

      // Calculate performance metrics
      const metrics = this.calculateScheduleMetrics(optimizedSchedule, availableSlots, appointmentsWithRisk);

      const result: SchedulingOptimization = {
        result: optimizedSchedule,
        optimizedSchedule,
        utilizationRate: metrics.utilizationRate,
        expectedNoShows: metrics.expectedNoShows,
        revenueEstimate: metrics.revenueEstimate,
        conflictsResolved: metrics.conflictsResolved,
        recommendations: this.generateSchedulingRecommendations(metrics, input.preferences),
        explanation: this.generateOptimizationExplanation(metrics, optimizedSchedule.length)
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        requestId,
        processingTime,
        modelVersion: '1.0.0'
      };

    } catch (error) {
      console.error('Schedule optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown optimization error',
        requestId,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get optimal time slot suggestions for a specific appointment
   */
  async suggestOptimalTimeSlots(
    appointmentRequest: AppointmentRequest,
    providerId: string,
    dateRange: { startDate: Date; endDate: Date },
    constraints: SchedulingConstraints,
    maxSuggestions: number = 5
  ): Promise<AIServiceResponse<TimeSlot[]>> {
    const startTime = Date.now();
    const requestId = `slot_suggest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get available slots
      const availableSlots = this.generateAvailableTimeSlots(dateRange, constraints);

      // Get historical patterns for this appointment type
      const patterns = await this.getAppointmentTypePatterns(appointmentRequest.appointmentType, providerId);

      // Calculate no-show risk for this patient
      const noShowRisk = await this.calculateSingleNoShowRisk(appointmentRequest, providerId);

      // Score each available slot
      const scoredSlots = await this.scoreTimeSlots(
        availableSlots,
        appointmentRequest,
        patterns,
        noShowRisk
      );

      // Sort by score and return top suggestions
      const suggestions = scoredSlots
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions)
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          preference: Math.round(slot.score * 10) // Convert to 1-10 scale
        }));

      return {
        success: true,
        data: suggestions,
        requestId,
        processingTime: Date.now() - startTime,
        modelVersion: '1.0.0'
      };

    } catch (error) {
      console.error('Time slot suggestion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown suggestion error',
        requestId,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Optimize provider schedule with capacity planning and risk considerations
   */
  async optimizeProviderSchedule(
    providerId: string,
    dateRange: { startDate: Date; endDate: Date },
    targetUtilization: number = 0.85,
    riskTolerance: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AIServiceResponse<{
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
  }>> {
    const startTime = Date.now();
    const requestId = `provider_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get provider's historical data
      const historicalData = await this.getProviderHistoricalData(providerId, dateRange);

      // Analyze appointment patterns
      const patterns = await this.analyzeProviderPatterns(historicalData);

      // Calculate optimal capacity
      const recommendedCapacity = this.calculateOptimalCapacity(
        patterns,
        targetUtilization,
        riskTolerance
      );

      // Determine overbooking strategy
      const overbookingStrategy = this.calculateOverbookingStrategy(
        patterns,
        riskTolerance,
        targetUtilization
      );

      // Identify risk mitigation opportunities
      const riskMitigation = this.identifyRiskMitigation(patterns, historicalData);

      // Generate utilization forecast
      const utilizationForecast = this.generateUtilizationForecast(
        patterns,
        recommendedCapacity,
        overbookingStrategy
      );

      const result = {
        recommendedCapacity,
        overbookingStrategy,
        riskMitigation,
        utilizationForecast
      };

      return {
        success: true,
        data: result,
        requestId,
        processingTime: Date.now() - startTime,
        modelVersion: '1.0.0'
      };

    } catch (error) {
      console.error('Provider schedule optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown provider optimization error',
        requestId,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate optimization input parameters
   */
  private validateOptimizationInput(input: SchedulingOptimizationInput): void {
    if (!input.providerId) {
      throw new Error('Provider ID is required');
    }

    if (!input.dateRange.startDate || !input.dateRange.endDate) {
      throw new Error('Valid date range is required');
    }

    if (input.dateRange.startDate >= input.dateRange.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (!input.appointmentRequests || input.appointmentRequests.length === 0) {
      throw new Error('At least one appointment request is required');
    }

    // Validate appointment requests
    input.appointmentRequests.forEach((request, index) => {
      if (!request.patientId || !request.appointmentType || !request.duration) {
        throw new Error(`Invalid appointment request at index ${index}`);
      }
    });
  }

  /**
   * Get historical scheduling data for pattern analysis
   */
  private async getHistoricalSchedulingData(
    providerId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<any> {
    try {
      // Get historical appointments for the past 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (*)
        `)
        .eq('provider_id', providerId)
        .gte('appointment_time', sixMonthsAgo.toISOString())
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      // Analyze patterns
      return this.analyzeHistoricalPatterns(appointments || []);
    } catch (error) {
      console.warn('Failed to get historical data, using defaults:', error);
      return this.getDefaultPatterns();
    }
  }

  /**
   * Analyze historical patterns from appointment data
   */
  private analyzeHistoricalPatterns(appointments: any[]): any {
    const patterns = {
      noShowRateByHour: {} as Record<number, number>,
      noShowRateByDayOfWeek: {} as Record<number, number>,
      noShowRateByAppointmentType: {} as Record<string, number>,
      averageDurationByType: {} as Record<string, number>,
      peakHours: [] as number[],
      seasonalTrends: {} as Record<string, number>
    };

    if (appointments.length === 0) {
      return this.getDefaultPatterns();
    }

    // Calculate no-show rates by hour
    const hourStats = {} as Record<number, { total: number; noShows: number }>;
    
    appointments.forEach(apt => {
      const hour = new Date(apt.appointment_time).getHours();
      const dayOfWeek = new Date(apt.appointment_time).getDay();
      const type = apt.appointment_type || 'routine';
      
      // Hour statistics
      if (!hourStats[hour]) hourStats[hour] = { total: 0, noShows: 0 };
      hourStats[hour].total++;
      if (apt.status === 'No-Show') hourStats[hour].noShows++;
      
      // Day of week statistics
      if (!patterns.noShowRateByDayOfWeek[dayOfWeek]) {
        patterns.noShowRateByDayOfWeek[dayOfWeek] = 0;
      }
      
      // Appointment type statistics
      if (!patterns.noShowRateByAppointmentType[type]) {
        patterns.noShowRateByAppointmentType[type] = 0;
      }
      
      if (!patterns.averageDurationByType[type]) {
        patterns.averageDurationByType[type] = apt.duration || 30;
      }
    });

    // Calculate rates
    Object.keys(hourStats).forEach(hour => {
      const stats = hourStats[parseInt(hour)];
      patterns.noShowRateByHour[parseInt(hour)] = stats.total > 0 ? stats.noShows / stats.total : 0.15;
    });

    // Identify peak hours (hours with highest appointment volume)
    patterns.peakHours = Object.entries(hourStats)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 4)
      .map(([hour]) => parseInt(hour));

    return patterns;
  }

  /**
   * Get default patterns when historical data is not available
   */
  private getDefaultPatterns(): any {
    return {
      noShowRateByHour: {
        8: 0.25, 9: 0.20, 10: 0.15, 11: 0.12, 12: 0.18,
        13: 0.22, 14: 0.15, 15: 0.12, 16: 0.18, 17: 0.25
      },
      noShowRateByDayOfWeek: {
        0: 0.30, 1: 0.15, 2: 0.12, 3: 0.10, 4: 0.12, 5: 0.18, 6: 0.25
      },
      noShowRateByAppointmentType: {
        'routine': 0.15,
        'follow-up': 0.10,
        'consultation': 0.12,
        'procedure': 0.08
      },
      averageDurationByType: {
        'routine': 30,
        'follow-up': 20,
        'consultation': 45,
        'procedure': 60
      },
      peakHours: [9, 10, 14, 15],
      seasonalTrends: {}
    };
  }

  /**
   * Generate available time slots based on constraints
   */
  private generateAvailableTimeSlots(
    dateRange: { startDate: Date; endDate: Date },
    constraints: SchedulingConstraints
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const currentDate = new Date(dateRange.startDate);

    while (currentDate <= dateRange.endDate) {
      // Skip weekends if not in working hours
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate slots for this day
      const daySlots = this.generateDayTimeSlots(currentDate, constraints);
      slots.push(...daySlots);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate time slots for a specific day
   */
  private generateDayTimeSlots(date: Date, constraints: SchedulingConstraints): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = constraints.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = constraints.workingHours.end.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    const currentSlot = new Date(startTime);

    while (currentSlot < endTime) {
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + this.TIME_SLOT_DURATION);

      // Check if slot conflicts with breaks or blocked times
      if (!this.isSlotBlocked(currentSlot, slotEnd, constraints)) {
        slots.push({
          startTime: new Date(currentSlot),
          endTime: new Date(slotEnd),
          preference: 5 // Default preference
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + this.TIME_SLOT_DURATION);
    }

    return slots;
  }

  /**
   * Check if a time slot is blocked by breaks or other constraints
   */
  private isSlotBlocked(
    slotStart: Date,
    slotEnd: Date,
    constraints: SchedulingConstraints
  ): boolean {
    // Check break times
    for (const breakTime of constraints.breakTimes) {
      if (this.slotsOverlap(slotStart, slotEnd, breakTime.startTime, breakTime.endTime)) {
        return true;
      }
    }

    // Check blocked times
    for (const blockedTime of constraints.blockedTimes) {
      if (this.slotsOverlap(slotStart, slotEnd, blockedTime.startTime, blockedTime.endTime)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two time slots overlap
   */
  private slotsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Calculate no-show risks for appointment requests
   */
  private async calculateNoShowRisks(requests: AppointmentRequest[]): Promise<(AppointmentRequest & { noShowRisk: number })[]> {
    const requestsWithRisk = [];

    for (const request of requests) {
      let noShowRisk = request.noShowRisk;

      if (noShowRisk === undefined) {
        // Calculate risk using ML service if not provided
        try {
          const prediction = await this.calculateSingleNoShowRisk(request, 'default-provider');
          noShowRisk = prediction;
        } catch (error) {
          console.warn('Failed to calculate no-show risk, using default:', error);
          noShowRisk = 0.15; // Default risk
        }
      }

      requestsWithRisk.push({
        ...request,
        noShowRisk
      });
    }

    return requestsWithRisk;
  }

  /**
   * Calculate no-show risk for a single appointment request
   */
  private async calculateSingleNoShowRisk(request: AppointmentRequest, providerId: string): Promise<number> {
    try {
      // Create prediction input
      const predictionInput: NoShowPredictionInput = {
        appointmentId: `temp-${Date.now()}`,
        patientId: request.patientId,
        appointmentTime: request.preferredTimes[0]?.startTime || new Date(),
        appointmentType: request.appointmentType,
        providerId,
        patientAge: 35, // Default - would be fetched from patient data
        patientGender: 'unknown',
        previousNoShows: 0,
        previousAppointments: 1,
        daysSinceLastAppointment: 30,
        appointmentDayOfWeek: new Date().getDay(),
        appointmentHour: new Date().getHours(),
        remindersSent: 0
      };

      const prediction = await noShowMLService.predictNoShowRisk(predictionInput);
      return prediction.riskScore;
    } catch (error) {
      console.warn('ML prediction failed, using heuristic:', error);
      return this.calculateHeuristicRisk(request);
    }
  }

  /**
   * Calculate heuristic risk when ML service is unavailable
   */
  private calculateHeuristicRisk(request: AppointmentRequest): number {
    let risk = 0.15; // Base risk

    // Adjust based on priority
    switch (request.priority) {
      case 'urgent':
        risk *= 0.5; // Urgent appointments have lower no-show rates
        break;
      case 'high':
        risk *= 0.7;
        break;
      case 'low':
        risk *= 1.3;
        break;
    }

    // Adjust based on appointment type
    const typeRiskMultipliers: Record<string, number> = {
      'routine': 1.0,
      'follow-up': 0.8,
      'consultation': 0.9,
      'procedure': 0.6
    };

    risk *= typeRiskMultipliers[request.appointmentType] || 1.0;

    return Math.min(Math.max(risk, 0.05), 0.8); // Clamp between 5% and 80%
  }

  /**
   * Run the main optimization algorithm
   */
  private async runOptimizationAlgorithm(
    appointments: (AppointmentRequest & { noShowRisk: number })[],
    availableSlots: TimeSlot[],
    constraints: SchedulingConstraints,
    preferences: SchedulingPreferences,
    historicalData: any
  ): Promise<OptimizedAppointment[]> {
    // Sort appointments by priority and risk
    const sortedAppointments = this.sortAppointmentsByPriority(appointments, preferences);

    const optimizedSchedule: OptimizedAppointment[] = [];
    const usedSlots = new Set<string>();

    for (const appointment of sortedAppointments) {
      const bestSlot = this.findBestSlotForAppointment(
        appointment,
        availableSlots,
        usedSlots,
        constraints,
        preferences,
        historicalData
      );

      if (bestSlot) {
        optimizedSchedule.push({
          appointmentRequestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          patientId: appointment.patientId,
          scheduledTime: bestSlot.startTime,
          duration: appointment.duration,
          confidence: bestSlot.confidence,
          alternativeSlots: bestSlot.alternatives
        });

        // Mark slots as used
        const slotsNeeded = Math.ceil(appointment.duration / this.TIME_SLOT_DURATION);
        for (let i = 0; i < slotsNeeded; i++) {
          const slotTime = new Date(bestSlot.startTime);
          slotTime.setMinutes(slotTime.getMinutes() + (i * this.TIME_SLOT_DURATION));
          usedSlots.add(slotTime.toISOString());
        }
      }
    }

    return optimizedSchedule;
  }

  /**
   * Sort appointments by priority considering preferences
   */
  private sortAppointmentsByPriority(
    appointments: (AppointmentRequest & { noShowRisk: number })[],
    preferences: SchedulingPreferences
  ): (AppointmentRequest & { noShowRisk: number })[] {
    return appointments.sort((a, b) => {
      // Priority weight
      const priorityWeight = this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority);
      
      // Risk weight (if prioritizing high risk)
      let riskWeight = 0;
      if (preferences.prioritizeHighRisk) {
        riskWeight = b.noShowRisk - a.noShowRisk;
      }

      return priorityWeight * 2 + riskWeight;
    });
  }

  /**
   * Get numerical weight for priority
   */
  private getPriorityWeight(priority: string): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority as keyof typeof weights] || 2;
  }

  /**
   * Find the best time slot for a specific appointment
   */
  private findBestSlotForAppointment(
    appointment: AppointmentRequest & { noShowRisk: number },
    availableSlots: TimeSlot[],
    usedSlots: Set<string>,
    constraints: SchedulingConstraints,
    preferences: SchedulingPreferences,
    historicalData: any
  ): { startTime: Date; confidence: number; alternatives: TimeSlot[] } | null {
    const candidateSlots = availableSlots.filter(slot => {
      // Check if slot is available
      const slotsNeeded = Math.ceil(appointment.duration / this.TIME_SLOT_DURATION);
      for (let i = 0; i < slotsNeeded; i++) {
        const checkTime = new Date(slot.startTime);
        checkTime.setMinutes(checkTime.getMinutes() + (i * this.TIME_SLOT_DURATION));
        if (usedSlots.has(checkTime.toISOString())) {
          return false;
        }
      }
      return true;
    });

    if (candidateSlots.length === 0) {
      return null;
    }

    // Score each candidate slot
    const scoredSlots = candidateSlots.map(slot => ({
      ...slot,
      score: this.scoreSlotForAppointment(slot, appointment, preferences, historicalData)
    }));

    // Sort by score
    scoredSlots.sort((a, b) => b.score - a.score);

    const bestSlot = scoredSlots[0];
    const alternatives = scoredSlots.slice(1, 4); // Top 3 alternatives

    return {
      startTime: bestSlot.startTime,
      confidence: bestSlot.score,
      alternatives: alternatives.map(alt => ({
        startTime: alt.startTime,
        endTime: alt.endTime,
        preference: Math.round(alt.score * 10)
      }))
    };
  }

  /**
   * Score a time slot for a specific appointment
   */
  private scoreSlotForAppointment(
    slot: TimeSlot,
    appointment: AppointmentRequest & { noShowRisk: number },
    preferences: SchedulingPreferences,
    historicalData: any
  ): number {
    let score = 0;

    const hour = slot.startTime.getHours();
    const dayOfWeek = slot.startTime.getDay();

    // Patient preference score
    if (preferences.considerPatientPreferences) {
      const preferenceScore = this.calculatePatientPreferenceScore(slot, appointment.preferredTimes);
      score += preferenceScore * this.OPTIMIZATION_WEIGHTS.PATIENT_PREFERENCE;
    }

    // Historical no-show rate for this time
    const historicalNoShowRate = historicalData.noShowRateByHour[hour] || 0.15;
    const noShowScore = 1 - historicalNoShowRate; // Lower no-show rate = higher score
    score += noShowScore * this.OPTIMIZATION_WEIGHTS.NO_SHOW_RISK;

    // Provider efficiency (peak hours get higher scores if balancing workload)
    if (preferences.balanceWorkload) {
      const isPeakHour = historicalData.peakHours.includes(hour);
      const efficiencyScore = isPeakHour ? 0.8 : 1.0; // Slightly prefer non-peak hours
      score += efficiencyScore * this.OPTIMIZATION_WEIGHTS.PROVIDER_EFFICIENCY;
    }

    // Revenue optimization (higher priority appointments in better slots)
    const priorityMultiplier = this.getPriorityWeight(appointment.priority) / 4;
    score += priorityMultiplier * this.OPTIMIZATION_WEIGHTS.REVENUE;

    // Utilization optimization (prefer slots that maximize utilization)
    const utilizationScore = this.calculateUtilizationScore(slot, appointment.duration);
    score += utilizationScore * this.OPTIMIZATION_WEIGHTS.UTILIZATION;

    return Math.min(Math.max(score, 0), 1); // Normalize to 0-1
  }

  /**
   * Calculate patient preference score for a slot
   */
  private calculatePatientPreferenceScore(slot: TimeSlot, preferredTimes: TimeSlot[]): number {
    if (!preferredTimes || preferredTimes.length === 0) {
      return 0.5; // Neutral score if no preferences
    }

    let maxScore = 0;
    for (const preferred of preferredTimes) {
      const timeDiff = Math.abs(slot.startTime.getTime() - preferred.startTime.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Score decreases with time difference
      const score = Math.max(0, 1 - (hoursDiff / 24)) * (preferred.preference / 10);
      maxScore = Math.max(maxScore, score);
    }

    return maxScore;
  }

  /**
   * Calculate utilization score for a slot
   */
  private calculateUtilizationScore(slot: TimeSlot, duration: number): number {
    // Prefer slots that efficiently use time blocks
    const slotsNeeded = Math.ceil(duration / this.TIME_SLOT_DURATION);
    const efficiency = duration / (slotsNeeded * this.TIME_SLOT_DURATION);
    return efficiency;
  }

  /**
   * Calculate schedule performance metrics
   */
  private calculateScheduleMetrics(
    optimizedSchedule: OptimizedAppointment[],
    availableSlots: TimeSlot[],
    appointments: (AppointmentRequest & { noShowRisk: number })[]
  ): {
    utilizationRate: number;
    expectedNoShows: number;
    revenueEstimate: number;
    conflictsResolved: number;
  } {
    const totalAvailableTime = availableSlots.length * this.TIME_SLOT_DURATION;
    const scheduledTime = optimizedSchedule.reduce((sum, apt) => sum + apt.duration, 0);
    const utilizationRate = totalAvailableTime > 0 ? scheduledTime / totalAvailableTime : 0;

    const expectedNoShows = appointments.reduce((sum, apt) => {
      const scheduled = optimizedSchedule.find(s => s.patientId === apt.patientId);
      return scheduled ? sum + apt.noShowRisk : sum;
    }, 0);

    // Estimate revenue (simplified calculation)
    const revenueEstimate = optimizedSchedule.length * 150; // $150 average per appointment

    const conflictsResolved = appointments.length - optimizedSchedule.length;

    return {
      utilizationRate,
      expectedNoShows,
      revenueEstimate,
      conflictsResolved
    };
  }

  /**
   * Generate scheduling recommendations based on metrics
   */
  private generateSchedulingRecommendations(
    metrics: any,
    preferences: SchedulingPreferences
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.utilizationRate < 0.7) {
      recommendations.push('Consider adding more appointment slots or reducing break times to improve utilization');
    }

    if (metrics.expectedNoShows > metrics.utilizationRate * 0.2) {
      recommendations.push('High no-show risk detected - consider implementing reminder strategies');
    }

    if (metrics.conflictsResolved > 0) {
      recommendations.push(`${metrics.conflictsResolved} appointments could not be scheduled - consider extending hours or adding capacity`);
    }

    if (preferences.overbookingAllowed && metrics.utilizationRate > 0.9) {
      recommendations.push('Consider strategic overbooking to account for expected no-shows');
    }

    return recommendations;
  }

  /**
   * Generate optimization explanation
   */
  private generateOptimizationExplanation(metrics: any, scheduledCount: number): string {
    return `Successfully scheduled ${scheduledCount} appointments with ${Math.round(metrics.utilizationRate * 100)}% utilization rate. ` +
           `Expected ${Math.round(metrics.expectedNoShows)} no-shows based on historical patterns and risk analysis. ` +
           `Estimated revenue: $${Math.round(metrics.revenueEstimate)}.`;
  }

  // Additional helper methods for provider optimization...

  /**
   * Get appointment type patterns for scoring
   */
  private async getAppointmentTypePatterns(appointmentType: string, providerId: string): Promise<any> {
    // This would typically query historical data
    // For now, return default patterns
    return {
      preferredHours: [9, 10, 14, 15],
      averageDuration: 30,
      noShowRate: 0.15,
      seasonalVariation: 1.0
    };
  }

  /**
   * Score time slots for suggestions
   */
  private async scoreTimeSlots(
    slots: TimeSlot[],
    request: AppointmentRequest,
    patterns: any,
    noShowRisk: number
  ): Promise<Array<TimeSlot & { score: number }>> {
    return slots.map(slot => {
      let score = 0.5; // Base score

      const hour = slot.startTime.getHours();
      
      // Prefer hours that match appointment type patterns
      if (patterns.preferredHours.includes(hour)) {
        score += 0.3;
      }

      // Adjust for no-show risk
      score += (1 - noShowRisk) * 0.2;

      // Patient preference alignment
      if (request.preferredTimes) {
        const preferenceScore = this.calculatePatientPreferenceScore(slot, request.preferredTimes);
        score += preferenceScore * 0.3;
      }

      return {
        ...slot,
        score: Math.min(Math.max(score, 0), 1)
      };
    });
  }

  /**
   * Get provider historical data for capacity planning
   */
  private async getProviderHistoricalData(
    providerId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<any> {
    // This would query actual historical data
    // For now, return mock data
    return {
      averageAppointmentsPerDay: 20,
      averageUtilization: 0.75,
      noShowRate: 0.15,
      peakHours: [9, 10, 14, 15],
      seasonalTrends: {}
    };
  }

  /**
   * Analyze provider patterns for optimization
   */
  private async analyzeProviderPatterns(historicalData: any): Promise<any> {
    return {
      optimalCapacity: historicalData.averageAppointmentsPerDay * 1.2,
      utilizationTrend: 'stable',
      noShowPatterns: {
        byHour: { 8: 0.25, 9: 0.15, 10: 0.12, 14: 0.15, 15: 0.18 },
        byDay: { 1: 0.12, 2: 0.10, 3: 0.08, 4: 0.12, 5: 0.18 }
      },
      revenuePerSlot: 150
    };
  }

  /**
   * Calculate optimal capacity based on patterns and targets
   */
  private calculateOptimalCapacity(
    patterns: any,
    targetUtilization: number,
    riskTolerance: string
  ): number {
    const baseCapacity = patterns.optimalCapacity;
    const riskMultiplier = { low: 0.9, medium: 1.0, high: 1.1 }[riskTolerance] || 1.0;
    
    return Math.round(baseCapacity * (targetUtilization / 0.75) * riskMultiplier);
  }

  /**
   * Calculate overbooking strategy
   */
  private calculateOverbookingStrategy(
    patterns: any,
    riskTolerance: string,
    targetUtilization: number
  ): { enabled: boolean; percentage: number; timeSlots: string[] } {
    const noShowRate = patterns.noShowPatterns?.byHour ? 
      Object.values(patterns.noShowPatterns.byHour).reduce((a: number, b: number) => a + b, 0) / 
      Object.keys(patterns.noShowPatterns.byHour).length : 0.15;

    const riskMultipliers = { low: 0.5, medium: 1.0, high: 1.5 };
    const overbookingPercentage = noShowRate * riskMultipliers[riskTolerance as keyof typeof riskMultipliers];

    return {
      enabled: riskTolerance !== 'low' && targetUtilization > 0.8,
      percentage: Math.round(overbookingPercentage * 100),
      timeSlots: ['09:00', '10:00', '14:00', '15:00'] // Peak hours
    };
  }

  /**
   * Identify risk mitigation opportunities
   */
  private identifyRiskMitigation(patterns: any, historicalData: any): {
    highRiskSlots: string[];
    recommendedActions: string[];
  } {
    const highRiskSlots: string[] = [];
    const recommendedActions: string[] = [];

    // Identify high-risk time slots
    if (patterns.noShowPatterns?.byHour) {
      Object.entries(patterns.noShowPatterns.byHour).forEach(([hour, rate]) => {
        if ((rate as number) > 0.2) {
          highRiskSlots.push(`${hour}:00`);
        }
      });
    }

    // Generate recommendations
    if (highRiskSlots.length > 0) {
      recommendedActions.push('Implement additional reminder protocols for high-risk time slots');
      recommendedActions.push('Consider offering incentives for appointments during high no-show periods');
    }

    if (historicalData.averageUtilization < 0.7) {
      recommendedActions.push('Review appointment scheduling policies to improve utilization');
    }

    return { highRiskSlots, recommendedActions };
  }

  /**
   * Generate utilization forecast
   */
  private generateUtilizationForecast(
    patterns: any,
    capacity: number,
    overbookingStrategy: any
  ): { expected: number; optimistic: number; pessimistic: number } {
    const baseUtilization = patterns.optimalCapacity / capacity;
    const overbookingImpact = overbookingStrategy.enabled ? overbookingStrategy.percentage / 100 : 0;

    return {
      expected: Math.min(baseUtilization + overbookingImpact * 0.5, 0.95),
      optimistic: Math.min(baseUtilization + overbookingImpact, 1.0),
      pessimistic: Math.max(baseUtilization - 0.1, 0.5)
    };
  }
}

// Export singleton instance
export const schedulingOptimizationService = new SchedulingOptimizationService();