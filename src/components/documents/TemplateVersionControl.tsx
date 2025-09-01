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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  GitBranch, 
  GitCommit, 
  Plus, 
  MoreVertical, 
  Eye, 
  Download, 
  Restore,
  Compare,
  Tag,
  Calendar,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Diff
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate, TemplateVersion } from '@/types';

interface TemplateVersionControlProps {
  template: DocumentTemplate;
  onVersionRestore?: (version: TemplateVersion) => void;
  className?: string;
}

const versionSchema = z.object({
  changeSummary: z.string().min(1, 'Change summary is required'),
  changeDetails: z.string().optional(),
});

type VersionFormData = z.infer<typeof versionSchema>;

interface VersionComparison {
  fromVersion: TemplateVersion;
  toVersion: TemplateVersion;
  changes: {
    type: 'added' | 'removed' | 'modified';
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

export const TemplateVersionControl: React.FC<TemplateVersionControlProps> = ({
  template,
  onVersionRestore,
  className = ""
}) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const form = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      changeSummary: '',
      changeDetails: '',
    }
  });

  useEffect(() => {
    loadVersions();
  }, [template.id]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const versionsData = await documentService.getTemplateVersions(template.id);
      setVersions(versionsData);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast({
        title: "Error",
        description: "Failed to load template versions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVersion = async (data: VersionFormData) => {
    try {
      await documentService.createTemplateVersion(
        template.id,
        template.content,
        template.mergeFields,
        template.settings,
        data.changeSummary,
        { description: data.changeDetails }
      );

      toast({
        title: "Version Created",
        description: "New template version has been created successfully."
      });

      form.reset();
      setIsCreateVersionOpen(false);
      await loadVersions();
    } catch (error) {
      console.error('Failed to create version:', error);
      toast({
        title: "Error",
        description: "Failed to create version. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRestoreVersion = async (version: TemplateVersion) => {
    if (!confirm(`Are you sure you want to restore to version ${version.versionNumber}? This will create a new version with the restored content.`)) {
      return;
    }

    try {
      // Create a new version with the restored content
      await documentService.createTemplateVersion(
        template.id,
        version.content,
        version.mergeFields,
        version.settings,
        `Restored from version ${version.versionNumber}`,
        { restoredFrom: version.id }
      );

      toast({
        title: "Version Restored",
        description: `Template has been restored to version ${version.versionNumber}.`
      });

      onVersionRestore?.(version);
      await loadVersions();
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length !== 2) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly 2 versions to compare.",
        variant: "destructive"
      });
      return;
    }

    const version1 = versions.find(v => v.id === selectedVersions[0]);
    const version2 = versions.find(v => v.id === selectedVersions[1]);

    if (!version1 || !version2) return;

    // Sort by version number to ensure consistent comparison
    const [fromVersion, toVersion] = version1.versionNumber < version2.versionNumber 
      ? [version1, version2] 
      : [version2, version1];

    // Generate comparison data (simplified)
    const changes = generateVersionChanges(fromVersion, toVersion);
    
    setComparison({
      fromVersion,
      toVersion,
      changes
    });
    setIsComparisonOpen(true);
  };

  const generateVersionChanges = (from: TemplateVersion, to: TemplateVersion) => {
    const changes: VersionComparison['changes'] = [];

    // Compare content (simplified - in real implementation, use proper diff algorithm)
    const fromContent = JSON.stringify(from.content);
    const toContent = JSON.stringify(to.content);
    if (fromContent !== toContent) {
      changes.push({
        type: 'modified',
        field: 'Content',
        oldValue: 'Previous content',
        newValue: 'Updated content'
      });
    }

    // Compare settings
    const fromSettings = JSON.stringify(from.settings);
    const toSettings = JSON.stringify(to.settings);
    if (fromSettings !== toSettings) {
      changes.push({
        type: 'modified',
        field: 'Settings',
        oldValue: 'Previous settings',
        newValue: 'Updated settings'
      });
    }

    // Compare merge fields
    const fromFields = from.mergeFields.sort().join(',');
    const toFields = to.mergeFields.sort().join(',');
    if (fromFields !== toFields) {
      changes.push({
        type: 'modified',
        field: 'Merge Fields',
        oldValue: fromFields,
        newValue: toFields
      });
    }

    return changes;
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        // Replace the first selected version
        return [prev[1], versionId];
      }
    });
  };

  const getVersionStatus = (version: TemplateVersion) => {
    if (version.versionNumber === template.version) {
      return { status: 'current', icon: CheckCircle, color: 'text-green-600' };
    }
    return { status: 'archived', icon: History, color: 'text-muted-foreground' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading versions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <CardTitle>Version History</CardTitle>
              <Badge variant="outline">{versions.length} versions</Badge>
            </div>
            <div className="flex items-center gap-2">
              {selectedVersions.length === 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareVersions}
                >
                  <Compare className="h-4 w-4 mr-1" />
                  Compare
                </Button>
              )}
              <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Version
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Version</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(handleCreateVersion)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="changeSummary">Change Summary *</Label>
                      <Input
                        id="changeSummary"
                        {...form.register('changeSummary')}
                        placeholder="Brief description of changes"
                      />
                      {form.formState.errors.changeSummary && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.changeSummary.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="changeDetails">Detailed Changes</Label>
                      <Textarea
                        id="changeDetails"
                        {...form.register('changeDetails')}
                        placeholder="Detailed description of what was changed..."
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateVersionOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        Create Version
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Version History</h3>
              <p className="text-muted-foreground mb-4">
                Create your first version to start tracking changes.
              </p>
              <Button onClick={() => setIsCreateVersionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Version
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Version Timeline */}
              <div className="relative">
                {versions.map((version, index) => {
                  const versionStatus = getVersionStatus(version);
                  const StatusIcon = versionStatus.icon;
                  const isSelected = selectedVersions.includes(version.id);

                  return (
                    <div key={version.id} className="relative">
                      {/* Timeline line */}
                      {index < versions.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                      )}

                      <div className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                      }`}>
                        {/* Version indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                            versionStatus.status === 'current' 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-muted bg-background'
                          }`}>
                            <StatusIcon className={`h-5 w-5 ${versionStatus.color}`} />
                          </div>
                          <span className="text-xs font-medium mt-1">
                            v{version.versionNumber}
                          </span>
                        </div>

                        {/* Version details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">
                                  {version.changeSummary || `Version ${version.versionNumber}`}
                                </h4>
                                {versionStatus.status === 'current' && (
                                  <Badge variant="default" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              
                              {version.changeDetails && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {typeof version.changeDetails === 'string' 
                                    ? version.changeDetails 
                                    : version.changeDetails.description
                                  }
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{version.createdBy}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{version.createdAt.toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {/* Selection checkbox for comparison */}
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleVersionSelection(version.id)}
                                disabled={selectedVersions.length >= 2 && !isSelected}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Version
                                  </DropdownMenuItem>
                                  {versionStatus.status !== 'current' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRestoreVersion(version)}
                                    >
                                      <Restore className="h-4 w-4 mr-2" />
                                      Restore Version
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection help text */}
              {selectedVersions.length > 0 && (
                <Alert>
                  <Compare className="h-4 w-4" />
                  <AlertDescription>
                    {selectedVersions.length === 1 
                      ? "Select one more version to compare changes."
                      : "Two versions selected. Click 'Compare' to see differences."
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version Comparison Dialog */}
      <Dialog open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Compare Versions: v{comparison?.fromVersion.versionNumber} → v{comparison?.toVersion.versionNumber}
            </DialogTitle>
          </DialogHeader>
          
          {comparison && (
            <div className="space-y-4">
              {/* Version info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Version {comparison.fromVersion.versionNumber}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Created:</strong> {comparison.fromVersion.createdAt.toLocaleDateString()}</p>
                    <p><strong>By:</strong> {comparison.fromVersion.createdBy}</p>
                    <p><strong>Summary:</strong> {comparison.fromVersion.changeSummary}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Version {comparison.toVersion.versionNumber}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Created:</strong> {comparison.toVersion.createdAt.toLocaleDateString()}</p>
                    <p><strong>By:</strong> {comparison.toVersion.createdBy}</p>
                    <p><strong>Summary:</strong> {comparison.toVersion.changeSummary}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Changes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Diff className="h-4 w-4" />
                    Changes ({comparison.changes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {comparison.changes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No changes detected between these versions.</p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.changes.map((change, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant={
                                change.type === 'added' ? 'default' : 
                                change.type === 'removed' ? 'destructive' : 
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {change.type}
                            </Badge>
                            <span className="font-medium text-sm">{change.field}</span>
                          </div>
                          {change.oldValue && (
                            <div className="text-xs">
                              <span className="text-red-600">- {change.oldValue}</span>
                            </div>
                          )}
                          {change.newValue && (
                            <div className="text-xs">
                              <span className="text-green-600">+ {change.newValue}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateVersionControl;