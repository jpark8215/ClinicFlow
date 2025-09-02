import { supabase } from '@/integrations/supabase/client';
import type { OCRResult, ExtractedField, BoundingBox } from '@/types/aiml';

// Export ExtractedField for use in other modules
export type { ExtractedField } from '@/types/aiml';

/**
 * Data Extraction Service for intelligent field extraction from OCR results
 * Uses NLP patterns, regex, and business rules to extract structured data
 */
export class DataExtractionService {
  
  /**
   * Extract structured data from OCR results using intelligent patterns
   */
  async extractStructuredData(
    ocrResult: OCRResult,
    documentType: string
  ): Promise<StructuredExtractionResult> {
    try {
      // Get field mappings for document type
      const fieldMappings = await this.getDocumentFieldMappings(documentType);
      
      // Extract fields using multiple strategies
      const extractedFields: ExtractedField[] = [];
      const extractionLog: ExtractionLogEntry[] = [];

      for (const mapping of fieldMappings) {
        const extractionResult = await this.extractField(
          ocrResult.extractedText,
          mapping,
          ocrResult.boundingBoxes
        );

        if (extractionResult.field) {
          extractedFields.push(extractionResult.field);
        }

        extractionLog.push({
          fieldName: mapping.field_name,
          strategy: extractionResult.strategy,
          confidence: extractionResult.field?.confidence || 0,
          success: !!extractionResult.field,
          notes: extractionResult.notes
        });
      }

      // Validate extracted fields
      const validationResults = await this.validateExtractedFields(
        extractedFields,
        documentType
      );

      // Apply business rules
      const processedFields = await this.applyBusinessRules(
        extractedFields,
        documentType
      );

      return {
        extractedFields: processedFields,
        validationResults,
        extractionLog,
        overallConfidence: this.calculateOverallConfidence(processedFields),
        requiresManualReview: this.shouldRequireManualReview(processedFields, validationResults)
      };
    } catch (error) {
      console.error('Data extraction failed:', error);
      throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract a single field using multiple strategies
   */
  private async extractField(
    text: string,
    mapping: DocumentFieldMapping,
    boundingBoxes: BoundingBox[]
  ): Promise<FieldExtractionResult> {
    const strategies = [
      () => this.extractWithRegexPatterns(text, mapping),
      () => this.extractWithNLPPatterns(text, mapping),
      () => this.extractWithPositionalAnalysis(text, mapping, boundingBoxes),
      () => this.extractWithContextualClues(text, mapping)
    ];

    let bestResult: FieldExtractionResult | null = null;
    let bestConfidence = 0;

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result.field && result.field.confidence > bestConfidence) {
          bestResult = result;
          bestConfidence = result.field.confidence;
        }
      } catch (error) {
        console.warn(`Extraction strategy failed for ${mapping.field_name}:`, error);
      }
    }

