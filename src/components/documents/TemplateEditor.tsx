import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Eye, Settings, Users, Tag, AlertCircle, History, Workflow } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { TemplatePreview } from './TemplatePreview';
import { TemplateVersionControl } from './TemplateVersionControl';
import { TemplateApprovalWorkflow } from './TemplateApprovalWorkflow';
import { documentService } from '@/services/documentService';
import { useToast } from '@/hooks/use-toast';
import type { 
  DocumentTemplate, 
  TemplateCategory, 
  MergeField, 
  RichTextContent,
  TemplateSettings,
  ApprovalWorkflow
} from '@/types';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  template?: DocumentTemplate;
  onSave: (template: DocumentTemplate) => void;
  onCancel: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [mergeFields, setMergeFields] = useState<MergeField[]>([]);
  const [content, setContent] = useState<RichTextContent>(
    template?.content || { type: 'doc', content: [] }
  );
  const [settings, setSettings] = useState<TemplateSettings>(
    template?.settings || {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 72, right: 72, bottom: 72, left: 72 },
      fontSize: 12,
      fontFamily: 'Arial',
      lineHeight: 1.5
    }
  );
  const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalWorkflow>(
    template?.approvalWorkflow || {
      enabled: false,
      approvers: [],
      requireAllApprovals: false,
      autoActivateOnApproval: false
    }
  );
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      categoryId: template?.categoryId || '',
      tags: template?.tags || [],
      isActive: template?.isActive ?? true,
      requiresApproval: template?.requiresApproval ?? false,
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, mergeFieldsData] = await Promise.all([
        documentService.getTemplateCategories(),
        documentService.getMergeFields()
      ]);
      setCategories(categoriesData);
      setMergeFields(mergeFieldsData);
    } catch (error) {
      console.error('Failed to load template data:', error);
      toast({
        title: "Error",
        description: "Failed to load template data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags');
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags');
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async (data: TemplateFormData) => {
    setIsSaving(true);
    try {
      // Validate that content has some text
      if (!content.content || content.content.length === 0) {
        toast({
          title: "Validation Error",
          description: "Template content cannot be empty.",
          variant: "destructive"
        });
        return;
      }

      const templateData: Omit<DocumentTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        content,
        mergeFields: [], // TODO: Extract merge fields from content
        settings,
        tags: data.tags,
        isActive: data.isActive,
        requiresApproval: data.requiresApproval,
        approvalWorkflow,
        createdBy: '' // Will be set by the service
      };

      if (template) {
        // Update existing template
        await documentService.updateTemplate(template.id, templateData);
        
        // Create new version if content changed
        if (JSON.stringify(content) !== JSON.stringify(template.content)) {
          await documentService.createTemplateVersion(
            template.id,
            content,
            [], // TODO: Extract merge fields
            settings,
            'Template updated via editor'
          );
        }
        
        const updatedTemplate: DocumentTemplate = {
          ...template,
          ...templateData,
          version: template.version + 1,
          updatedAt: new Date()
        };
        
        onSave(updatedTemplate);
      } else {
        // Create new template
        const templateId = await documentService.createTemplate(templateData);
        const newTemplate: DocumentTemplate = {
          id: templateId,
          ...templateData,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        onSave(newTemplate);
      }

      toast({
        title: "Success",
        description: `Template ${template ? 'updated' : 'created'} successfully.`
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: "Error",
        description: `Failed to ${template ? 'update' : 'create'} template. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading template data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-muted-foreground">
            {template ? 'Modify the template details and content' : 'Create a new document template'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSave)}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <RichTextEditor
            content={content}
            onChange={setContent}
            mergeFields={mergeFields}
            placeholder="Start typing your template content..."
            onSave={() => form.handleSubmit(handleSave)()}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {template && (
            <TemplatePreview
              template={{
                ...template,
                name: form.watch('name') || template.name,
                content,
                settings,
                version: template.version,
                updatedAt: new Date()
              }}
              mergeFields={mergeFields}
            />
          )}
          {!template && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
                  <p className="text-muted-foreground">
                    Save the template first to see the preview with sample data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter template name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.watch('categoryId')}
                    onValueChange={(value) => form.setValue('categoryId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag}>
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('tags').map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Template</Label>
                  <p className="text-sm text-muted-foreground">
                    Active templates are available for document generation
                  </p>
                </div>
                <Switch
                  checked={form.watch('isActive')}
                  onCheckedChange={(checked) => form.setValue('isActive', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requires Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Changes to this template require approval before activation
                  </p>
                </div>
                <Switch
                  checked={form.watch('requiresApproval')}
                  onCheckedChange={(checked) => form.setValue('requiresApproval', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select
                    value={settings.pageSize}
                    onValueChange={(value: 'A4' | 'Letter' | 'Legal') => 
                      setSettings(prev => ({ ...prev, pageSize: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={settings.orientation}
                    onValueChange={(value: 'portrait' | 'landscape') => 
                      setSettings(prev => ({ ...prev, orientation: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={settings.fontSize}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 12 }))
                    }
                    min="8"
                    max="72"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={settings.fontFamily}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, fontFamily: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Margins (points)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Top</Label>
                    <Input
                      type="number"
                      value={settings.margins?.top || 72}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          margins: { ...prev.margins!, top: parseInt(e.target.value) || 72 }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Right</Label>
                    <Input
                      type="number"
                      value={settings.margins?.right || 72}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          margins: { ...prev.margins!, right: parseInt(e.target.value) || 72 }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bottom</Label>
                    <Input
                      type="number"
                      value={settings.margins?.bottom || 72}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          margins: { ...prev.margins!, bottom: parseInt(e.target.value) || 72 }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Left</Label>
                    <Input
                      type="number"
                      value={settings.margins?.left || 72}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          margins: { ...prev.margins!, left: parseInt(e.target.value) || 72 }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {template ? (
            <TemplateVersionControl
              template={template}
              onVersionRestore={(version) => {
                // Update the editor with the restored version content
                setContent(version.content);
                setSettings(version.settings);
                toast({
                  title: "Version Restored",
                  description: `Template content has been restored to version ${version.versionNumber}.`
                });
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Version History Not Available</h3>
                  <p className="text-muted-foreground">
                    Save the template first to access version control features.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approval Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Approval Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch('requiresApproval') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Approval Workflow</Label>
                        <p className="text-sm text-muted-foreground">
                          Configure approval settings for this template
                        </p>
                      </div>
                      <Switch
                        checked={approvalWorkflow.enabled}
                        onCheckedChange={(checked) => 
                          setApprovalWorkflow(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>

                    {approvalWorkflow.enabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Require All Approvals</Label>
                            <p className="text-sm text-muted-foreground">
                              All approvers must approve before activation
                            </p>
                          </div>
                          <Switch
                            checked={approvalWorkflow.requireAllApprovals}
                            onCheckedChange={(checked) => 
                              setApprovalWorkflow(prev => ({ ...prev, requireAllApprovals: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto-activate on Approval</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically activate template when approved
                            </p>
                          </div>
                          <Switch
                            checked={approvalWorkflow.autoActivateOnApproval}
                            onCheckedChange={(checked) => 
                              setApprovalWorkflow(prev => ({ ...prev, autoActivateOnApproval: checked }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Approvers</Label>
                          <p className="text-sm text-muted-foreground">
                            Configure approvers in the system settings
                          </p>
                          {/* TODO: Add approver selection interface */}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Enable "Requires Approval" in the Details tab to configure approval workflow settings.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Approval Workflow Status */}
            <div>
              {template ? (
                <TemplateApprovalWorkflow
                  template={template}
                  onApprovalStatusChange={(approvals) => {
                    console.log('Approval status updated:', approvals);
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Approval Workflow Not Available</h3>
                      <p className="text-muted-foreground">
                        Save the template first to access approval workflow features.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplateEditor;