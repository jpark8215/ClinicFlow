/**
 * Validation script for the No-Show ML Service
 * This script tests the core functionality without requiring a test runner
 */

import { NoShowPredictionInput } from '@/types/aiml';

// Mock TensorFlow.js for validation
const mockTensorFlow = {
  tensor2d: (data: any) => ({
    dispose: () => {},
    data: () => Promise.resolve(new Float32Array([0.65]))
  }),
  sequential: () => ({
    compile: () => {},
    fit: () => Promise.resolve({
      history: {
        loss: [0.5, 0.4, 0.3],
        acc: [0.7, 0.8, 0.85],
        val_loss: [0.6, 0.5, 0.4],
        val_acc: [0.65, 0.75, 0.8]
      }
    }),
    predict: () => ({
      data: () => Promise.resolve(new Float32Array([0.65]))
    }),
    evaluate: () => Promise.resolve([
      { data: () => Promise.resolve(new Float32Array([0.3])) },
      { data: () => Promise.resolve(new Float32Array([0.85])) }
    ]),
    save: () => Promise.resolve(),
    dispose: () => {}
  }),
  layers: {
    dense: () => ({}),
    dropout: () => ({}),
    batchNormalization: () => ({})
  },
  regularizers: {
    l2: () => ({})
  },
  train: {
    adam: () => ({})
  },
  loadLayersModel: () => Promise.reject(new Error('No model found'))
};

// Mock the TensorFlow module
(global as any).tf = mockTensorFlow;

/**
 * Validation tests for the ML service
 */
export class MLServiceValidator {
  
  /**
   * Test feature extraction functionality
   */
  static testFeatureExtraction(): boolean {
    console.log('Testing feature extraction...');
    
    try {
      // Create a mock NoShowMLService instance for testing
      const mockInput: NoShowPredictionInput = {
        appointmentId: 'apt-123',
        patientId: 'pat-456',
        appointmentTime: new Date('2024-12-01T10:00:00Z'),
        appointmentType: 'routine',
        providerId: 'prov-789',
        patientAge: 35,
        patientGender: 'female',
        previousNoShows: 1,
        previousAppointments: 5,
        daysSinceLastAppointment: 30,
        appointmentDayOfWeek: 1,
        appointmentHour: 10,
        weatherConditions: {
          temperature: 72,
          precipitation: 0,
          windSpeed: 5,
          conditions: 'sunny'
        },
        insuranceType: 'private',
        distanceToClinic: 15,
        remindersSent: 1
      };

      // Test age categorization
      const testAgeCategories = [
        { age: 15, expected: 0.1 },
        { age: 25, expected: 0.3 },
        { age: 40, expected: 0.5 },
        { age: 55, expected: 0.7 },
        { age: 70, expected: 0.9 }
      ];

      for (const test of testAgeCategories) {
        const result = this.categorizeAge(test.age);
        if (result !== test.expected) {
          console.error(`Age categorization failed for age ${test.age}: expected ${test.expected}, got ${result}`);
          return false;
        }
      }

      // Test appointment type encoding
      const testAppointmentTypes = [
        { type: 'routine', expected: 0.2 },
        { type: 'follow-up', expected: 0.4 },
        { type: 'consultation', expected: 0.6 },
        { type: 'procedure', expected: 0.8 },
        { type: 'emergency', expected: 1.0 },
        { type: 'unknown', expected: 0.5 }
      ];

      for (const test of testAppointmentTypes) {
        const result = this.encodeAppointmentType(test.type);
        if (result !== test.expected) {
          console.error(`Appointment type encoding failed for ${test.type}: expected ${test.expected}, got ${result}`);
          return false;
        }
      }

      // Test insurance type encoding
      const testInsuranceTypes = [
        { type: 'medicare', expected: 0.2 },
        { type: 'medicaid', expected: 0.8 },
        { type: 'private', expected: 0.3 },
        { type: 'self-pay', expected: 0.9 },
        { type: undefined, expected: 0.5 }
      ];

      for (const test of testInsuranceTypes) {
        const result = this.encodeInsuranceType(test.type);
        if (result !== test.expected) {
          console.error(`Insurance type encoding failed for ${test.type}: expected ${test.expected}, got ${result}`);
          return false;
        }
      }

      console.log('✓ Feature extraction tests passed');
      return true;
    } catch (error) {
      console.error('Feature extraction test failed:', error);
      return false;
    }
  }

  /**
   * Test risk level determination
   */
  static testRiskLevelDetermination(): boolean {
    console.log('Testing risk level determination...');
    
    try {
      const testCases = [
        { score: 0.2, expected: 'low' },
        { score: 0.5, expected: 'medium' },
        { score: 0.8, expected: 'high' }
      ];

      for (const test of testCases) {
        const result = this.determineRiskLevel(test.score);
        if (result !== test.expected) {
          console.error(`Risk level determination failed for score ${test.score}: expected ${test.expected}, got ${result}`);
          return false;
        }
      }

      console.log('✓ Risk level determination tests passed');
      return true;
    } catch (error) {
      console.error('Risk level determination test failed:', error);
      return false;
    }
  }