    return bestResult || {
      field: null,
      strategy: 'none',
      notes: 'No extraction strategy succeeded'
    };
  }

  /**
   * Extract field using regex patterns
   */
  private async extractWithRegexPatterns(
    text: string,
    mapping: DocumentFieldMapping
  ): Promise<FieldExtractionResult> {
    const patterns = this.getRegexPatterns(mapping.field_name, mapping.field_type);
    
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const extractedValue = pattern.extractGroup ? match[pattern.extractGroup] : match[0];
        
        if (extractedValue && extractedValue.trim()) {
          const cleanedValue = this.cleanExtractedValue(extractedValue, mapping.field_type);
          const confidence = this.calculatePatternConfidence(pattern, match, text);
          
          return {
            field: {
              fieldName: mapping.field_name,
              fieldValue: cleanedValue,
              confidence,
              fieldType: mapping.field_type,
              boundingBox: this.estimateBoundingBox(text, match.index || 0, extractedValue.length)
            },
            strategy: 'regex',
            notes: `Matched pattern: ${pattern.name}`
          };
        }
      }
    }

    return {
      field: null,
      strategy: 'regex',
      notes: 'No regex patterns matched'
    };
  }

  /**
   * Extract field using NLP patterns and context
   */
  private async extractWithNLPPatterns(
    text: string,
    mapping: DocumentFieldMapping
  ): Promise<FieldExtractionResult> {
    const nlpPatterns = this.getNLPPatterns(mapping.field_name);
    
    for (const pattern of nlpPatterns) {
      const result = this.applyNLPPattern(text, pattern, mapping.field_type);
      if (result) {
        return {
          field: {
            fieldName: mapping.field_name,
            fieldValue: result.value,
            confidence: result.confidence,
            fieldType: mapping.field_type,
            boundingBox: result.boundingBox
          },
          strategy: 'nlp',
          notes: `NLP pattern: ${pattern.name}`
        };
      }
    }

    return {
      field: null,
      strategy: 'nlp',
      notes: 'No NLP patterns matched'
    };
  }

  /**
   * Extract field using positional analysis of bounding boxes
   */
  private async extractWithPositionalAnalysis(
    text: string,
    mapping: DocumentFieldMapping,
    boundingBoxes: BoundingBox[]
  ): Promise<FieldExtractionResult> {
    // Look for label-value pairs based on position
    const labelPatterns = this.getLabelPatterns(mapping.field_name);
    
    for (const labelPattern of labelPatterns) {
      const labelBox = boundingBoxes.find(box => 
        labelPattern.test(box.text.toLowerCase())
      );
      
      if (labelBox) {
        // Find nearby value box
        const valueBox = this.findNearbyValueBox(labelBox, boundingBoxes, mapping.field_type);
        
        if (valueBox) {
          const cleanedValue = this.cleanExtractedValue(valueBox.text, mapping.field_type);
          
          return {
            field: {
              fieldName: mapping.field_name,
              fieldValue: cleanedValue,
              confidence: Math.min(labelBox.confidence, valueBox.confidence),
              fieldType: mapping.field_type,
              boundingBox: valueBox
            },
            strategy: 'positional',
            notes: `Found label "${labelBox.text}" with nearby value`
          };
        }
      }
    }

    return {
      field: null,
      strategy: 'positional',
      notes: 'No positional patterns found'
    };
  }

  /**
   * Extract field using contextual clues
   */
  private async extractWithContextualClues(
    text: string,
    mapping: DocumentFieldMapping
  ): Promise<FieldExtractionResult> {
    const contextPatterns = this.getContextualPatterns(mapping.field_name);
    
    for (const pattern of contextPatterns) {
      const match = text.match(pattern.contextRegex);
      if (match) {
        const extractedValue = this.extractValueFromContext(match, pattern, mapping.field_type);
        
        if (extractedValue) {
          return {
            field: {
              fieldName: mapping.field_name,
              fieldValue: extractedValue.value,
              confidence: extractedValue.confidence,
              fieldType: mapping.field_type,
              boundingBox: this.estimateBoundingBox(text, match.index || 0, extractedValue.value.length)
            },
            strategy: 'contextual',
            notes: `Contextual pattern: ${pattern.name}`
          };
        }
      }
    }

    return {
      field: null,
      strategy: 'contextual',
      notes: 'No contextual patterns matched'
    };
  }

  /**
   * Get regex patterns for field extraction
   */
  private getRegexPatterns(fieldName: string, fieldType: string): RegexPattern[] {
    const patterns: Record<string, RegexPattern[]> = {
      patient_name: [
        {
          name: 'Name after label',
          regex: /(?:patient\s+name|name)\s*:?\s*([A-Za-z\s,.-]+)/i,
          extractGroup: 1,
          confidence: 0.9
        },
        {
          name: 'Full name pattern',
          regex: /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
          extractGroup: 1,
          confidence: 0.7
        }
      ],
      date_of_birth: [
        {
          name: 'DOB with label',
          regex: /(?:date\s+of\s+birth|dob|birth\s+date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          extractGroup: 1,
          confidence: 0.95
        },
        {
          name: 'Date pattern',
          regex: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
          extractGroup: 1,
          confidence: 0.6
        }
      ],
      phone: [
        {
          name: 'Phone with label',
          regex: /(?:phone|tel|telephone)\s*:?\s*(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/i,
          extractGroup: 1,
          confidence: 0.9
        },
        {
          name: 'Phone number pattern',
          regex: /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
          extractGroup: 1,
          confidence: 0.7
        }
      ],
      email: [
        {
          name: 'Email pattern',
          regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
          extractGroup: 1,
          confidence: 0.95
        }
      ],
      insurance_provider: [
        {
          name: 'Insurance company names',
          regex: /(blue\s+cross\s+blue\s+shield|aetna|cigna|humana|unitedhealth|kaiser|anthem)/i,
          extractGroup: 1,
          confidence: 0.9
        }
      ],
      member_id: [
        {
          name: 'Member ID with label',
          regex: /(?:member\s+id|policy\s+number|id\s+number)\s*:?\s*([A-Z0-9]+)/i,
          extractGroup: 1,
          confidence: 0.9
        }
      ]
    };

    return patterns[fieldName] || [];
  }

  /**
   * Get NLP patterns for field extraction
   */
  private getNLPPatterns(fieldName: string): NLPPattern[] {
    const patterns: Record<string, NLPPattern[]> = {
      patient_name: [
        {
          name: 'Name entity recognition',
          entityType: 'PERSON',
          contextWords: ['patient', 'name'],
          confidence: 0.8
        }
      ],
      medical_conditions: [
        {
          name: 'Medical condition extraction',
          entityType: 'MEDICAL_CONDITION',
          contextWords: ['diagnosis', 'condition', 'history'],
          confidence: 0.7
        }
      ]
    };

    return patterns[fieldName] || [];
  }

  /**
   * Get label patterns for positional analysis
   */
  private getLabelPatterns(fieldName: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      patient_name: [
        /patient\s+name/i,
        /^name$/i,
        /full\s+name/i
      ],
      date_of_birth: [
        /date\s+of\s+birth/i,
        /^dob$/i,
        /birth\s+date/i
      ],
      phone: [
        /phone/i,
        /telephone/i,
        /^tel$/i
      ],
      email: [
        /email/i,
        /e-mail/i
      ]
    };

    return patterns[fieldName] || [];
  }

  /**
   * Get contextual patterns for field extraction
   */
  private getContextualPatterns(fieldName: string): ContextualPattern[] {
    const patterns: Record<string, ContextualPattern[]> = {
      signature: [
        {
          name: 'Signature line',
          contextRegex: /signature\s*:?\s*(.{0,50})/i,
          valueExtractor: (match) => match[1]?.trim(),
          confidence: 0.8
        }
      ],
      date: [
        {
          name: 'Date context',
          contextRegex: /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          valueExtractor: (match) => match[1],
          confidence: 0.9
        }
      ]
    };

    return patterns[fieldName] || [];
  }

  /**
   * Apply NLP pattern to extract field
   */
  private applyNLPPattern(
    text: string,
    pattern: NLPPattern,
    fieldType: string
  ): NLPExtractionResult | null {
    // Simplified NLP implementation
    // In a real implementation, this would use libraries like spaCy, NLTK, or cloud NLP services
    
    const words = text.toLowerCase().split(/\s+/);
    const contextIndices = pattern.contextWords
      .map(word => words.findIndex(w => w.includes(word)))
      .filter(index => index !== -1);

    if (contextIndices.length === 0) {
      return null;
    }

    // Look for entities near context words
    const nearbyText = this.extractNearbyText(text, contextIndices, 50);
    
    // Simple entity extraction based on patterns
    let extractedValue: string | null = null;
    let confidence = pattern.confidence;

    if (pattern.entityType === 'PERSON') {
      const nameMatch = nearbyText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (nameMatch) {
        extractedValue = nameMatch[1];
      }
    }

    if (extractedValue) {
      return {
        value: extractedValue,
        confidence,
        boundingBox: this.estimateBoundingBox(text, 0, extractedValue.length)
      };
    }

    return null;
  }

  /**
   * Find nearby value box based on position
   */
  private findNearbyValueBox(
    labelBox: BoundingBox,
    boundingBoxes: BoundingBox[],
    fieldType: string
  ): BoundingBox | null {
    const candidates = boundingBoxes.filter(box => {
      // Skip the label box itself
      if (box === labelBox) return false;
      
      // Check if box is nearby (within reasonable distance)
      const horizontalDistance = Math.abs(box.x - (labelBox.x + labelBox.width));
      const verticalDistance = Math.abs(box.y - labelBox.y);
      
      return horizontalDistance < 200 && verticalDistance < 50;
    });

    // Sort by distance and return closest
    candidates.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.x - labelBox.x, 2) + Math.pow(a.y - labelBox.y, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.x - labelBox.x, 2) + Math.pow(b.y - labelBox.y, 2)
      );
      return distA - distB;
    });

    return candidates[0] || null;
  }

  /**
   * Clean extracted value based on field type
   */
  private cleanExtractedValue(value: string, fieldType: string): string {
    let cleaned = value.trim();

    switch (fieldType) {
      case 'text':
        // Remove extra whitespace and special characters
        cleaned = cleaned.replace(/\s+/g, ' ').replace(/[^\w\s.-]/g, '');
        break;
      
      case 'phone':
        // Normalize phone number format
        cleaned = cleaned.replace(/\D/g, '');
        if (cleaned.length === 10) {
          cleaned = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        break;
      
      case 'date':
        // Normalize date format
        cleaned = this.normalizeDateFormat(cleaned);
        break;
      
      case 'email':
        // Convert to lowercase
        cleaned = cleaned.toLowerCase();
        break;
    }

    return cleaned;
  }

  /**
   * Normalize date format
   */
  private normalizeDateFormat(dateStr: string): string {
    // Try to parse and reformat date
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let [, part1, part2, part3] = match;
        
        // Assume MM/DD/YYYY format for first pattern
        if (pattern === datePatterns[0]) {
          const month = part1.padStart(2, '0');
          const day = part2.padStart(2, '0');
          let year = part3;
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
          return `${month}/${day}/${year}`;
        }
      }
    }

    return dateStr;
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(
    pattern: RegexPattern,
    match: RegExpMatchArray,
    fullText: string
  ): number {
    let confidence = pattern.confidence;

    // Boost confidence if match is near expected context
    const matchIndex = match.index || 0;
    const contextBefore = fullText.slice(Math.max(0, matchIndex - 50), matchIndex);
    const contextAfter = fullText.slice(matchIndex + match[0].length, matchIndex + match[0].length + 50);
    
    // Look for field labels in context
    const fieldLabels = ['name', 'phone', 'email', 'date', 'birth', 'insurance'];
    const hasContextLabel = fieldLabels.some(label => 
      contextBefore.toLowerCase().includes(label) || contextAfter.toLowerCase().includes(label)
    );

    if (hasContextLabel) {
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return confidence;
  }

  /**
   * Estimate bounding box for extracted text
   */
  private estimateBoundingBox(text: string, startIndex: number, length: number): BoundingBox {
    // Simple estimation - in a real implementation, this would use actual OCR coordinates
    const charWidth = 8; // Average character width
    const lineHeight = 20; // Average line height
    
    return {
      x: startIndex * charWidth,
      y: 0,
      width: length * charWidth,
      height: lineHeight,
      confidence: 0.8,
      text: text.slice(startIndex, startIndex + length)
    };
  }

  /**
   * Extract nearby text around context indices
   */
  private extractNearbyText(text: string, contextIndices: number[], radius: number): string {
    const words = text.split(/\s+/);
    const startIndex = Math.max(0, Math.min(...contextIndices) - radius);
    const endIndex = Math.min(words.length, Math.max(...contextIndices) + radius);
    
    return words.slice(startIndex, endIndex).join(' ');
  }

  /**
   * Extract value from contextual match
   */
  private extractValueFromContext(
    match: RegExpMatchArray,
    pattern: ContextualPattern,
    fieldType: string
  ): { value: string; confidence: number } | null {
    const extractedValue = pattern.valueExtractor(match);
    
    if (extractedValue && extractedValue.trim()) {
      return {
        value: this.cleanExtractedValue(extractedValue, fieldType),
        confidence: pattern.confidence
      };
    }

    return null;
  }

  /**
   * Get document field mappings from database
   */
  private async getDocumentFieldMappings(documentType: string): Promise<DocumentFieldMapping[]> {
    try {
      const { data, error } = await supabase
        .from('document_field_mappings')
        .select('*')
        .eq('document_type', documentType)
        .order('is_critical', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDocumentFieldMapping);
    } catch (error) {
      console.error('Error fetching field mappings:', error);
      return [];
    }
  }

  /**
   * Map database field mapping to interface
   */
  private mapDocumentFieldMapping(data: any): DocumentFieldMapping {
    return {
      field_name: data.field_name,
      field_display_name: data.field_display_name,
      field_type: data.field_type,
      is_required: data.is_required,
      is_critical: data.is_critical,
      confidence_threshold: data.confidence_threshold,
      validation_rules: data.validation_rules || {},
      extraction_patterns: data.extraction_patterns || []
    };
  }

  /**
   * Validate extracted fields
   */
  private async validateExtractedFields(
    fields: ExtractedField[],
    documentType: string
  ): Promise<FieldValidationResult[]> {
    const results: FieldValidationResult[] = [];

    for (const field of fields) {
      const validation = await this.validateField(field, documentType);
      results.push(validation);
    }

    return results;
  }

  /**
   * Validate individual field
   */
  private async validateField(
    field: ExtractedField,
    documentType: string
  ): Promise<FieldValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation based on field type
    switch (field.fieldType) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.fieldValue)) {
          errors.push('Invalid email format');
        }
        break;
      
      case 'phone':
        if (!/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(field.fieldValue)) {
          errors.push('Invalid phone number format');
        }
        break;
      
      case 'date':
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(field.fieldValue)) {
          errors.push('Invalid date format');
        }
        break;
    }

    // Confidence validation
    if (field.confidence < 0.7) {
      warnings.push('Low confidence extraction');
    }

    return {
      fieldName: field.fieldName,
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: field.confidence
    };
  }

  /**
   * Apply business rules to extracted fields
   */
  private async applyBusinessRules(
    fields: ExtractedField[],
    documentType: string
  ): Promise<ExtractedField[]> {
    // Apply document-specific business rules
    const processedFields = [...fields];

    // Example: Cross-field validation
    const nameField = processedFields.find(f => f.fieldName === 'patient_name');
    const dobField = processedFields.find(f => f.fieldName === 'date_of_birth');

    if (nameField && dobField) {
      // Check if name and DOB are consistent with known patterns
      // This is where you'd implement more sophisticated business logic
    }

    return processedFields;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(fields: ExtractedField[]): number {
    if (fields.length === 0) return 0;

    const totalConfidence = fields.reduce((sum, field) => sum + field.confidence, 0);
    return totalConfidence / fields.length;
  }

  /**
   * Determine if manual review is required
   */
  private shouldRequireManualReview(
    fields: ExtractedField[],
    validationResults: FieldValidationResult[]
  ): boolean {
    // Require manual review if:
    // 1. Overall confidence is low
    const overallConfidence = this.calculateOverallConfidence(fields);
    if (overallConfidence < 0.8) return true;

    // 2. Any critical field has low confidence
    const criticalFields = fields.filter(f => 
      ['patient_name', 'date_of_birth', 'member_id'].includes(f.fieldName)
    );
    if (criticalFields.some(f => f.confidence < 0.85)) return true;

    // 3. Any validation errors
    if (validationResults.some(r => !r.isValid)) return true;

    return false;
  }
}

