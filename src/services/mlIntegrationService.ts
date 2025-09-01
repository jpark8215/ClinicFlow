import { supabase } from '@/integrations/supabase/client';
import { noShowMLService } from './noShowMLService';
import { NoShowPredictionInput, NoShowPrediction } from '@/types/aiml';

/**
 * Integration service to connect ML predictions with the appointment system
 */
export class MLIntegrationService {
  /**
   * Get no-show prediction for an appointment
   */
  async getAppointmentRiskPrediction(appointmentId: string): Promise<NoShowPrediction | null> {
    try {
      // Fetch appointment data with patient information
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            date_of_birth,
            gender,
            insurance_type,
            address
          ),
          providers (
            id,
            first_name,
            last_name
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        console.error('Error fetching appointment:', appointmentError);
        return null;
      }

      // Get patient's appointment history
      const { data: appointmentHistory, error: historyError } = await supabase
        .from('appointments')
        .select('status, appointment_time')
        .eq('patient_id', appointment.patient_id)
        .order('appointment_time', { ascending: false });

      if (historyError) {
        console.error('Error fetching appointment history:', historyError);
      }

      // Calculate historical metrics
      const previousAppointments = appointmentHistory?.length || 0;
      const previousNoShows = appointmentHistory?.filter(apt => apt.status === 'No-Show').length || 0;
      
      // Calculate days since last appointment
      let daysSinceLastAppointment = 365; // Default to 1 year if no history
      if (appointmentHistory && appointmentHistory.length > 1) {
        const lastAppointment = new Date(appointmentHistory[1].appointment_time);
        const currentAppointment = new Date(appointment.appointment_time);
        daysSinceLastAppointment = Math.floor(
          (currentAppointment.getTime() - lastAppointment.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate patient age
      const patientAge = appointment.patients 
        ? this.calculateAge(new Date(appointment.patients.date_of_birth))
        : 35; // Default age if not available

      // Get weather data (mock for now - would integrate with weather API)
      const weatherConditions = await this.getWeatherData(appointment.appointment_time);

      // Calculate distance to clinic (mock for now - would use geocoding)
      const distanceToClinic = this.calculateDistanceToClinic(appointment.patients?.address);

      // Count reminders sent (mock for now - would track actual reminders)
      const remindersSent = this.countRemindersSent(appointmentId);

      // Prepare input for ML model
      const mlInput: NoShowPredictionInput = {
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        appointmentTime: new Date(appointment.appointment_time),
        appointmentType: appointment.appointment_type || 'routine',
        providerId: appointment.provider_id,
        patientAge,
        patientGender: appointment.patients?.gender || 'unknown',
        previousNoShows,
        previousAppointments,
        daysSinceLastAppointment,
        appointmentDayOfWeek: new Date(appointment.appointment_time).getDay(),
        appointmentHour: new Date(appointment.appointment_time).getHours(),
        weatherConditions,
        insuranceType: appointment.patients?.insurance_type,
        distanceToClinic,
        remindersSent
      };

      // Get prediction from ML service
      const prediction = await noShowMLService.predictNoShowRisk(mlInput);

      // Store prediction in database for tracking
      await this.storePrediction(appointmentId, prediction);

      return prediction;

    } catch (error) {
      console.error('Error getting appointment risk prediction:', error);
      return null;
    }
  }

  /**
   * Get batch predictions for multiple appointments
   */
  async getBatchRiskPredictions(appointmentIds: string[]): Promise<Map<string, NoShowPrediction>> {
    const predictions = new Map<string, NoShowPrediction>();

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < appointmentIds.length; i += batchSize) {
      const batch = appointmentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (id) => {
        const prediction = await this.getAppointmentRiskPrediction(id);
        if (prediction) {
          predictions.set(id, prediction);
        }
      });

      await Promise.all(batchPromises);
    }

    return predictions;
  }

  /**
   * Update prediction with actual outcome for model improvement
   */
  async updatePredictionOutcome(appointmentId: string, actualOutcome: 'show' | 'no-show'): Promise<void> {
    try {
      const { error } = await supabase
        .from('prediction_results')
        .update({
          actual_outcome: { outcome: actualOutcome },
          updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId);

      if (error) {
        console.error('Error updating prediction outcome:', error);
      }
    } catch (error) {
      console.error('Error updating prediction outcome:', error);
    }
  }

  /**
   * Get predictions for appointments in a date range
   */
  async getPredictionsForDateRange(startDate: Date, endDate: Date, clinicId?: string): Promise<NoShowPrediction[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('id')
        .gte('appointment_time', startDate.toISOString())
        .lte('appointment_time', endDate.toISOString());

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data: appointments, error } = await query;

      if (error || !appointments) {
        console.error('Error fetching appointments for date range:', error);
        return [];
      }

      const appointmentIds = appointments.map(apt => apt.id);
      const predictions = await this.getBatchRiskPredictions(appointmentIds);

      return Array.from(predictions.values());
    } catch (error) {
      console.error('Error getting predictions for date range:', error);
      return [];
    }
  }

  /**
   * Get high-risk appointments for proactive intervention
   */
  async getHighRiskAppointments(date: Date, riskThreshold: number = 0.7): Promise<Array<{
    appointmentId: string;
    prediction: NoShowPrediction;
    appointmentDetails: any;
  }>> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .gte('appointment_time', startOfDay.toISOString())
        .lte('appointment_time', endOfDay.toISOString())
        .eq('status', 'Confirmed');

      if (error || !appointments) {
        console.error('Error fetching appointments:', error);
        return [];
      }

      const highRiskAppointments = [];

      for (const appointment of appointments) {
        const prediction = await this.getAppointmentRiskPrediction(appointment.id);
        
        if (prediction && prediction.riskScore >= riskThreshold) {
          highRiskAppointments.push({
            appointmentId: appointment.id,
            prediction,
            appointmentDetails: appointment
          });
        }
      }

      return highRiskAppointments.sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);
    } catch (error) {
      console.error('Error getting high-risk appointments:', error);
      return [];
    }
  }

  /**
   * Train model with historical data
   */
  async trainModelWithHistoricalData(months: number = 12): Promise<void> {
    try {
      console.log(`Training model with ${months} months of historical data...`);

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      // Fetch historical appointments with outcomes
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            date_of_birth,
            gender,
            insurance_type,
            address
          )
        `)
        .gte('appointment_time', cutoffDate.toISOString())
        .in('status', ['Completed', 'No-Show']);

      if (error || !appointments) {
        console.error('Error fetching historical appointments:', error);
        return;
      }

      console.log(`Found ${appointments.length} historical appointments`);

      const trainingData: NoShowPredictionInput[] = [];
      const labels: number[] = [];

      for (const appointment of appointments) {
        // Get patient's appointment history up to this appointment
        const { data: priorHistory } = await supabase
          .from('appointments')
          .select('status, appointment_time')
          .eq('patient_id', appointment.patient_id)
          .lt('appointment_time', appointment.appointment_time)
          .order('appointment_time', { ascending: false });

        const previousAppointments = priorHistory?.length || 0;
        const previousNoShows = priorHistory?.filter(apt => apt.status === 'No-Show').length || 0;

        let daysSinceLastAppointment = 365;
        if (priorHistory && priorHistory.length > 0) {
          const lastAppointment = new Date(priorHistory[0].appointment_time);
          const currentAppointment = new Date(appointment.appointment_time);
          daysSinceLastAppointment = Math.floor(
            (currentAppointment.getTime() - lastAppointment.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        const patientAge = appointment.patients 
          ? this.calculateAge(new Date(appointment.patients.date_of_birth))
          : 35;

        const weatherConditions = await this.getWeatherData(appointment.appointment_time);
        const distanceToClinic = this.calculateDistanceToClinic(appointment.patients?.address);
        const remindersSent = this.countRemindersSent(appointment.id);

        const mlInput: NoShowPredictionInput = {
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          appointmentTime: new Date(appointment.appointment_time),
          appointmentType: appointment.appointment_type || 'routine',
          providerId: appointment.provider_id,
          patientAge,
          patientGender: appointment.patients?.gender || 'unknown',
          previousNoShows,
          previousAppointments,
          daysSinceLastAppointment,
          appointmentDayOfWeek: new Date(appointment.appointment_time).getDay(),
          appointmentHour: new Date(appointment.appointment_time).getHours(),
          weatherConditions,
          insuranceType: appointment.patients?.insurance_type,
          distanceToClinic,
          remindersSent
        };

        trainingData.push(mlInput);
        labels.push(appointment.status === 'No-Show' ? 1 : 0);
      }

      if (trainingData.length > 0) {
        await noShowMLService.retrainModel(trainingData, labels);
        console.log('Model training completed successfully');
      } else {
        console.log('No training data available');
      }
    } catch (error) {
      console.error('Error training model with historical data:', error);
    }
  }

  /**
   * Calculate patient age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get weather data for appointment time (mock implementation)
   */
  private async getWeatherData(appointmentTime: string): Promise<any> {
    // Mock weather data - in production, would integrate with weather API
    return {
      temperature: 70 + Math.random() * 30,
      precipitation: Math.random() * 2,
      windSpeed: Math.random() * 20,
      conditions: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)]
    };
  }

  /**
   * Calculate distance to clinic (mock implementation)
   */
  private calculateDistanceToClinic(address?: any): number {
    // Mock distance calculation - in production, would use geocoding
    return Math.random() * 50;
  }

  /**
   * Count reminders sent for appointment (mock implementation)
   */
  private countRemindersSent(appointmentId: string): number {
    // Mock reminder count - in production, would track actual reminders
    return Math.floor(Math.random() * 3);
  }

  /**
   * Store prediction in database
   */
  private async storePrediction(appointmentId: string, prediction: NoShowPrediction): Promise<void> {
    try {
      const { error } = await supabase
        .from('prediction_results')
        .upsert({
          appointment_id: appointmentId,
          model_id: 'no-show-model-v1',
          prediction_type: 'no_show_risk',
          input_data: { appointmentId },
          prediction: {
            riskScore: prediction.riskScore,
            riskLevel: prediction.riskLevel,
            factors: prediction.factors,
            recommendations: prediction.recommendations
          },
          confidence: prediction.riskScore,
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing prediction:', error);
      }
    } catch (error) {
      console.error('Error storing prediction:', error);
    }
  }
}

// Export singleton instance
export const mlIntegrationService = new MLIntegrationService();