import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  X, 
  Tag, 
  Calendar,
  User,
  Folder,
  SortAsc,
  SortDesc,
  Grid,
  List,
  RefreshCw
} from 'lucide-react';
import type { DocumentTemplate, TemplateCategory, TemplateFilters } from '@/types';

interface TemplateSearchFilterProps {
  templates: DocumentTemplate[];
  categories: TemplateCategory[];
  onFiltersChange: (filters: TemplateFilters) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

interface FilterState {
  search: string;
  categoryIds: string[];
  tags: string[];
  isActive?: boolean;
  createdBy?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortBy: 'name' | 'created' | 'updated' | 'category';
  sortOrder: 'asc' | 'desc';
}

export const TemplateSearchFilter: React.FC<TemplateSearchFilterProps> = ({
  templates,
  categories,
  onFiltersChange,
  onViewModeChange,
  viewMode = 'grid',
  className = ""
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categoryIds: [],
    tags: [],
    isActive: undefined,
    sortBy: 'updated',
    sortOrder: 'desc'
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Extract all unique tags from templates
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Extract all unique creators
  const allCreators = useMemo(() => {
    const creatorSet = new Set<string>();
    templates.forEach(template => {
      if (template.createdBy) {
        creatorSet.add(template.createdBy);
      }
    });
    return Array.from(creatorSet).sort();
  }, [templates]);

  // Update parent component when filters change
  useEffect(() => {
    const templateFilters: TemplateFilters = {
      search: filters.search || undefined,
      categoryId: filters.categoryIds.length === 1 ? filters.categoryIds[0] : undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      isActive: filters.isActive,
      createdBy: filters.createdBy || undefined
    };

    onFiltersChange(templateFilters);
  }, [filters, onFiltersChange]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      isActive: status === 'all' ? undefined : status === 'active'
    }));
  };

  const handleCreatorChange = (creator: string) => {
    setFilters(prev => ({
      ...prev,
      createdBy: creator === 'all' ? undefined : creator
    }));
  };

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as FilterState['sortBy']
    }));
  };

  const toggleSortOrder = () => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryIds: [],
      tags: [],
      isActive: undefined,
      createdBy: undefined,
      sortBy: 'updated',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || 
    filters.categoryIds.length > 0 || 
    filters.tags.length > 0 || 
    filters.isActive !== undefined || 
    filters.createdBy;

  const activeFilterCount = [
    filters.search,
    filters.categoryIds.length > 0,
    filters.tags.length > 0,
    filters.isActive !== undefined,
    filters.createdBy
  ].filter(Boolean).length;

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Search & Filter</CardTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              {onViewModeChange && (
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, or tags..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters and Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <Select 
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'} 
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="updated">Updated Date</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="px-3"
            >
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>

            {/* Advanced Filters */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Advanced Filters</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        Categories
                      </Label>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.id}`}
                                checked={filters.categoryIds.includes(category.id)}
                                onCheckedChange={() => handleCategoryToggle(category.id)}
                              />
                              <Label
                                htmlFor={`category-${category.id}`}
                                className="text-sm flex items-center gap-2 cursor-pointer"
                              >
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: category.color || '#3B82F6' }}
                                />
                                {category.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <Separator />

                  {/* Tags */}
                  {allTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Tags
                      </Label>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {allTags.map((tag) => (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={filters.tags.includes(tag)}
                                onCheckedChange={() => handleTagToggle(tag)}
                              />
                              <Label
                                htmlFor={`tag-${tag}`}
                                className="text-sm cursor-pointer"
                              >
                                {tag}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <Separator />

                  {/* Creator */}
                  {allCreators.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Created By
                      </Label>
                      <Select 
                        value={filters.createdBy || 'all'} 
                        onValueChange={handleCreatorChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Creators</SelectItem>
                          {allCreators.map((creator) => (
                            <SelectItem key={creator} value={creator}>
                              {creator}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{filters.search}"
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSearchChange('')}
                  />
                </Badge>
              )}
              
              {filters.categoryIds.map((categoryId) => {
                const category = categories.find(c => c.id === categoryId);
                return category ? (
                  <Badge key={categoryId} variant="secondary" className="gap-1">
                    {category.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleCategoryToggle(categoryId)}
                    />
                  </Badge>
                ) : null;
              })}
              
              {filters.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleTagToggle(tag)}
                  />
                </Badge>
              ))}
              
              {filters.isActive !== undefined && (
                <Badge variant="secondary" className="gap-1">
                  {filters.isActive ? 'Active' : 'Inactive'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleStatusChange('all')}
                  />
                </Badge>
              )}
              
              {filters.createdBy && (
                <Badge variant="secondary" className="gap-1">
                  By: {filters.createdBy}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleCreatorChange('all')}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateSearchFilter;