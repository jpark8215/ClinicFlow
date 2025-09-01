import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  FileText,
  Calendar,
  User,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Folder,
  Share2
} from 'lucide-react';
import { TemplateEditor } from './TemplateEditor';
import { TemplateSearchFilter } from './TemplateSearchFilter';
import { TemplateCategoryManager } from './TemplateCategoryManager';
import { TemplateSharing } from './TemplateSharing';
import { documentService } from '@/services/documentService';
import { sampleDataService } from '@/services/sampleDataService';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate, TemplateCategory, TemplateFilters } from '@/types';

export const TemplateLibrary: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<TemplateFilters>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [searchTerm, selectedCategory, showActiveOnly, activeFilters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Initialize sample data if needed
      await sampleDataService.initializeSampleData();
      
      const [templatesData, categoriesData] = await Promise.all([
        documentService.getTemplates({ isActive: showActiveOnly }),
        documentService.getTemplateCategories()
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const filters: TemplateFilters = {
        isActive: showActiveOnly ? true : undefined,
        search: searchTerm || undefined,
        categoryId: selectedCategory || undefined,
        ...activeFilters
      };

      const templatesData = await documentService.getTemplates(filters);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(false);
    setIsEditorOpen(true);
  };

  const handleDuplicateTemplate = async (template: DocumentTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        isActive: false // Start as inactive
      };
      delete (duplicatedTemplate as any).id;
      delete (duplicatedTemplate as any).version;
      delete (duplicatedTemplate as any).createdAt;
      delete (duplicatedTemplate as any).updatedAt;

      await documentService.createTemplate(duplicatedTemplate);
      await loadTemplates();
      
      toast({
        title: "Success",
        description: "Template duplicated successfully."
      });
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (template: DocumentTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await documentService.deleteTemplate(template.id);
      await loadTemplates();
      
      toast({
        title: "Success",
        description: "Template deleted successfully."
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveTemplate = async (template: DocumentTemplate) => {
    setIsEditorOpen(false);
    await loadTemplates();
  };

  const getStatusIcon = (template: DocumentTemplate) => {
    if (!template.isActive) {
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
    if (template.requiresApproval) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (template: DocumentTemplate) => {
    if (!template.isActive) return 'Inactive';
    if (template.requiresApproval) return 'Pending Approval';
    return 'Active';
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Library</h2>
          <p className="text-muted-foreground">
            Manage document templates and create new ones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsCategoryManagerOpen(true)}
          >
            <Folder className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <TemplateSearchFilter
        templates={templates}
        categories={categories}
        onFiltersChange={setActiveFilters}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory 
                  ? "Try adjusting your search criteria or filters."
                  : "Get started by creating your first template."
                }
              </p>
              {!searchTerm && !selectedCategory && (
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(template)}
                      <span className="text-sm text-muted-foreground">
                        {getStatusText(template)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        v{template.version}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedTemplate(template);
                        setIsSharingOpen(true);
                      }}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}

                {template.category && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.category.name}
                    </Badge>
                  </div>
                )}

                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Created by you
                  </div>
                </div>

                {template.requiresApproval && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This template requires approval before activation.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={selectedTemplate || undefined}
            onSave={handleSaveTemplate}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Category Manager Dialog */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Template Categories</DialogTitle>
          </DialogHeader>
          <TemplateCategoryManager
            onCategorySelect={(category) => {
              if (category) {
                setSelectedCategory(category.id);
              }
            }}
            selectedCategoryId={selectedCategory}
          />
        </DialogContent>
      </Dialog>

      {/* Template Sharing Dialog */}
      {selectedTemplate && (
        <Dialog open={isSharingOpen} onOpenChange={setIsSharingOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share Template: {selectedTemplate.name}</DialogTitle>
            </DialogHeader>
            <TemplateSharing
              template={selectedTemplate}
              onPermissionsChange={(permissions) => {
                console.log('Permissions updated:', permissions);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TemplateLibrary;