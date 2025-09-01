import { documentService } from './documentService';
import type { MergeField, TemplateCategory } from '@/types';

export class SampleDataService {
  async initializeSampleData(): Promise<void> {
    try {
      // Create sample template categories
      await this.createSampleCategories();
      
      // Create sample merge fields
      await this.createSampleMergeFields();
      
      console.log('Sample data initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  }

  private async createSampleCategories(): Promise<void> {
    const categories = [
      {
        name: 'Consent Forms',
        description: 'Patient consent and authorization forms',
        color: '#3B82F6',
        icon: 'FileCheck',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Intake Forms',
        description: 'Patient intake and registration forms',
        color: '#10B981',
        icon: 'UserPlus',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Treatment Plans',
        description: 'Treatment and care plan documents',
        color: '#8B5CF6',
        icon: 'Heart',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Referral Letters',
        description: 'Specialist referral and communication letters',
        color: '#F59E0B',
        icon: 'Send',
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Insurance Forms',
        description: 'Insurance and billing related documents',
        color: '#EF4444',
        icon: 'CreditCard',
        sortOrder: 5,
        isActive: true
      },
      {
        name: 'Discharge Summaries',
        description: 'Patient discharge and follow-up summaries',
        color: '#06B6D4',
        icon: 'FileText',
        sortOrder: 6,
        isActive: true
      }
    ];

    for (const category of categories) {
      try {
        await documentService.createTemplateCategory(category);
      } catch (error) {
        // Category might already exist, continue
        console.log(`Category ${category.name} might already exist`);
      }
    }
  }

  private async createSampleMergeFields(): Promise<void> {
    const mergeFields: Omit<MergeField, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Patient fields
      {
        name: 'patient.firstName',
        displayName: 'Patient First Name',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s first name',
        validationRules: { required: true, maxLength: 50 },
        isRequired: true,
        isActive: true
      },
      {
        name: 'patient.lastName',
        displayName: 'Patient Last Name',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s last name',
        validationRules: { required: true, maxLength: 50 },
        isRequired: true,
        isActive: true
      },
      {
        name: 'patient.fullName',
        displayName: 'Patient Full Name',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s full name (first + last)',
        validationRules: { required: true, maxLength: 100 },
        isRequired: true,
        isActive: true
      },
      {
        name: 'patient.dateOfBirth',
        displayName: 'Date of Birth',
        fieldType: 'date',
        dataSource: 'patient',
        description: 'Patient\'s date of birth',
        validationRules: { required: true },
        isRequired: true,
        isActive: true
      },
      {
        name: 'patient.age',
        displayName: 'Patient Age',
        fieldType: 'number',
        dataSource: 'patient',
        description: 'Patient\'s current age',
        validationRules: { min: 0, max: 150 },
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.gender',
        displayName: 'Gender',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s gender',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.email',
        displayName: 'Email Address',
        fieldType: 'email',
        dataSource: 'patient',
        description: 'Patient\'s email address',
        validationRules: { format: 'email' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.phone',
        displayName: 'Phone Number',
        fieldType: 'phone',
        dataSource: 'patient',
        description: 'Patient\'s primary phone number',
        validationRules: { format: 'phone' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.address',
        displayName: 'Address',
        fieldType: 'address',
        dataSource: 'patient',
        description: 'Patient\'s home address',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.insuranceProvider',
        displayName: 'Insurance Provider',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s insurance provider name',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.insuranceId',
        displayName: 'Insurance ID',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s insurance ID number',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'patient.medicalRecordNumber',
        displayName: 'Medical Record Number',
        fieldType: 'text',
        dataSource: 'patient',
        description: 'Patient\'s medical record number',
        validationRules: {},
        isRequired: false,
        isActive: true
      },

      // Appointment fields
      {
        name: 'appointment.id',
        displayName: 'Appointment ID',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Unique appointment identifier',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'appointment.date',
        displayName: 'Appointment Date',
        fieldType: 'date',
        dataSource: 'appointment',
        description: 'Date of the appointment',
        validationRules: { required: true },
        isRequired: true,
        isActive: true
      },
      {
        name: 'appointment.time',
        displayName: 'Appointment Time',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Time of the appointment',
        validationRules: { required: true },
        isRequired: true,
        isActive: true
      },
      {
        name: 'appointment.duration',
        displayName: 'Appointment Duration',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Duration of the appointment',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'appointment.type',
        displayName: 'Appointment Type',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Type of appointment (consultation, follow-up, etc.)',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'appointment.reason',
        displayName: 'Reason for Visit',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Reason for the appointment',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'appointment.notes',
        displayName: 'Appointment Notes',
        fieldType: 'text',
        dataSource: 'appointment',
        description: 'Additional notes about the appointment',
        validationRules: {},
        isRequired: false,
        isActive: true
      },

      // Provider fields
      {
        name: 'provider.fullName',
        displayName: 'Provider Name',
        fieldType: 'text',
        dataSource: 'provider',
        description: 'Healthcare provider\'s full name',
        validationRules: { required: true },
        isRequired: true,
        isActive: true
      },
      {
        name: 'provider.title',
        displayName: 'Provider Title',
        fieldType: 'text',
        dataSource: 'provider',
        description: 'Provider\'s professional title',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'provider.licenseNumber',
        displayName: 'License Number',
        fieldType: 'text',
        dataSource: 'provider',
        description: 'Provider\'s medical license number',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'provider.npi',
        displayName: 'NPI Number',
        fieldType: 'text',
        dataSource: 'provider',
        description: 'Provider\'s National Provider Identifier',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'provider.department',
        displayName: 'Department',
        fieldType: 'text',
        dataSource: 'provider',
        description: 'Provider\'s department or specialty',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'provider.email',
        displayName: 'Provider Email',
        fieldType: 'email',
        dataSource: 'provider',
        description: 'Provider\'s email address',
        validationRules: { format: 'email' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'provider.phone',
        displayName: 'Provider Phone',
        fieldType: 'phone',
        dataSource: 'provider',
        description: 'Provider\'s phone number',
        validationRules: { format: 'phone' },
        isRequired: false,
        isActive: true
      },

      // Clinic fields
      {
        name: 'clinic.name',
        displayName: 'Clinic Name',
        fieldType: 'text',
        dataSource: 'clinic',
        description: 'Name of the clinic or medical facility',
        validationRules: { required: true },
        isRequired: true,
        isActive: true
      },
      {
        name: 'clinic.address',
        displayName: 'Clinic Address',
        fieldType: 'address',
        dataSource: 'clinic',
        description: 'Clinic\'s physical address',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'clinic.phone',
        displayName: 'Clinic Phone',
        fieldType: 'phone',
        dataSource: 'clinic',
        description: 'Clinic\'s main phone number',
        validationRules: { format: 'phone' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'clinic.fax',
        displayName: 'Clinic Fax',
        fieldType: 'phone',
        dataSource: 'clinic',
        description: 'Clinic\'s fax number',
        validationRules: { format: 'phone' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'clinic.email',
        displayName: 'Clinic Email',
        fieldType: 'email',
        dataSource: 'clinic',
        description: 'Clinic\'s email address',
        validationRules: { format: 'email' },
        isRequired: false,
        isActive: true
      },
      {
        name: 'clinic.website',
        displayName: 'Clinic Website',
        fieldType: 'text',
        dataSource: 'clinic',
        description: 'Clinic\'s website URL',
        validationRules: {},
        isRequired: false,
        isActive: true
      },

      // Custom/System fields
      {
        name: 'system.currentDate',
        displayName: 'Current Date',
        fieldType: 'date',
        dataSource: 'custom',
        description: 'Current system date',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'system.currentTime',
        displayName: 'Current Time',
        fieldType: 'text',
        dataSource: 'custom',
        description: 'Current system time',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'document.id',
        displayName: 'Document ID',
        fieldType: 'text',
        dataSource: 'custom',
        description: 'Unique document identifier',
        validationRules: {},
        isRequired: false,
        isActive: true
      },
      {
        name: 'document.pageNumber',
        displayName: 'Page Number',
        fieldType: 'number',
        dataSource: 'custom',
        description: 'Current page number',
        validationRules: {},
        isRequired: false,
        isActive: true
      }
    ];

    for (const field of mergeFields) {
      try {
        await documentService.createMergeField(field);
      } catch (error) {
        // Field might already exist, continue
        console.log(`Merge field ${field.name} might already exist`);
      }
    }
  }
}

export const sampleDataService = new SampleDataService();