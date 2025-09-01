import { supabase } from '@/integrations/supabase/client';
import type { ExtractedField } from '@/types/aiml';
import type { 
  AIValidationResult, 
  ValidationError, 
  ValidationWarning, 
  AIRecommendation,
  ValidationRule,
  BusinessRuleResult
} from './automatedIntakeService';

/**
 * AI Validation Service for intelligent document validation
 * Implements business rules, ML-based validation, and exception handling
 */
export class AIValidationService {
  
  /**
   * Validate extracted data using comprehensive AI and business rules
   */
  async validateExtractedData(
    extractedFields: ExtractedField[],
    documentType: string,
    taskContext?: any
  ): Promise<AIValidationResult> {
    try {
      const validationRules = await this.getValidationRules(documentType);
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let overallConfidence = this.calculateOverallConfidence(extractedFields);
      let requiresManualReview = false;

      // 1. Confidence-based validation
      const confidenceValidation = await this.validateConfidenceScores(extractedFields, documentType);
      errors.push(...confidenceValidation.errors);
      warnings.push(...confidenceValidation.warnings);
      if (confidenceValidation.requiresReview) requiresManualReview = true;

      // 2. Required fields validation
      const requiredFieldsValidation = await this.validateRequiredFields(extractedFields, documentType);
      errors.push(...requiredFieldsValidation.errors);
      warnings.push(...requiredFieldsValidation.warnings);
      if (requiredFieldsValidation.requiresReview) requiresManualReview = true;

      // 3. Business rules validation
      const businessRulesValidation = await this.validateBusinessRules(extractedFields, documentType);
      errors.push(...businessRulesValidation.errors);
      warnings.push(...businessRulesValidation.warnings);
      if (businessRulesValidation.requiresReview) requiresManualReview = true;

      // 4. Cross-field consistency validation
      const consistencyValidation = await this.validateFieldConsistency(extractedFields);
      errors.push(...consistencyValidation.errors);
      warnings.push(...consistencyValidation.warnings);
      if (consistencyValidation.requiresReview) requiresManualReview = true;

      // 5. Duplicate detection
      const duplicateValidation = await this.validateForDuplicates(extractedFields);
      warnings.push(...duplicateValidation.warnings);
      if (duplicateValidation.requiresReview) requiresManualReview = true;

      // 6. ML-based anomaly detection
      const anomalyValidation = await this.detectAnomalies(extractedFields, documentType);
      warnings.push(...anomalyValidation.warnings);
      if (anomalyValidation.requiresReview) requiresManualReview = true;

      // Generate AI recommendations
      const recommendations = await this.generateRecommendations(
        extractedFields, 
        errors, 
        warnings, 
        documentType
      );

      return {
        isValid: errors.length === 0,
        confidence: overallConfidence,
        validationRules,
        errors,
        warnings,
        requiresManualReview,
        aiRecommendations: recommendations
      };
    } catch (error) {
      console.error('AI validation failed:', error);
      
      // Return safe fallback that requires manual review
      return {
        isValid: false,
        confidence: 0,
        validationRules: [],
        errors: [{
          type: 'validation_system_error',
          message: 'AI validation system encountered an error',
          severity: 'high',
          field: null
        }],
        warnings: [],
        requiresManualReview: true,
        aiRecommendations: [{
          type: 'system_error',
          priority: 'high',
          message: 'Manual review required due to validation system error',
          action: 'manual_review'
        }]
      };
    }
  }

  /**
   * Validate confidence scores against thresholds
   */
  private async validateConfidenceScores(
    fields: ExtractedField[],
    documentType: string
  ): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const thresholds = await this.getConfidenceThresholds(documentType);
    const overallConfidence = this.calculateOverallConfidence(fields);

    // Check overall confidence
    if (overallConfidence < thresholds.overall) {
      warnings.push({
        type: 'low_overall_confidence',
        message: `Overall confidence (${Math.round(overallConfidence * 100)}%) is below threshold (${Math.round(thresholds.overall * 100)}%)`,
        severity: 'medium',
        field: null
      });
      requiresReview = true;
    }

    // Check critical field confidence
    const criticalFields = await this.getCriticalFields(documentType);
    for (const field of fields) {
      if (criticalFields.includes(field.fieldName)) {
        if (field.confidence < thresholds.critical) {
          errors.push({
            type: 'critical_field_low_confidence',
            message: `Critical field '${field.fieldName}' has low confidence (${Math.round(field.confidence * 100)}%)`,
            severity: 'high',
            field: field.fieldName
          });
          requiresReview = true;
        }
      } else if (field.confidence < thresholds.standard) {
        warnings.push({
          type: 'field_low_confidence',
          message: `Field '${field.fieldName}' has low confidence (${Math.round(field.confidence * 100)}%)`,
          severity: 'medium',
          field: field.fieldName
        });
      }
    }

    return { errors, warnings, requiresReview };
  }

  /**
   * Validate required fields are present and valid
   */
  private async validateRequiredFields(
    fields: ExtractedField[],
    documentType: string
  ): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const requiredFields = await this.getRequiredFields(documentType);
    
    for (const requiredField of requiredFields) {
      const field = fields.find(f => f.fieldName === requiredField);
      
      if (!field) {
        errors.push({
          type: 'missing_required_field',
          message: `Required field '${requiredField}' is missing`,
          severity: 'high',
          field: requiredField
        });
        requiresReview = true;
      } else if (!field.fieldValue || field.fieldValue.trim().length === 0) {
        errors.push({
          type: 'empty_required_field',
          message: `Required field '${requiredField}' is empty`,
          severity: 'high',
          field: requiredField
        });
        requiresReview = true;
      } else if (field.fieldValue.trim().length < 2) {
        warnings.push({
          type: 'short_required_field',
          message: `Required field '${requiredField}' seems too short`,
          severity: 'medium',
          field: requiredField
        });
      }
    }

    return { errors, warnings, requiresReview };
  }

  /**
   * Apply comprehensive business rules validation
   */
  private async validateBusinessRules(
    fields: ExtractedField[],
    documentType: string
  ): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    // Get field values for easy access
    const fieldMap = new Map(fields.map(f => [f.fieldName, f.fieldValue]));

    // Rule 1: Patient name validation
    const patientName = fieldMap.get('patient_name');
    if (patientName) {
      if (patientName.length < 3) {
        errors.push({
          type: 'invalid_patient_name',
          message: 'Patient name is too short (minimum 3 characters)',
          severity: 'high',
          field: 'patient_name'
        });
      }
      
      if (!/^[A-Za-z\s.-']+$/.test(patientName)) {
        warnings.push({
          type: 'unusual_name_characters',
          message: 'Patient name contains unusual characters',
          severity: 'medium',
          field: 'patient_name'
        });
      }

      // Check for common OCR errors in names
      if (/\d/.test(patientName)) {
        errors.push({
          type: 'name_contains_numbers',
          message: 'Patient name should not contain numbers',
          severity: 'high',
          field: 'patient_name'
        });
        requiresReview = true;
      }
    }

    // Rule 2: Date of birth validation
    const dob = fieldMap.get('date_of_birth');
    if (dob) {
      const dobValidation = this.validateDateOfBirth(dob);
      if (!dobValidation.isValid) {
        errors.push({
          type: 'invalid_date_of_birth',
          message: dobValidation.message,
          severity: 'high',
          field: 'date_of_birth'
        });
        requiresReview = true;
      } else if (dobValidation.warnings.length > 0) {
        warnings.push(...dobValidation.warnings.map(w => ({
          type: 'dob_warning',
          message: w,
          severity: 'medium' as const,
          field: 'date_of_birth'
        })));
        if (dobValidation.requiresReview) requiresReview = true;
      }
    }

    // Rule 3: Phone number validation
    const phone = fieldMap.get('phone');
    if (phone) {
      const phoneValidation = this.validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        errors.push({
          type: 'invalid_phone_number',
          message: phoneValidation.message,
          severity: 'medium',
          field: 'phone'
        });
      }
    }

    // Rule 4: Email validation
    const email = fieldMap.get('email');
    if (email) {
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        errors.push({
          type: 'invalid_email',
          message: emailValidation.message,
          severity: 'medium',
          field: 'email'
        });
      }
    }

    // Rule 5: Insurance-specific validation
    if (documentType === 'insurance_card') {
      const insuranceValidation = await this.validateInsuranceFields(fieldMap);
      errors.push(...insuranceValidation.errors);
      warnings.push(...insuranceValidation.warnings);
      if (insuranceValidation.requiresReview) requiresReview = true;
    }

    // Rule 6: Medical form specific validation
    if (documentType === 'medical_history_form') {
      const medicalValidation = await this.validateMedicalFields(fieldMap);
      warnings.push(...medicalValidation.warnings);
      if (medicalValidation.requiresReview) requiresReview = true;
    }

    return { errors, warnings, requiresReview };
  }

  /**
   * Validate cross-field consistency
   */
  private async validateFieldConsistency(fields: ExtractedField[]): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const fieldMap = new Map(fields.map(f => [f.fieldName, f.fieldValue]));

    // Check name consistency across fields
    const patientName = fieldMap.get('patient_name');
    const fullName = fieldMap.get('full_name');
    
    if (patientName && fullName && patientName !== fullName) {
      const similarity = this.calculateStringSimilarity(patientName, fullName);
      if (similarity < 0.8) {
        warnings.push({
          type: 'name_inconsistency',
          message: `Patient name fields don't match: '${patientName}' vs '${fullName}'`,
          severity: 'medium',
          field: 'patient_name'
        });
        requiresReview = true;
      }
    }

    // Check date consistency
    const dob = fieldMap.get('date_of_birth');
    const birthDate = fieldMap.get('birth_date');
    
    if (dob && birthDate && dob !== birthDate) {
      warnings.push({
        type: 'date_inconsistency',
        message: `Date of birth fields don't match: '${dob}' vs '${birthDate}'`,
        severity: 'medium',
        field: 'date_of_birth'
      });
      requiresReview = true;
    }

    return { errors, warnings, requiresReview };
  }

  /**
   * Check for duplicate patient records
   */
  private async validateForDuplicates(fields: ExtractedField[]): Promise<BusinessRuleResult> {
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const fieldMap = new Map(fields.map(f => [f.fieldName, f.fieldValue]));
    const patientName = fieldMap.get('patient_name') || fieldMap.get('full_name');
    const dob = fieldMap.get('date_of_birth');

    if (patientName) {
      try {
        let query = supabase
          .from('patients')
          .select('id, full_name, date_of_birth')
          .ilike('full_name', `%${patientName}%`);

        if (dob) {
          query = query.eq('date_of_birth', dob);
        }

        const { data: duplicates, error } = await query.limit(5);

        if (error) {
          console.warn('Duplicate check failed:', error);
        } else if (duplicates && duplicates.length > 0) {
          warnings.push({
            type: 'potential_duplicate_patient',
            message: `Found ${duplicates.length} potential duplicate patient record(s)`,
            severity: 'medium',
            field: 'patient_name'
          });
          requiresReview = true;
        }
      } catch (error) {
        console.warn('Duplicate validation error:', error);
      }
    }

    return { errors: [], warnings, requiresReview };
  }

  /**
   * ML-based anomaly detection
   */
  private async detectAnomalies(
    fields: ExtractedField[],
    documentType: string
  ): Promise<BusinessRuleResult> {
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    // Anomaly 1: Unusual field value lengths
    for (const field of fields) {
      const expectedLength = this.getExpectedFieldLength(field.fieldName);
      if (expectedLength && (
        field.fieldValue.length < expectedLength.min || 
        field.fieldValue.length > expectedLength.max
      )) {
        warnings.push({
          type: 'unusual_field_length',
          message: `Field '${field.fieldName}' has unusual length (${field.fieldValue.length} characters)`,
          severity: 'low',
          field: field.fieldName
        });
      }
    }

    // Anomaly 2: Unusual character patterns
    for (const field of fields) {
      const anomalies = this.detectCharacterAnomalies(field.fieldValue, field.fieldType);
      if (anomalies.length > 0) {
        warnings.push({
          type: 'character_pattern_anomaly',
          message: `Field '${field.fieldName}' has unusual character patterns: ${anomalies.join(', ')}`,
          severity: 'low',
          field: field.fieldName
        });
      }
    }

    // Anomaly 3: Statistical outliers (simplified implementation)
    const confidenceScores = fields.map(f => f.confidence);
    const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    const stdDev = Math.sqrt(
      confidenceScores.reduce((sq, n) => sq + Math.pow(n - avgConfidence, 2), 0) / confidenceScores.length
    );

    for (const field of fields) {
      if (Math.abs(field.confidence - avgConfidence) > 2 * stdDev) {
        warnings.push({
          type: 'confidence_outlier',
          message: `Field '${field.fieldName}' confidence is a statistical outlier`,
          severity: 'low',
          field: field.fieldName
        });
      }
    }

    return { errors: [], warnings, requiresReview };
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    fields: ExtractedField[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    documentType: string
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Recommendation 1: Based on confidence scores
    const lowConfidenceFields = fields.filter(f => f.confidence < 0.8);
    if (lowConfidenceFields.length > 0) {
      recommendations.push({
        type: 'improve_ocr_quality',
        priority: 'medium',
        message: `${lowConfidenceFields.length} field(s) have low confidence. Consider rescanning with better quality.`,
        action: 'rescan_document'
      });
    }

    // Recommendation 2: Based on errors
    const criticalErrors = errors.filter(e => e.severity === 'high');
    if (criticalErrors.length > 0) {
      recommendations.push({
        type: 'manual_correction_required',
        priority: 'high',
        message: `${criticalErrors.length} critical error(s) require manual correction.`,
        action: 'manual_review'
      });
    }

    // Recommendation 3: Based on missing fields
    const missingFieldErrors = errors.filter(e => e.type === 'missing_required_field');
    if (missingFieldErrors.length > 0) {
      recommendations.push({
        type: 'complete_missing_fields',
        priority: 'high',
        message: 'Complete missing required fields before processing.',
        action: 'manual_entry'
      });
    }

    // Recommendation 4: Based on duplicates
    const duplicateWarnings = warnings.filter(w => w.type === 'potential_duplicate_patient');
    if (duplicateWarnings.length > 0) {
      recommendations.push({
        type: 'resolve_duplicates',
        priority: 'high',
        message: 'Review potential duplicate patient records before creating new patient.',
        action: 'duplicate_resolution'
      });
    }

    // Recommendation 5: Document-specific recommendations
    if (documentType === 'insurance_card') {
      const hasInsuranceProvider = fields.some(f => f.fieldName === 'insurance_provider');
      const hasMemberId = fields.some(f => f.fieldName === 'member_id');
      
      if (hasInsuranceProvider && !hasMemberId) {
        recommendations.push({
          type: 'insurance_verification',
          priority: 'high',
          message: 'Member ID is required for insurance verification.',
          action: 'manual_review'
        });
      }
    }

    // Recommendation 6: Based on overall validation status
    const overallConfidence = this.calculateOverallConfidence(fields);
    if (overallConfidence > 0.95 && errors.length === 0 && warnings.length === 0) {
      recommendations.push({
        type: 'auto_approve',
        priority: 'low',
        message: 'High confidence extraction with no issues. Safe for automatic processing.',
        action: 'auto_approve'
      });
    }

    return recommendations;
  }

  /**
   * Validate date of birth with comprehensive checks
   */
  private validateDateOfBirth(dob: string): {
    isValid: boolean;
    message: string;
    warnings: string[];
    requiresReview: boolean;
  } {
    const warnings: string[] = [];
    let requiresReview = false;

    // Check date format
    const dateFormats = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{1,2}-\d{1,2}-\d{4}$/,
      /^\d{4}-\d{1,2}-\d{1,2}$/
    ];

    const isValidFormat = dateFormats.some(format => format.test(dob));
    if (!isValidFormat) {
      return {
        isValid: false,
        message: 'Invalid date format. Expected MM/DD/YYYY, MM-DD-YYYY, or YYYY-MM-DD',
        warnings,
        requiresReview: true
      };
    }

    // Parse date
    let parsedDate: Date;
    try {
      // Handle different formats
      if (dob.includes('/')) {
        const [month, day, year] = dob.split('/').map(Number);
        parsedDate = new Date(year, month - 1, day);
      } else if (dob.includes('-')) {
        if (dob.startsWith('19') || dob.startsWith('20')) {
          // YYYY-MM-DD format
          parsedDate = new Date(dob);
        } else {
          // MM-DD-YYYY format
          const [month, day, year] = dob.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day);
        }
      } else {
        throw new Error('Unrecognized date format');
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Unable to parse date',
        warnings,
        requiresReview: true
      };
    }

    // Validate date is reasonable
    const today = new Date();
    const age = today.getFullYear() - parsedDate.getFullYear();
    
    if (parsedDate > today) {
      return {
        isValid: false,
        message: 'Date of birth cannot be in the future',
        warnings,
        requiresReview: true
      };
    }

    if (age < 0 || age > 150) {
      return {
        isValid: false,
        message: 'Date of birth results in unrealistic age',
        warnings,
        requiresReview: true
      };
    }

    // Add warnings for edge cases
    if (age < 18) {
      warnings.push('Patient appears to be a minor');
      requiresReview = true;
    }

    if (age > 100) {
      warnings.push('Patient age is over 100 years');
      requiresReview = true;
    }

    return {
      isValid: true,
      message: 'Valid date of birth',
      warnings,
      requiresReview
    };
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phone: string): { isValid: boolean; message: string } {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      return { isValid: true, message: 'Valid phone number' };
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return { isValid: true, message: 'Valid phone number with country code' };
    } else {
      return { 
        isValid: false, 
        message: `Invalid phone number format. Expected 10 digits, got ${digitsOnly.length}` 
      };
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): { isValid: boolean; message: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(email)) {
      return { isValid: true, message: 'Valid email format' };
    } else {
      return { isValid: false, message: 'Invalid email format' };
    }
  }

  /**
   * Validate insurance-specific fields
   */
  private async validateInsuranceFields(fieldMap: Map<string, string>): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const insuranceProvider = fieldMap.get('insurance_provider');
    const memberId = fieldMap.get('member_id');
    const groupNumber = fieldMap.get('group_number');

    // Insurance provider validation
    if (insuranceProvider) {
      const knownProviders = [
        'blue cross blue shield', 'aetna', 'cigna', 'humana', 
        'unitedhealth', 'kaiser', 'anthem', 'medicare', 'medicaid'
      ];
      
      const isKnownProvider = knownProviders.some(provider => 
        insuranceProvider.toLowerCase().includes(provider)
      );
      
      if (!isKnownProvider) {
        warnings.push({
          type: 'unknown_insurance_provider',
          message: 'Insurance provider not recognized in common providers list',
          severity: 'low',
          field: 'insurance_provider'
        });
      }
    }

    // Member ID validation
    if (memberId) {
      if (memberId.length < 5) {
        warnings.push({
          type: 'short_member_id',
          message: 'Member ID seems unusually short',
          severity: 'medium',
          field: 'member_id'
        });
      }
      
      if (!/^[A-Z0-9]+$/i.test(memberId)) {
        warnings.push({
          type: 'unusual_member_id_format',
          message: 'Member ID contains unusual characters',
          severity: 'low',
          field: 'member_id'
        });
      }
    }

    // Cross-field validation
    if (insuranceProvider && !memberId) {
      errors.push({
        type: 'missing_member_id',
        message: 'Insurance provider specified but member ID is missing',
        severity: 'high',
        field: 'member_id'
      });
      requiresReview = true;
    }

    return { errors, warnings, requiresReview };
  }

  /**
   * Validate medical form fields
   */
  private async validateMedicalFields(fieldMap: Map<string, string>): Promise<BusinessRuleResult> {
    const warnings: ValidationWarning[] = [];
    let requiresReview = false;

    const allergies = fieldMap.get('allergies');
    const medications = fieldMap.get('medications');
    const medicalConditions = fieldMap.get('medical_conditions');

    // Check for common medical terms
    if (allergies && allergies.toLowerCase().includes('none')) {
      // This is normal, no warning needed
    } else if (allergies && allergies.length > 200) {
      warnings.push({
        type: 'extensive_allergies',
        message: 'Extensive allergy information may need review',
        severity: 'low',
        field: 'allergies'
      });
    }

    if (medications && medications.length > 500) {
      warnings.push({
        type: 'extensive_medications',
        message: 'Extensive medication list may need clinical review',
        severity: 'medium',
        field: 'medications'
      });
      requiresReview = true;
    }

    return { errors: [], warnings, requiresReview };
  }

  /**
   * Calculate overall confidence from all fields
   */
  private calculateOverallConfidence(fields: ExtractedField[]): number {
    if (fields.length === 0) return 0;
    
    const totalConfidence = fields.reduce((sum, field) => sum + field.confidence, 0);
    return totalConfidence / fields.length;
  }

  /**
   * Calculate string similarity (simplified Levenshtein distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get expected field length ranges
   */
  private getExpectedFieldLength(fieldName: string): { min: number; max: number } | null {
    const lengthRanges: Record<string, { min: number; max: number }> = {
      'patient_name': { min: 3, max: 100 },
      'phone': { min: 10, max: 15 },
      'email': { min: 5, max: 100 },
      'member_id': { min: 5, max: 50 },
      'insurance_provider': { min: 3, max: 100 },
      'date_of_birth': { min: 8, max: 12 }
    };

    return lengthRanges[fieldName] || null;
  }

  /**
   * Detect character pattern anomalies
   */
  private detectCharacterAnomalies(value: string, fieldType: string): string[] {
    const anomalies: string[] = [];

    // Check for mixed scripts (e.g., Latin + Cyrillic)
    const hasLatin = /[A-Za-z]/.test(value);
    const hasCyrillic = /[А-Яа-я]/.test(value);
    const hasNumbers = /\d/.test(value);

    if (fieldType === 'text' && hasLatin && hasCyrillic) {
      anomalies.push('mixed Latin and Cyrillic characters');
    }

    if (fieldType === 'text' && fieldType !== 'address' && hasNumbers) {
      anomalies.push('unexpected numbers in text field');
    }

    // Check for excessive special characters
    const specialCharCount = (value.match(/[^A-Za-z0-9\s.-]/g) || []).length;
    if (specialCharCount > value.length * 0.2) {
      anomalies.push('excessive special characters');
    }

    return anomalies;
  }

  /**
   * Get validation rules for document type
   */
  private async getValidationRules(documentType: string): Promise<ValidationRule[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'confidence_threshold',
        name: 'OCR Confidence Threshold',
        description: 'Overall OCR confidence must be above threshold',
        threshold: 0.8,
        severity: 'medium'
      },
      {
        id: 'required_fields',
        name: 'Required Fields Present',
        description: 'All required fields must be extracted',
        threshold: 1.0,
        severity: 'high'
      },
      {
        id: 'business_rules',
        name: 'Business Rules Compliance',
        description: 'Data must comply with business validation rules',
        threshold: 1.0,
        severity: 'high'
      }
    ];
  }

  /**
   * Get confidence thresholds for document type
   */
  private async getConfidenceThresholds(documentType: string): Promise<{
    overall: number;
    critical: number;
    standard: number;
  }> {
    // Document-specific thresholds
    const thresholds: Record<string, any> = {
      'insurance_card': { overall: 0.85, critical: 0.90, standard: 0.75 },
      'new_patient_packet': { overall: 0.80, critical: 0.85, standard: 0.70 },
      'referral_letter': { overall: 0.75, critical: 0.80, standard: 0.65 }
    };

    return thresholds[documentType] || { overall: 0.80, critical: 0.85, standard: 0.70 };
  }

  /**
   * Get critical fields for document type
   */
  private async getCriticalFields(documentType: string): Promise<string[]> {
    const criticalFieldsMap: Record<string, string[]> = {
      'new_patient_packet': ['patient_name', 'date_of_birth', 'signature'],
      'insurance_card': ['patient_name', 'insurance_provider', 'member_id'],
      'referral_letter': ['patient_name', 'referring_provider', 'provider_signature'],
      'consent_form': ['patient_name', 'signature', 'date'],
      'id_verification': ['full_name', 'date_of_birth', 'id_number']
    };

    return criticalFieldsMap[documentType] || ['patient_name'];
  }

  /**
   * Get required fields for document type
   */
  private async getRequiredFields(documentType: string): Promise<string[]> {
    const requiredFieldsMap: Record<string, string[]> = {
      'new_patient_packet': ['patient_name', 'date_of_birth', 'phone'],
      'insurance_card': ['patient_name', 'insurance_provider', 'member_id'],
      'referral_letter': ['patient_name', 'referring_provider', 'referral_reason'],
      'medical_history_form': ['patient_name', 'date_of_birth'],
      'consent_form': ['patient_name', 'signature', 'date'],
      'lab_results': ['patient_name', 'test_date', 'test_results'],
      'id_verification': ['full_name', 'date_of_birth', 'id_number']
    };

    return requiredFieldsMap[documentType] || ['patient_name'];
  }
}

// Export singleton instance
export const aiValidationService = new AIValidationService();