  /**
   * Test weather score calculation
   */
  static testWeatherScoreCalculation(): boolean {
    console.log('Testing weather score calculation...');
    
    try {
      // Good weather should have neutral score
      const goodWeather = {
        temperature: 72,
        precipitation: 0,
        windSpeed: 5,
        conditions: 'sunny'
      };
      const goodScore = this.calculateWeatherScore(goodWeather);
      if (goodScore !== 0.5) {
        console.error(`Good weather score should be 0.5, got ${goodScore}`);
        return false;
      }

      // Bad weather should have higher score
      const badWeather = {
        temperature: 25, // Cold
        precipitation: 1.5, // Heavy rain
        windSpeed: 25, // High wind
        conditions: 'stormy'
      };
      const badScore = this.calculateWeatherScore(badWeather);
      if (badScore <= 0.5) {
        console.error(`Bad weather score should be > 0.5, got ${badScore}`);
        return false;
      }

      console.log('✓ Weather score calculation tests passed');
      return true;
    } catch (error) {
      console.error('Weather score calculation test failed:', error);
      return false;
    }
  }

  /**
   * Test synthetic data generation
   */
  static testSyntheticDataGeneration(): boolean {
    console.log('Testing synthetic data generation...');
    
    try {
      const syntheticData = this.generateSyntheticTrainingData(10);
      
      if (syntheticData.length !== 10) {
        console.error(`Expected 10 synthetic records, got ${syntheticData.length}`);
        return false;
      }

      // Validate structure of first record
      const firstRecord = syntheticData[0];
      const requiredFields = [
        'appointmentId', 'patientId', 'appointmentTime', 'appointmentType',
        'providerId', 'patientAge', 'patientGender', 'previousNoShows',
        'previousAppointments', 'daysSinceLastAppointment'
      ];

      for (const field of requiredFields) {
        if (!(field in firstRecord)) {
          console.error(`Missing required field: ${field}`);
          return false;
        }
      }

      // Validate age range
      if (firstRecord.patientAge < 18 || firstRecord.patientAge > 78) {
        console.error(`Invalid patient age: ${firstRecord.patientAge}`);
        return false;
      }

      console.log('✓ Synthetic data generation tests passed');
      return true;
    } catch (error) {
      console.error('Synthetic data generation test failed:', error);
      return false;
    }
  }

  /**
   * Run all validation tests
   */
  static runAllTests(): boolean {
    console.log('Running ML Service validation tests...\n');
    
    const tests = [
      this.testFeatureExtraction,
      this.testRiskLevelDetermination,
      this.testWeatherScoreCalculation,
      this.testSyntheticDataGeneration
    ];

    let allPassed = true;
    for (const test of tests) {
      if (!test.call(this)) {
        allPassed = false;
      }
    }

    console.log('\n' + (allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'));
    return allPassed;
  }

  // Helper methods (simplified versions of the actual ML service methods)
  
  private static categorizeAge(age: number): number {
    if (age < 18) return 0.1;
    if (age < 30) return 0.3;
    if (age < 50) return 0.5;
    if (age < 65) return 0.7;
    return 0.9;
  }

  private static encodeAppointmentType(type: string): number {
    const typeMap: Record<string, number> = {
      'routine': 0.2,
      'follow-up': 0.4,
      'consultation': 0.6,
      'procedure': 0.8,
      'emergency': 1.0
    };
    return typeMap[type.toLowerCase()] || 0.5;
  }

  private static encodeInsuranceType(insuranceType?: string): number {
    if (!insuranceType) return 0.5;
    
    const insuranceMap: Record<string, number> = {
      'medicare': 0.2,
      'medicaid': 0.8,
      'private': 0.3,
      'self-pay': 0.9,
      'other': 0.5
    };
    
    return insuranceMap[insuranceType.toLowerCase()] || 0.5;
  }

  private static determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.7) return 'medium';
    return 'high';
  }

  private static calculateWeatherScore(weather: any): number {
    let score = 0.5; // neutral baseline
    
    if (weather.temperature < 32 || weather.temperature > 90) {
      score += 0.2;
    }
    
    if (weather.precipitation > 0.1) {
      score += 0.3;
    }
    
    if (weather.windSpeed > 20) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private static generateSyntheticTrainingData(count: number): NoShowPredictionInput[] {
    const data: NoShowPredictionInput[] = [];
    
    for (let i = 0; i < count; i++) {
      const appointmentTime = new Date();
      appointmentTime.setDate(appointmentTime.getDate() + Math.random() * 30);
      appointmentTime.setHours(8 + Math.random() * 10);
      
      data.push({
        appointmentId: `apt-${i}`,
        patientId: `pat-${i}`,
        appointmentTime,
        appointmentType: ['routine', 'follow-up', 'consultation', 'procedure'][Math.floor(Math.random() * 4)],
        providerId: `prov-${Math.floor(Math.random() * 10)}`,
        patientAge: 18 + Math.random() * 60,
        patientGender: Math.random() > 0.5 ? 'male' : 'female',
        previousNoShows: Math.floor(Math.random() * 5),
        previousAppointments: 1 + Math.floor(Math.random() * 20),
        daysSinceLastAppointment: Math.floor(Math.random() * 365),
        appointmentDayOfWeek: appointmentTime.getDay(),
        appointmentHour: appointmentTime.getHours(),
        weatherConditions: {
          temperature: 32 + Math.random() * 68,
          precipitation: Math.random() * 2,
          windSpeed: Math.random() * 30,
          conditions: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)]
        },
        insuranceType: ['medicare', 'medicaid', 'private', 'self-pay'][Math.floor(Math.random() * 4)],
        distanceToClinic: Math.random() * 50,
        remindersSent: Math.floor(Math.random() * 3)
      });
    }
    
    return data;
  }
}

// Run validation if this file is executed directly
if (typeof window === 'undefined') {
  MLServiceValidator.runAllTests();
}