// Types for data extraction service
export interface StructuredExtractionResult {
  extractedFields: ExtractedField[];
  validationResults: FieldValidationResult[];
  extractionLog: ExtractionLogEntry[];
  overallConfidence: number;
  requiresManualReview: boolean;
}

export interface FieldExtractionResult {
  field: ExtractedField | null;
  strategy: 'regex' | 'nlp' | 'positional' | 'contextual' | 'none';
  notes: string;
}

export interface ExtractionLogEntry {
  fieldName: string;
  strategy: string;
  confidence: number;
  success: boolean;
  notes: string;
}

export interface FieldValidationResult {
  fieldName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export interface DocumentFieldMapping {
  field_name: string;
  field_display_name: string;
  field_type: string;
  is_required: boolean;
  is_critical: boolean;
  confidence_threshold: number;
  validation_rules: Record<string, any>;
  extraction_patterns: any[];
}

export interface RegexPattern {
  name: string;
  regex: RegExp;
  extractGroup?: number;
  confidence: number;
}

export interface NLPPattern {
  name: string;
  entityType: string;
  contextWords: string[];
  confidence: number;
}

export interface ContextualPattern {
  name: string;
  contextRegex: RegExp;
  valueExtractor: (match: RegExpMatchArray) => string | undefined;
  confidence: number;
}

export interface NLPExtractionResult {
  value: string;
  confidence: number;
  boundingBox: BoundingBox;
}

// Export singleton instance
export const dataExtractionService = new DataExtractionService();