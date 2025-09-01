import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentTemplate,
  TemplateCategory,
  MergeField,
  TemplateVersion,
  TemplateApproval,
  GeneratedDocument,
  DocumentRequest,
  TemplateFilters,
  RichTextContent,
  TemplateSettings,
  ApprovalWorkflow
} from '@/types';

export class DocumentService {
  // Template Categories
  async getTemplateCategories(): Promise<TemplateCategory[]> {
    const { data, error } = await supabase
      .from('template_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    
    return data.map(this.mapTemplateCategory);
  }

  async createTemplateCategory(category: Omit<TemplateCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('template_categories')
      .insert({
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        sort_order: category.sortOrder,
        is_active: category.isActive
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Merge Fields
  async getMergeFields(dataSource?: string): Promise<MergeField[]> {
    let query = supabase
      .from('merge_fields')
      .select('*')
      .eq('is_active', true);

    if (dataSource) {
      query = query.eq('data_source', dataSource);
    }

    const { data, error } = await query.order('display_name', { ascending: true });

    if (error) throw error;
    
    return data.map(this.mapMergeField);
  }

  async createMergeField(field: Omit<MergeField, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('merge_fields')
      .insert({
        name: field.name,
        display_name: field.displayName,
        field_type: field.fieldType,
        data_source: field.dataSource,
        description: field.description,
        validation_rules: field.validationRules,
        is_required: field.isRequired,
        is_active: field.isActive
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Document Templates
  async getTemplates(filters?: TemplateFilters): Promise<DocumentTemplate[]> {
    let query = supabase
      .from('document_templates')
      .select(`
        *,
        category:template_categories(*)
      `);

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(this.mapDocumentTemplate);
  }

  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    const { data, error } = await supabase
      .from('document_templates')
      .select(`
        *,
        category:template_categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapDocumentTemplate(data);
  }

  async createTemplate(template: Omit<DocumentTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        name: template.name,
        description: template.description,
        category_id: template.categoryId,
        content: template.content,
        merge_fields: template.mergeFields,
        settings: template.settings,
        tags: template.tags,
        is_active: template.isActive,
        requires_approval: template.requiresApproval,
        approval_workflow: template.approvalWorkflow,
        created_by: template.createdBy
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateTemplate(
    id: string, 
    updates: Partial<Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.mergeFields !== undefined) updateData.merge_fields = updates.mergeFields;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.requiresApproval !== undefined) updateData.requires_approval = updates.requiresApproval;
    if (updates.approvalWorkflow !== undefined) updateData.approval_workflow = updates.approvalWorkflow;

    const { error } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Template Versioning
  async createTemplateVersion(
    templateId: string,
    content: RichTextContent,
    mergeFields: string[] = [],
    settings: TemplateSettings = {},
    changeSummary?: string,
    changeDetails: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_template_version', {
      p_template_id: templateId,
      p_content: content,
      p_merge_fields: mergeFields,
      p_settings: settings,
      p_change_summary: changeSummary,
      p_change_details: changeDetails
    });

    if (error) throw error;
    return data;
  }

  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    
    return data.map(this.mapTemplateVersion);
  }

  async getTemplateVersion(versionId: string): Promise<TemplateVersion | null> {
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapTemplateVersion(data);
  }

  // Template Approvals
  async createTemplateApproval(
    templateId: string,
    versionId: string,
    approverId: string,
    comments?: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('template_approvals')
      .insert({
        template_id: templateId,
        version_id: versionId,
        approver_id: approverId,
        comments
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateTemplateApproval(
    approvalId: string,
    status: 'approved' | 'rejected' | 'withdrawn',
    comments?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      comments
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('template_approvals')
      .update(updateData)
      .eq('id', approvalId);

    if (error) throw error;
  }

  async getTemplateApprovals(templateId: string): Promise<TemplateApproval[]> {
    const { data, error } = await supabase
      .from('template_approvals')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(this.mapTemplateApproval);
  }

  // Document Generation
  async generateDocument(request: DocumentRequest): Promise<string> {
    const { data, error } = await supabase
      .from('generated_documents')
      .insert({
        template_id: request.templateId,
        document_name: request.documentName,
        merge_data: request.mergeData,
        generated_for_patient_id: request.patientId,
        generated_for_appointment_id: request.appointmentId,
        generation_status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;
    
    // TODO: Trigger actual document generation process
    // This would typically involve:
    // 1. Fetching the template
    // 2. Merging the data with the template
    // 3. Converting to PDF/Word format
    // 4. Storing the file
    // 5. Updating the status
    
    return data.id;
  }

  async batchGenerateDocuments(requests: DocumentRequest[]): Promise<string[]> {
    const documentIds: string[] = [];
    
    for (const request of requests) {
      const id = await this.generateDocument(request);
      documentIds.push(id);
    }
    
    return documentIds;
  }

  // Enhanced batch processing - delegates to BatchDocumentService for complex operations
  async createBatchJob(
    name: string,
    templateId: string,
    requests: Omit<DocumentRequest, 'id'>[],
    settings?: any,
    priority?: string,
    description?: string
  ): Promise<string> {
    // This method provides a bridge to the batch processing system
    // In a real implementation, this would import and use BatchDocumentService
    throw new Error('Batch processing requires BatchDocumentService. Use batchDocumentService.createBatchJob() instead.');
  }

  async getGeneratedDocuments(userId?: string): Promise<GeneratedDocument[]> {
    let query = supabase
      .from('generated_documents')
      .select('*');

    if (userId) {
      query = query.eq('generated_by', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(this.mapGeneratedDocument);
  }

  async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'completed' | 'failed',
    filePath?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      generation_status: status
    };

    if (filePath) updateData.file_path = filePath;
    if (fileSize) updateData.file_size = fileSize;
    if (errorMessage) updateData.error_message = errorMessage;

    const { error } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', documentId);

    if (error) throw error;
  }

  // Validation and Utilities
  async validateMergeFields(content: RichTextContent, mergeFields: string[]): Promise<boolean> {
    const { data, error } = await supabase.rpc('validate_template_merge_fields', {
      p_content: content,
      p_merge_fields: mergeFields
    });

    if (error) throw error;
    return data;
  }

  async getTemplateWithVersions(templateId: string): Promise<any> {
    const { data, error } = await supabase.rpc('get_template_with_versions', {
      p_template_id: templateId
    });

    if (error) throw error;
    return data[0] || null;
  }

  // Helper methods for data mapping
  private mapTemplateCategory(data: any): TemplateCategory {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapMergeField(data: any): MergeField {
    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      fieldType: data.field_type,
      dataSource: data.data_source,
      description: data.description,
      validationRules: data.validation_rules || {},
      isRequired: data.is_required,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDocumentTemplate(data: any): DocumentTemplate {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      categoryId: data.category_id,
      category: data.category ? this.mapTemplateCategory(data.category) : undefined,
      content: data.content || { type: 'doc', content: [] },
      mergeFields: data.merge_fields || [],
      settings: data.settings || {},
      tags: data.tags || [],
      version: data.version,
      isActive: data.is_active,
      requiresApproval: data.requires_approval,
      approvalWorkflow: data.approval_workflow || { enabled: false, approvers: [], requireAllApprovals: false, autoActivateOnApproval: false },
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapTemplateVersion(data: any): TemplateVersion {
    return {
      id: data.id,
      templateId: data.template_id,
      versionNumber: data.version_number,
      content: data.content || { type: 'doc', content: [] },
      mergeFields: data.merge_fields || [],
      settings: data.settings || {},
      changeSummary: data.change_summary,
      changeDetails: data.change_details || {},
      createdBy: data.created_by,
      createdAt: new Date(data.created_at)
    };
  }

  private mapTemplateApproval(data: any): TemplateApproval {
    return {
      id: data.id,
      templateId: data.template_id,
      versionId: data.version_id,
      approverId: data.approver_id,
      status: data.status,
      comments: data.comments,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapGeneratedDocument(data: any): GeneratedDocument {
    return {
      id: data.id,
      templateId: data.template_id,
      templateVersion: data.template_version,
      documentName: data.document_name,
      documentType: data.document_type,
      mergeData: data.merge_data || {},
      filePath: data.file_path,
      fileSize: data.file_size,
      generationStatus: data.generation_status,
      errorMessage: data.error_message,
      generatedBy: data.generated_by,
      generatedForPatientId: data.generated_for_patient_id,
      generatedForAppointmentId: data.generated_for_appointment_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();