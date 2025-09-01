import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Folder, 
  FolderOpen,
  Tag,
  Palette,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useToast } from '@/hooks/use-toast';
import type { TemplateCategory } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface TemplateCategoryManagerProps {
  onCategorySelect?: (category: TemplateCategory | null) => void;
  selectedCategoryId?: string;
  className?: string;
}

const iconOptions = [
  { value: 'FileCheck', label: 'File Check', icon: '📋' },
  { value: 'UserPlus', label: 'User Plus', icon: '👤' },
  { value: 'Heart', label: 'Heart', icon: '❤️' },
  { value: 'Send', label: 'Send', icon: '📤' },
  { value: 'CreditCard', label: 'Credit Card', icon: '💳' },
  { value: 'FileText', label: 'File Text', icon: '📄' },
  { value: 'Folder', label: 'Folder', icon: '📁' },
  { value: 'Tag', label: 'Tag', icon: '🏷️' },
  { value: 'Star', label: 'Star', icon: '⭐' },
  { value: 'Shield', label: 'Shield', icon: '🛡️' }
];

const colorOptions = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const TemplateCategoryManager: React.FC<TemplateCategoryManagerProps> = ({
  onCategorySelect,
  selectedCategoryId,
  className = ""
}) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: colorOptions[0],
      icon: iconOptions[0].value,
      isActive: true,
    }
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description || '',
        color: editingCategory.color || colorOptions[0],
        icon: editingCategory.icon || iconOptions[0].value,
        isActive: editingCategory.isActive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        color: colorOptions[0],
        icon: iconOptions[0].value,
        isActive: true,
      });
    }
  }, [editingCategory, form]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesData = await documentService.getTemplateCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: TemplateCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async (category: TemplateCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      // In a real implementation, this would be a soft delete or check for dependencies
      // For now, we'll just show a message
      toast({
        title: "Feature Not Implemented",
        description: "Category deletion will be implemented with dependency checking.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      const categoryData = {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        sortOrder: editingCategory?.sortOrder || categories.length + 1,
        isActive: data.isActive,
      };

      if (editingCategory) {
        // Update existing category
        // Note: This would need to be implemented in the service
        toast({
          title: "Feature Not Implemented",
          description: "Category editing will be implemented in the service layer.",
        });
      } else {
        // Create new category
        await documentService.createTemplateCategory(categoryData);
        toast({
          title: "Success",
          description: "Category created successfully."
        });
      }

      setIsDialogOpen(false);
      await loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast({
        title: "Error",
        description: "Failed to save category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveCategory = async (category: TemplateCategory, direction: 'up' | 'down') => {
    // This would implement category reordering
    toast({
      title: "Feature Not Implemented",
      description: "Category reordering will be implemented in the service layer.",
    });
  };

  const handleToggleActive = async (category: TemplateCategory) => {
    // This would toggle category active status
    toast({
      title: "Feature Not Implemented",
      description: "Category status toggle will be implemented in the service layer.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Template Categories</h3>
            <p className="text-sm text-muted-foreground">
              Organize templates into categories for better management
            </p>
          </div>
          <Button onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No categories found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first template category to get started.
                </p>
                <Button onClick={handleCreateCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <Card 
                key={category.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  selectedCategoryId === category.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onCategorySelect?.(category)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      >
                        {category.icon ? (
                          iconOptions.find(opt => opt.value === category.icon)?.icon || '📁'
                        ) : (
                          '📁'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{category.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {category.isActive ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCategory(category, 'up');
                          }}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCategory(category, 'down');
                          }}
                          disabled={index === categories.length - 1}
                        >
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Move Down
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(category);
                        }}>
                          {category.isActive ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Order: {category.sortOrder}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Category Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter category name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          form.watch('color') === color ? 'border-primary' : 'border-muted'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => form.setValue('color', color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {iconOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-8 h-8 rounded border text-sm ${
                          form.watch('icon') === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => form.setValue('icon', option.value)}
                        title={option.label}
                      >
                        {option.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Category</Label>
                  <p className="text-sm text-muted-foreground">
                    Active categories are available for template assignment
                  </p>
                </div>
                <Switch
                  checked={form.watch('isActive')}
                  onCheckedChange={(checked) => form.setValue('isActive', checked)}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TemplateCategoryManager;