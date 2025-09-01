import { NoShowPredictionInput, RiskFactor, FeatureImportance } from '@/types/aiml';

/**
 * Risk Factor Analysis Service
 * Provides SHAP/LIME-like explanations for no-show predictions
 */
export class RiskFactorAnalysisService {
  private featureNames = [
    'day_of_week', 'hour', 'is_weekend', 'is_early_morning', 'is_late_afternoon',
    'time_to_appointment', 'appointment_type', 'age_group', 'gender',
    'no_show_rate', 'appointment_frequency', 'weather_score', 'distance_score',
    'reminder_effectiveness', 'insurance_score', 'reminders_sent'
  ];

  private baselineRisk = 0.15; // Average no-show rate

  /**
   * Generate SHAP-like explanations for risk factors
   */
  generateRiskFactorExplanations(
    input: NoShowPredictionInput, 
    prediction: number,
    features: number[]
  ): RiskFactor[] {
    const explanations: RiskFactor[] = [];
    
    // Calculate feature contributions using simplified SHAP-like approach
    const contributions = this.calculateFeatureContributions(features, prediction);
    
    // Generate explanations for top contributing features
    const sortedContributions = contributions
      .map((contribution, index) => ({ index, contribution, feature: this.featureNames[index] }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 8); // Top 8 factors

    for (const { index, contribution, feature } of sortedContributions) {
      const explanation = this.generateFeatureExplanation(feature, features[index], contribution, input);
      if (explanation) {
        explanations.push(explanation);
      }
    }

    return explanations;
  }

  /**
   * Calculate feature contributions using simplified SHAP approach
   */
  private calculateFeatureContributions(features: number[], prediction: number): number[] {
    const contributions = new Array(features.length).fill(0);
    
    // Simplified SHAP calculation - in production would use actual SHAP library
    const totalContribution = prediction - this.baselineRisk;
    
    // Weight contributions based on feature values and known importance
    const featureWeights = this.getFeatureWeights();
    
    let totalWeight = 0;
    for (let i = 0; i < features.length; i++) {
      const weight = featureWeights[i] * Math.abs(features[i] - 0.5); // Distance from neutral
      contributions[i] = weight;
      totalWeight += Math.abs(weight);
    }
    
    // Normalize contributions to sum to total prediction difference
    if (totalWeight > 0) {
      for (let i = 0; i < contributions.length; i++) {
        contributions[i] = (contributions[i] / totalWeight) * totalContribution;
      }
    }
    
    return contributions;
  }

  /**
   * Get feature importance weights (would be learned from model in production)
   */
  private getFeatureWeights(): number[] {
    return [
      0.08, // day_of_week
      0.12, // hour
      0.06, // is_weekend
      0.09, // is_early_morning
      0.07, // is_late_afternoon
      0.10, // time_to_appointment
      0.08, // appointment_type
      0.05, // age_group
      0.03, // gender
      0.25, // no_show_rate (highest importance)
      0.15, // appointment_frequency
      0.08, // weather_score
      0.12, // distance_score
      0.06, // reminder_effectiveness
      0.14, // insurance_score
      0.04  // reminders_sent
    ];
  }

  /**
   * Generate human-readable explanation for a feature
   */
  private generateFeatureExplanation(
    featureName: string, 
    featureValue: number, 
    contribution: number, 
    input: NoShowPredictionInput
  ): RiskFactor | null {
    const impact = Math.abs(contribution);
    const isPositive = contribution > 0;
    
    if (impact < 0.01) return null; // Skip very low impact factors

    switch (featureName) {
      case 'no_show_rate':
        if (input.previousAppointments > 0) {
          const rate = input.previousNoShows / input.previousAppointments;
          return {
            factor: 'Historical No-Show Pattern',
            impact,
            description: `Patient has ${Math.round(rate * 100)}% no-show rate (${input.previousNoShows}/${input.previousAppointments} appointments). ${isPositive ? 'Increases' : 'Decreases'} risk significantly.`
          };
        }
        break;

      case 'appointment_frequency':
        const frequency = input.previousAppointments / Math.max(input.daysSinceLastAppointment, 1);
        return {
          factor: 'Appointment Frequency',
          impact,
          description: `Patient schedules appointments ${frequency > 0.1 ? 'frequently' : 'infrequently'} (${input.previousAppointments} appointments over ${input.daysSinceLastAppointment} days). ${isPositive ? 'Increases' : 'Decreases'} risk.`
        };

      case 'distance_score':
        if (input.distanceToClinic) {
          return {
            factor: 'Distance to Clinic',
            impact,
            description: `Patient lives ${input.distanceToClinic.toFixed(1)} miles from clinic. ${input.distanceToClinic > 15 ? 'Long distance increases' : 'Short distance decreases'} no-show risk.`
          };
        }
        break;

      case 'insurance_score':
        if (input.insuranceType) {
          const riskLevel = this.getInsuranceRiskLevel(input.insuranceType);
          return {
            factor: 'Insurance Type',
            impact,
            description: `${input.insuranceType} insurance has ${riskLevel} no-show rates. ${isPositive ? 'Increases' : 'Decreases'} risk.`
          };
        }
        break;

      case 'weather_score':
        if (input.weatherConditions) {
          const conditions = input.weatherConditions;
          let weatherDesc = 'Good weather conditions';
          if (conditions.precipitation > 0.5) weatherDesc = 'Rainy/snowy conditions';
          else if (conditions.temperature < 32 || conditions.temperature > 90) weatherDesc = 'Extreme temperatures';
          else if (conditions.windSpeed > 20) weatherDesc = 'High wind conditions';
          
          return {
            factor: 'Weather Conditions',
            impact,
            description: `${weatherDesc} on appointment day. ${isPositive ? 'Poor weather increases' : 'Good weather decreases'} no-show risk.`
          };
        }
        break;

      case 'hour':
        const hour = new Date(input.appointmentTime).getHours();
        let timeDesc = 'regular hours';
        if (hour < 9) timeDesc = 'early morning';
        else if (hour > 16) timeDesc = 'late afternoon';
        
        return {
          factor: 'Appointment Time',
          impact,
          description: `Appointment scheduled for ${timeDesc} (${hour}:00). ${isPositive ? 'Off-peak times increase' : 'Peak times decrease'} no-show risk.`
        };

      case 'day_of_week':
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[new Date(input.appointmentTime).getDay()];
        const isWeekend = [0, 6].includes(new Date(input.appointmentTime).getDay());
        
        return {
          factor: 'Day of Week',
          impact,
          description: `Appointment on ${dayName}. ${isWeekend ? 'Weekend appointments' : 'Weekday appointments'} ${isPositive ? 'increase' : 'decrease'} no-show risk.`
        };

      case 'time_to_appointment':
        const appointmentDate = new Date(input.appointmentTime);
        const daysUntil = Math.ceil((appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return {
          factor: 'Time Until Appointment',
          impact,
          description: `Appointment is ${daysUntil} days away. ${daysUntil > 14 ? 'Far future appointments' : daysUntil < 2 ? 'Last-minute appointments' : 'Near-term appointments'} ${isPositive ? 'increase' : 'decrease'} no-show risk.`
        };

      case 'age_group':
        const ageGroup = this.getAgeGroupDescription(input.patientAge);
        return {
          factor: 'Patient Age Group',
          impact,
          description: `Patient is in ${ageGroup} age group (${input.patientAge} years old). This age group ${isPositive ? 'increases' : 'decreases'} no-show risk.`
        };

      case 'appointment_type':
        return {
          factor: 'Appointment Type',
          impact,
          description: `${input.appointmentType} appointments ${isPositive ? 'have higher' : 'have lower'} no-show rates than average.`
        };

      case 'reminder_effectiveness':
        return {
          factor: 'Reminder History',
          impact,
          description: `${input.remindersSent} reminders sent. ${input.remindersSent > 0 ? 'Reminders typically reduce' : 'No reminders increases'} no-show risk.`
        };

      default:
        return null;
    }

    return null;
  }

  /**
   * Get insurance risk level description
   */
  private getInsuranceRiskLevel(insuranceType: string): string {
    const riskLevels: Record<string, string> = {
      'medicare': 'lower',
      'medicaid': 'higher',
      'private': 'lower',
      'self-pay': 'highest',
      'other': 'average'
    };
    return riskLevels[insuranceType.toLowerCase()] || 'average';
  }

  /**
   * Get age group description
   */
  private getAgeGroupDescription(age: number): string {
    if (age < 18) return 'pediatric';
    if (age < 30) return 'young adult';
    if (age < 50) return 'adult';
    if (age < 65) return 'middle-aged';
    return 'senior';
  }

  /**
   * Generate counterfactual explanations
   */
  generateCounterfactualExplanations(
    input: NoShowPredictionInput,
    currentPrediction: number
  ): Array<{ change: string; newRisk: number; impact: number }> {
    const counterfactuals = [];

    // What if reminders were sent?
    if (input.remindersSent === 0) {
      counterfactuals.push({
        change: 'Send 2 appointment reminders',
        newRisk: Math.max(0, currentPrediction - 0.15),
        impact: -0.15
      });
    }

    // What if appointment was rescheduled to better time?
    const hour = new Date(input.appointmentTime).getHours();
    if (hour < 9 || hour > 16) {
      counterfactuals.push({
        change: 'Reschedule to 10 AM - 3 PM',
        newRisk: Math.max(0, currentPrediction - 0.08),
        impact: -0.08
      });
    }

    // What if appointment was sooner?
    const daysUntil = Math.ceil((new Date(input.appointmentTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 14) {
      counterfactuals.push({
        change: 'Schedule within next 7 days',
        newRisk: Math.max(0, currentPrediction - 0.06),
        impact: -0.06
      });
    }

    // What if telehealth was offered?
    if (input.distanceToClinic && input.distanceToClinic > 15) {
      counterfactuals.push({
        change: 'Offer telehealth option',
        newRisk: Math.max(0, currentPrediction - 0.12),
        impact: -0.12
      });
    }

    return counterfactuals.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Generate feature importance ranking
   */
  generateFeatureImportanceRanking(features: number[]): FeatureImportance[] {
    const weights = this.getFeatureWeights();
    
    return this.featureNames.map((name, index) => ({
      feature: name,
      importance: weights[index] * Math.abs(features[index]),
      rank: 0 // Will be set after sorting
    }))
    .sort((a, b) => b.importance - a.importance)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /**
   * Generate risk factor summary
   */
  generateRiskFactorSummary(riskFactors: RiskFactor[]): {
    primaryFactors: RiskFactor[];
    secondaryFactors: RiskFactor[];
    totalImpact: number;
    riskCategory: 'patient_behavior' | 'appointment_logistics' | 'external_factors' | 'mixed';
  } {
    const sortedFactors = [...riskFactors].sort((a, b) => b.impact - a.impact);
    const totalImpact = riskFactors.reduce((sum, factor) => sum + factor.impact, 0);
    
    const primaryFactors = sortedFactors.slice(0, 3);
    const secondaryFactors = sortedFactors.slice(3);
    
    // Categorize risk type
    const behaviorFactors = ['Historical No-Show Pattern', 'Appointment Frequency'];
    const logisticsFactors = ['Appointment Time', 'Day of Week', 'Time Until Appointment', 'Appointment Type'];
    const externalFactors = ['Weather Conditions', 'Distance to Clinic', 'Insurance Type'];
    
    let behaviorCount = 0;
    let logisticsCount = 0;
    let externalCount = 0;
    
    primaryFactors.forEach(factor => {
      if (behaviorFactors.includes(factor.factor)) behaviorCount++;
      else if (logisticsFactors.includes(factor.factor)) logisticsCount++;
      else if (externalFactors.includes(factor.factor)) externalCount++;
    });
    
    let riskCategory: 'patient_behavior' | 'appointment_logistics' | 'external_factors' | 'mixed' = 'mixed';
    if (behaviorCount >= 2) riskCategory = 'patient_behavior';
    else if (logisticsCount >= 2) riskCategory = 'appointment_logistics';
    else if (externalCount >= 2) riskCategory = 'external_factors';
    
    return {
      primaryFactors,
      secondaryFactors,
      totalImpact,
      riskCategory
    };
  }

  /**
   * Generate intervention recommendations based on risk factors
   */
  generateInterventionRecommendations(riskFactors: RiskFactor[], riskScore: number): Array<{
    intervention: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: number;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }> {
    const recommendations = [];
    
    // High-impact, low-effort interventions
    const hasHistoricalRisk = riskFactors.some(f => f.factor === 'Historical No-Show Pattern');
    const hasTimeRisk = riskFactors.some(f => f.factor === 'Appointment Time');
    const hasDistanceRisk = riskFactors.some(f => f.factor === 'Distance to Clinic');
    const hasReminderRisk = riskFactors.some(f => f.factor === 'Reminder History');
    
    if (hasReminderRisk || riskScore > 0.7) {
      recommendations.push({
        intervention: 'Send multiple appointment reminders (24h, 2h before)',
        priority: 'high' as const,
        estimatedImpact: 0.15,
        effort: 'low' as const,
        timeline: 'Immediate'
      });
    }
    
    if (hasHistoricalRisk) {
      recommendations.push({
        intervention: 'Personal phone call to confirm attendance',
        priority: 'high' as const,
        estimatedImpact: 0.25,
        effort: 'medium' as const,
        timeline: '24-48 hours before'
      });
    }
    
    if (hasTimeRisk) {
      recommendations.push({
        intervention: 'Offer alternative appointment times (10 AM - 3 PM)',
        priority: 'medium' as const,
        estimatedImpact: 0.08,
        effort: 'low' as const,
        timeline: 'When scheduling'
      });
    }
    
    if (hasDistanceRisk) {
      recommendations.push({
        intervention: 'Offer telehealth option if clinically appropriate',
        priority: 'medium' as const,
        estimatedImpact: 0.12,
        effort: 'medium' as const,
        timeline: 'When scheduling'
      });
    }
    
    if (riskScore > 0.8) {
      recommendations.push({
        intervention: 'Consider overbooking this time slot',
        priority: 'high' as const,
        estimatedImpact: 0.0, // Doesn't reduce risk but mitigates impact
        effort: 'low' as const,
        timeline: 'Immediate'
      });
    }
    
    return recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.estimatedImpact - a.estimatedImpact;
    });
  }
}

// Export singleton instance
export const riskFactorAnalysisService = new RiskFactorAnalysisService();