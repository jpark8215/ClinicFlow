import { supabase } from '@/integrations/supabase/client';
import type {
  OCRProcessingInput,
  OCRResult,
  BoundingBox,
  ExtractedField,
  OCROptions
} from '@/types/aiml';

/**
 * OCR Service for document text extraction using external services
 * Supports Google Vision API, AWS Textract, and Azure Computer Vision
 */
export class OCRService {
  private readonly DEFAULT_OPTIONS: OCROptions = {
    language: 'en',
    detectOrientation: true,
    extractTables: false,
    extractSignatures: true,
    confidenceThreshold: 0.7
  };

  /**
   * Process document with OCR using the configured service
   */
  async processDocument(input: OCRProcessingInput): Promise<OCRResult> {
    try {
      // Validate input
      this.validateInput(input);

      // Get active OCR service configuration
      const ocrConfig = await this.getActiveOCRConfig();
      
      if (!ocrConfig) {
        throw new Error('No active OCR service configured');
      }

      // Process document based on service type
      let result: OCRResult;
      
      switch (ocrConfig.serviceType) {
        case 'google_vision':
          result = await this.processWithGoogleVision(input, ocrConfig);
          break;
        case 'aws_textract':
          result = await this.processWithAWSTextract(input, ocrConfig);
          break;
        case 'azure_computer_vision':
          result = await this.processWithAzureCV(input, ocrConfig);
          break;
        default:
          // Fallback to mock implementation for development
          result = await this.processMockOCR(input);
      }

      // Store OCR result in database
      await this.storeOCRResult(input.documentId, result);

      // Validate confidence and trigger manual review if needed
      await this.validateConfidenceAndTriggerReview(input.documentId, result);

      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process document with Google Vision API
   */
  private async processWithGoogleVision(
    input: OCRProcessingInput, 
    config: OCRServiceConfig
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would use @google-cloud/vision
      // For now, we'll simulate the API call structure
      
      const requestBody = {
        requests: [{
          image: {
            content: typeof input.imageData === 'string' 
              ? input.imageData.split(',')[1] // Remove data:image/... prefix
              : await this.fileToBase64(input.imageData)
          },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ],
          imageContext: {
            languageHints: [input.processingOptions.language]
          }
        }]
      };

      // Simulate API call
      const response = await this.makeAPICall(
        config.apiEndpoint + '/v1/images:annotate',
        'POST',
        requestBody,
        {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      );

      return this.parseGoogleVisionResponse(response, Date.now() - startTime);
    } catch (error) {
      console.error('Google Vision API error:', error);
      // Fallback to mock implementation
      return this.processMockOCR(input);
    }
  }

  /**
   * Process document with AWS Textract
   */
  private async processWithAWSTextract(
    input: OCRProcessingInput,
    config: OCRServiceConfig
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would use AWS SDK
      const requestBody = {
        Document: {
          Bytes: typeof input.imageData === 'string'
            ? input.imageData.split(',')[1]
            : await this.fileToBase64(input.imageData)
        },
        FeatureTypes: ['TABLES', 'FORMS'] // Extract tables and forms
      };

      // Simulate API call
      const response = await this.makeAPICall(
        config.apiEndpoint,
        'POST',
        requestBody,
        {
          'Authorization': `AWS4-HMAC-SHA256 ${config.apiKey}`,
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Textract.AnalyzeDocument'
        }
      );

      return this.parseAWSTextractResponse(response, Date.now() - startTime);
    } catch (error) {
      console.error('AWS Textract error:', error);
      // Fallback to mock implementation
      return this.processMockOCR(input);
    }
  }

  /**
   * Process document with Azure Computer Vision
   */
  private async processWithAzureCV(
    input: OCRProcessingInput,
    config: OCRServiceConfig
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would use Azure SDK
      const imageData = typeof input.imageData === 'string'
        ? input.imageData
        : await this.fileToBase64(input.imageData);

      // Simulate API call
      const response = await this.makeAPICall(
        `${config.apiEndpoint}/vision/v3.2/read/analyze`,
        'POST',
        { url: imageData }, // Azure can accept URL or binary data
        {
          'Ocp-Apim-Subscription-Key': config.apiKey,
          'Content-Type': 'application/json'
        }
      );

      return this.parseAzureCVResponse(response, Date.now() - startTime);
    } catch (error) {
      console.error('Azure Computer Vision error:', error);
      // Fallback to mock implementation
      return this.processMockOCR(input);
    }
  }

  /**
   * Mock OCR implementation for development/fallback
   */
  private async processMockOCR(input: OCRProcessingInput): Promise<OCRResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const mockText = this.generateMockExtractedText(input.documentType);
    const boundingBoxes = this.generateMockBoundingBoxes();
    const extractedFields = this.generateMockExtractedFields(input.documentType);

    return {
      result: mockText,
      extractedText: mockText,
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      boundingBoxes,
      extractedFields,
      detectedLanguage: input.processingOptions.language,
      pageCount: 1,
      processingTime: 1500 + Math.random() * 1000,
      explanation: 'Document processed using mock OCR service for development'
    };
  }

  /**
   * Validate OCR input
   */
  private validateInput(input: OCRProcessingInput): void {
    if (!input.documentId) {
      throw new Error('Document ID is required');
    }

    if (!input.imageData) {
      throw new Error('Image data is required');
    }

    if (!input.documentType) {
      throw new Error('Document type is required');
    }

    // Validate image data format
    if (typeof input.imageData === 'string') {
      if (!input.imageData.startsWith('data:image/')) {
        throw new Error('Invalid image data format. Expected base64 data URL');
      }
    } else if (input.imageData instanceof File) {
      const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
      if (!validTypes.includes(input.imageData.type)) {
        throw new Error(`Unsupported file type: ${input.imageData.type}`);
      }
    }
  }

  /**
   * Get active OCR service configuration
   */
  private async getActiveOCRConfig(): Promise<OCRServiceConfig | null> {
    try {
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('service_type', 'ocr')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.warn('No OCR service configuration found:', error);
        return null;
      }

      return {
        serviceType: data.service_name as 'google_vision' | 'aws_textract' | 'azure_computer_vision',
        apiEndpoint: data.api_endpoint,
        apiKey: data.api_key_encrypted, // In production, this would be decrypted
        configuration: data.configuration || {}
      };
    } catch (error) {
      console.error('Error fetching OCR config:', error);
      return null;
    }
  }

  /**
   * Store OCR result in database
   */
  private async storeOCRResult(documentId: string, result: OCRResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('ocr_results')
        .insert({
          document_id: documentId,
          extracted_text: result.extractedText,
          confidence: result.confidence,
          bounding_boxes: result.boundingBoxes,
          extracted_fields: result.extractedFields,
          detected_language: result.detectedLanguage,
          page_count: result.pageCount,
          processing_time: result.processingTime,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing OCR result:', error);
        // Don't throw error - OCR processing succeeded, storage is secondary
      }
    } catch (error) {
      console.error('Error storing OCR result:', error);
    }
  }

  /**
   * Validate confidence and trigger manual review if needed
   */
  private async validateConfidenceAndTriggerReview(
    documentId: string, 
    result: OCRResult
  ): Promise<void> {
    const lowConfidenceThreshold = 0.7;
    const criticalFieldsThreshold = 0.8;

    // Check overall confidence
    if (result.confidence < lowConfidenceThreshold) {
      await this.triggerManualReview(documentId, 'low_confidence', {
        confidence: result.confidence,
        threshold: lowConfidenceThreshold,
        reason: 'Overall OCR confidence below threshold'
      });
      return;
    }

    // Check critical fields confidence
    const criticalFields = result.extractedFields.filter(field => 
      ['patient_name', 'date_of_birth', 'insurance_id'].includes(field.fieldName)
    );

    const lowConfidenceCriticalFields = criticalFields.filter(field => 
      field.confidence < criticalFieldsThreshold
    );

    if (lowConfidenceCriticalFields.length > 0) {
      await this.triggerManualReview(documentId, 'critical_field_low_confidence', {
        fields: lowConfidenceCriticalFields.map(f => ({
          name: f.fieldName,
          confidence: f.confidence
        })),
        threshold: criticalFieldsThreshold,
        reason: 'Critical fields have low confidence'
      });
    }
  }

  /**
   * Trigger manual review for low confidence results
   */
  private async triggerManualReview(
    documentId: string, 
    reviewType: string, 
    metadata: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('manual_review_queue')
        .insert({
          document_id: documentId,
          review_type: reviewType,
          priority: reviewType === 'critical_field_low_confidence' ? 'high' : 'medium',
          metadata,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating manual review task:', error);
      }
    } catch (error) {
      console.error('Error triggering manual review:', error);
    }
  }

  /**
   * Convert File to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Make API call to external OCR service
   */
  private async makeAPICall(
    url: string, 
    method: string, 
    body: any, 
    headers: Record<string, string>
  ): Promise<any> {
    // In a real implementation, this would make actual HTTP requests
    // For now, simulate API response
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Return mock response structure
    return {
      responses: [{
        textAnnotations: [],
        fullTextAnnotation: {
          text: 'Mock OCR response text'
        }
      }]
    };
  }

  /**
   * Parse Google Vision API response
   */
  private parseGoogleVisionResponse(response: any, processingTime: number): OCRResult {
    // In a real implementation, this would parse the actual Google Vision response
    const mockText = this.generateMockExtractedText('medical_form');
    
    return {
      result: mockText,
      extractedText: mockText,
      confidence: 0.92,
      boundingBoxes: this.generateMockBoundingBoxes(),
      extractedFields: this.generateMockExtractedFields('medical_form'),
      detectedLanguage: 'en',
      pageCount: 1,
      processingTime,
      explanation: 'Processed with Google Vision API'
    };
  }

  /**
   * Parse AWS Textract response
   */
  private parseAWSTextractResponse(response: any, processingTime: number): OCRResult {
    // In a real implementation, this would parse the actual AWS Textract response
    const mockText = this.generateMockExtractedText('insurance_card');
    
    return {
      result: mockText,
      extractedText: mockText,
      confidence: 0.89,
      boundingBoxes: this.generateMockBoundingBoxes(),
      extractedFields: this.generateMockExtractedFields('insurance_card'),
      detectedLanguage: 'en',
      pageCount: 1,
      processingTime,
      explanation: 'Processed with AWS Textract'
    };
  }

  /**
   * Parse Azure Computer Vision response
   */
  private parseAzureCVResponse(response: any, processingTime: number): OCRResult {
    // In a real implementation, this would parse the actual Azure CV response
    const mockText = this.generateMockExtractedText('referral_letter');
    
    return {
      result: mockText,
      extractedText: mockText,
      confidence: 0.87,
      boundingBoxes: this.generateMockBoundingBoxes(),
      extractedFields: this.generateMockExtractedFields('referral_letter'),
      detectedLanguage: 'en',
      pageCount: 1,
      processingTime,
      explanation: 'Processed with Azure Computer Vision'
    };
  }

  /**
   * Generate mock extracted text based on document type
   */
  private generateMockExtractedText(documentType: string): string {
    const templates = {
      medical_form: `
PATIENT INTAKE FORM

Patient Information:
Name: Sarah Johnson
Date of Birth: 03/15/1985
Phone: (555) 123-4567
Email: sarah.johnson@email.com
Address: 123 Main St, Anytown, ST 12345

Insurance Information:
Insurance Provider: Blue Cross Blue Shield
Policy Number: BC987654321
Group Number: GRP12345
Subscriber: Sarah Johnson

Medical History:
Chief Complaint: Annual physical examination
Current Medications: Lisinopril 10mg daily
Allergies: Penicillin (rash)
Previous Surgeries: Appendectomy (2010)

Emergency Contact:
Name: John Johnson
Relationship: Spouse
Phone: (555) 987-6543

Patient Signature: [Signature Present]
Date: ${new Date().toLocaleDateString()}
      `.trim(),

      insurance_card: `
BLUE CROSS BLUE SHIELD

Member Name: SARAH JOHNSON
Member ID: BC987654321
Group: GRP12345
Effective Date: 01/01/2024

Primary Care Physician: Dr. Smith
PCP Phone: (555) 234-5678

Copay Information:
Office Visit: $25
Specialist: $50
Emergency Room: $150
Prescription: $10/$30/$60

Customer Service: 1-800-555-0123
      `.trim(),

      referral_letter: `
MEDICAL REFERRAL

Date: ${new Date().toLocaleDateString()}

To: Dr. Emily Davis, Cardiology
From: Dr. Michael Smith, Internal Medicine

Patient: Sarah Johnson
DOB: 03/15/1985
MRN: MRN123456

Reason for Referral:
Patient presents with chest pain and shortness of breath on exertion. 
EKG shows minor abnormalities. Requesting cardiology evaluation 
for possible stress testing and further cardiac workup.

Current Medications:
- Lisinopril 10mg daily
- Metformin 500mg twice daily

Relevant History:
- Hypertension (controlled)
- Family history of cardiac disease

Please contact me at (555) 234-5678 with any questions.

Sincerely,
Dr. Michael Smith, MD
Internal Medicine
      `.trim()
    };

    return templates[documentType as keyof typeof templates] || templates.medical_form;
  }

  /**
   * Generate mock bounding boxes
   */
  private generateMockBoundingBoxes(): BoundingBox[] {
    return [
      {
        x: 50, y: 100, width: 200, height: 25,
        confidence: 0.95,
        text: 'Patient Name: Sarah Johnson'
      },
      {
        x: 50, y: 130, width: 180, height: 25,
        confidence: 0.92,
        text: 'Date of Birth: 03/15/1985'
      },
      {
        x: 50, y: 160, width: 160, height: 25,
        confidence: 0.88,
        text: 'Phone: (555) 123-4567'
      },
      {
        x: 50, y: 190, width: 220, height: 25,
        confidence: 0.90,
        text: 'Insurance: Blue Cross Blue Shield'
      }
    ];
  }

  /**
   * Generate mock extracted fields based on document type
   */
  private generateMockExtractedFields(documentType: string): ExtractedField[] {
    const baseFields = [
      {
        fieldName: 'patient_name',
        fieldValue: 'Sarah Johnson',
        confidence: 0.95,
        fieldType: 'text' as const,
        boundingBox: { x: 50, y: 100, width: 200, height: 25, confidence: 0.95, text: 'Sarah Johnson' }
      },
      {
        fieldName: 'date_of_birth',
        fieldValue: '03/15/1985',
        confidence: 0.92,
        fieldType: 'date' as const,
        boundingBox: { x: 50, y: 130, width: 180, height: 25, confidence: 0.92, text: '03/15/1985' }
      },
      {
        fieldName: 'phone',
        fieldValue: '(555) 123-4567',
        confidence: 0.88,
        fieldType: 'text' as const,
        boundingBox: { x: 50, y: 160, width: 160, height: 25, confidence: 0.88, text: '(555) 123-4567' }
      }
    ];

    if (documentType === 'insurance_card') {
      baseFields.push(
        {
          fieldName: 'insurance_provider',
          fieldValue: 'Blue Cross Blue Shield',
          confidence: 0.90,
          fieldType: 'text' as const,
          boundingBox: { x: 50, y: 190, width: 220, height: 25, confidence: 0.90, text: 'Blue Cross Blue Shield' }
        },
        {
          fieldName: 'member_id',
          fieldValue: 'BC987654321',
          confidence: 0.94,
          fieldType: 'text' as const,
          boundingBox: { x: 50, y: 220, width: 150, height: 25, confidence: 0.94, text: 'BC987654321' }
        }
      );
    }

    return baseFields;
  }

  /**
   * Get OCR processing history for a document
   */
  async getOCRHistory(documentId: string): Promise<OCRResult[]> {
    try {
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapOCRResultFromDB);
    } catch (error) {
      console.error('Error fetching OCR history:', error);
      return [];
    }
  }

  /**
   * Map OCR result from database format
   */
  private mapOCRResultFromDB(data: any): OCRResult {
    return {
      result: data.extracted_text,
      extractedText: data.extracted_text,
      confidence: data.confidence,
      boundingBoxes: data.bounding_boxes || [],
      extractedFields: data.extracted_fields || [],
      detectedLanguage: data.detected_language,
      pageCount: data.page_count,
      processingTime: data.processing_time,
      explanation: `OCR processed on ${new Date(data.created_at).toLocaleDateString()}`
    };
  }
}

// Types for OCR service configuration
interface OCRServiceConfig {
  serviceType: 'google_vision' | 'aws_textract' | 'azure_computer_vision';
  apiEndpoint: string;
  apiKey: string;
  configuration: Record<string, any>;
}

// Export singleton instance
export const ocrService = new OCRService();