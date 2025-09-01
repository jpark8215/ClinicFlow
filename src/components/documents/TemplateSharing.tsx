import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Share2, 
  Users, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Copy,
  Mail,
  Link,
  Globe,
  Lock,
  UserCheck,
  UserX,
  Crown,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate } from '@/types';

interface TemplatePermission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  permission: 'view' | 'edit' | 'admin';
  grantedAt: Date;
  grantedBy: string;
}

interface TemplateSharingProps {
  template: DocumentTemplate;
  onPermissionsChange?: (permissions: TemplatePermission[]) => void;
  className?: string;
}

const shareSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  permission: z.enum(['view', 'edit', 'admin']),
  message: z.string().optional(),
});

type ShareFormData = z.infer<typeof shareSchema>;

const permissionLevels = [
  {
    value: 'view',
    label: 'View Only',
    description: 'Can view and use the template',
    icon: Eye,
    color: 'text-blue-600'
  },
  {
    value: 'edit',
    label: 'Edit',
    description: 'Can view, use, and modify the template',
    icon: Edit,
    color: 'text-green-600'
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access including sharing and deletion',
    icon: Crown,
    color: 'text-purple-600'
  }
];

export const TemplateSharing: React.FC<TemplateSharingProps> = ({
  template,
  onPermissionsChange,
  className = ""
}) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<TemplatePermission[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      email: '',
      permission: 'view',
      message: '',
    }
  });

  useEffect(() => {
    loadPermissions();
    generateShareLink();
  }, [template.id]);

  const loadPermissions = async () => {
    // Mock data - in real implementation, this would fetch from the API
    const mockPermissions: TemplatePermission[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Dr. Sarah Johnson',
        userEmail: 'sarah.johnson@clinic.com',
        userAvatar: '',
        permission: 'admin',
        grantedAt: new Date('2024-01-10'),
        grantedBy: 'system'
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Nurse Mary Smith',
        userEmail: 'mary.smith@clinic.com',
        userAvatar: '',
        permission: 'edit',
        grantedAt: new Date('2024-01-12'),
        grantedBy: 'user1'
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'Dr. Michael Brown',
        userEmail: 'michael.brown@clinic.com',
        userAvatar: '',
        permission: 'view',
        grantedAt: new Date('2024-01-15'),
        grantedBy: 'user1'
      }
    ];
    
    setPermissions(mockPermissions);
    onPermissionsChange?.(mockPermissions);
  };

  const generateShareLink = () => {
    // Generate a shareable link for the template
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/templates/shared/${template.id}?token=abc123`;
    setShareLink(link);
  };

  const handleShareTemplate = async (data: ShareFormData) => {
    setIsLoading(true);
    try {
      // Mock API call - in real implementation, this would call the backend
      const newPermission: TemplatePermission = {
        id: Date.now().toString(),
        userId: `user_${Date.now()}`,
        userName: data.email.split('@')[0], // Mock name from email
        userEmail: data.email,
        permission: data.permission,
        grantedAt: new Date(),
        grantedBy: 'current_user'
      };

      const updatedPermissions = [...permissions, newPermission];
      setPermissions(updatedPermissions);
      onPermissionsChange?.(updatedPermissions);

      toast({
        title: "Template Shared",
        description: `Template shared with ${data.email} with ${data.permission} permissions.`
      });

      form.reset();
      setIsShareDialogOpen(false);
    } catch (error) {
      console.error('Failed to share template:', error);
      toast({
        title: "Error",
        description: "Failed to share template. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (permissionId: string, newPermission: 'view' | 'edit' | 'admin') => {
    try {
      const updatedPermissions = permissions.map(p => 
        p.id === permissionId ? { ...p, permission: newPermission } : p
      );
      setPermissions(updatedPermissions);
      onPermissionsChange?.(updatedPermissions);

      toast({
        title: "Permission Updated",
        description: "User permission has been updated successfully."
      });
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const updatedPermissions = permissions.filter(p => p.id !== permissionId);
      setPermissions(updatedPermissions);
      onPermissionsChange?.(updatedPermissions);

      toast({
        title: "Access Removed",
        description: "User access has been removed successfully."
      });
    } catch (error) {
      console.error('Failed to remove permission:', error);
      toast({
        title: "Error",
        description: "Failed to remove access. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    try {
      setIsPublic(isPublic);
      
      toast({
        title: isPublic ? "Template Made Public" : "Template Made Private",
        description: isPublic 
          ? "Anyone with the link can now view this template."
          : "Template is now private and requires explicit permissions."
      });
    } catch (error) {
      console.error('Failed to update public status:', error);
      toast({
        title: "Error",
        description: "Failed to update sharing settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link Copied",
      description: "Share link has been copied to clipboard."
    });
  };

  const getPermissionIcon = (permission: string) => {
    const level = permissionLevels.find(p => p.value === permission);
    return level ? level.icon : Eye;
  };

  const getPermissionColor = (permission: string) => {
    const level = permissionLevels.find(p => p.value === permission);
    return level ? level.color : 'text-gray-600';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              <CardTitle>Template Sharing</CardTitle>
            </div>
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Template</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleShareTemplate)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="Enter email address"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Permission Level</Label>
                    <Select
                      value={form.watch('permission')}
                      onValueChange={(value: 'view' | 'edit' | 'admin') => 
                        form.setValue('permission', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <level.icon className={`h-4 w-4 ${level.color}`} />
                              <div>
                                <div className="font-medium">{level.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {level.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      {...form.register('message')}
                      placeholder="Add a personal message..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsShareDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Sharing...' : 'Share Template'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Public Sharing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <Label className="font-medium">Public Access</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow anyone with the link to view this template
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
              />
            </div>

            {isPublic && (
              <Alert>
                <Link className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Anyone with this link can view the template</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* User Permissions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label className="font-medium">User Permissions</Label>
              <Badge variant="secondary">{permissions.length} users</Badge>
            </div>

            {permissions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No users have been granted access to this template
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => {
                  const PermissionIcon = getPermissionIcon(permission.permission);
                  return (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={permission.userAvatar} />
                          <AvatarFallback>
                            {permission.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{permission.userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {permission.userEmail}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <PermissionIcon 
                            className={`h-4 w-4 ${getPermissionColor(permission.permission)}`} 
                          />
                          <span className="text-sm capitalize">
                            {permission.permission}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUpdatePermission(permission.id, 'view')}
                              disabled={permission.permission === 'view'}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Only
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdatePermission(permission.id, 'edit')}
                              disabled={permission.permission === 'edit'}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Access
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdatePermission(permission.id, 'admin')}
                              disabled={permission.permission === 'admin'}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Admin Access
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemovePermission(permission.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Permission Levels Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Permission Levels</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {permissionLevels.map((level) => (
                <div key={level.value} className="p-2 border rounded text-center">
                  <level.icon className={`h-4 w-4 mx-auto mb-1 ${level.color}`} />
                  <div className="text-xs font-medium">{level.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {level.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateSharing;