import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Calendar, 
  User, 
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Settings,
  Users,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate } from '@/types';

interface AuditLogEntry {
  id: string;
  templateId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'shared' | 'approved' | 'rejected' | 'restored' | 'exported';
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

interface TemplateAuditLogProps {
  template?: DocumentTemplate;
  showAllTemplates?: boolean;
  className?: string;
}

export const TemplateAuditLog: React.FC<TemplateAuditLogProps> = ({
  template,
  showAllTemplates = false,
  className = ""
}) => {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7d');

  useEffect(() => {
    loadAuditLogs();
  }, [template?.id, showAllTemplates, actionFilter, userFilter, dateRange]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      // Mock audit log data - in real implementation, this would fetch from the API
      const mockLogs: AuditLogEntry[] = [
        {
          id: '1',
          templateId: template?.id || 'template1',
          action: 'created',
          description: 'Template created with initial content',
          userId: 'user1',
          userName: 'Dr. Sarah Johnson',
          userEmail: 'sarah.johnson@clinic.com',
          timestamp: new Date('2024-01-10T09:00:00'),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          riskLevel: 'low'
        },
        {
          id: '2',
          templateId: template?.id || 'template1',
          action: 'updated',
          description: 'Template content modified - added new merge fields',
          userId: 'user1',
          userName: 'Dr. Sarah Johnson',
          userEmail: 'sarah.johnson@clinic.com',
          timestamp: new Date('2024-01-12T14:30:00'),
          ipAddress: '192.168.1.100',
          metadata: { fieldsAdded: ['patient.insurance', 'appointment.notes'] },
          riskLevel: 'medium'
        },
        {
          id: '3',
          templateId: template?.id || 'template1',
          action: 'shared',
          description: 'Template shared with Nurse Mary Smith (edit permissions)',
          userId: 'user1',
          userName: 'Dr. Sarah Johnson',
          userEmail: 'sarah.johnson@clinic.com',
          timestamp: new Date('2024-01-13T11:15:00'),
          ipAddress: '192.168.1.100',
          metadata: { sharedWith: 'mary.smith@clinic.com', permission: 'edit' },
          riskLevel: 'low'
        },
        {
          id: '4',
          templateId: template?.id || 'template1',
          action: 'approved',
          description: 'Template approved by compliance officer',
          userId: 'user2',
          userName: 'Compliance Officer',
          userEmail: 'compliance@clinic.com',
          timestamp: new Date('2024-01-15T16:45:00'),
          ipAddress: '192.168.1.105',
          metadata: { approvalComments: 'Template meets all compliance requirements' },
          riskLevel: 'low'
        },
        {
          id: '5',
          templateId: template?.id || 'template1',
          action: 'activated',
          description: 'Template activated and made available for use',
          userId: 'user1',
          userName: 'Dr. Sarah Johnson',
          userEmail: 'sarah.johnson@clinic.com',
          timestamp: new Date('2024-01-16T08:00:00'),
          ipAddress: '192.168.1.100',
          riskLevel: 'medium'
        },
        {
          id: '6',
          templateId: template?.id || 'template1',
          action: 'exported',
          description: 'Template exported to PDF format',
          userId: 'user3',
          userName: 'Dr. Michael Brown',
          userEmail: 'michael.brown@clinic.com',
          timestamp: new Date('2024-01-17T10:20:00'),
          ipAddress: '192.168.1.110',
          metadata: { exportFormat: 'PDF', documentCount: 1 },
          riskLevel: 'low'
        }
      ];

      // Apply filters
      let filteredLogs = mockLogs;

      if (actionFilter) {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
      }

      if (userFilter) {
        filteredLogs = filteredLogs.filter(log => log.userId === userFilter);
      }

      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log => 
          log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply date range filter
      const now = new Date();
      const dateThreshold = new Date();
      switch (dateRange) {
        case '1d':
          dateThreshold.setDate(now.getDate() - 1);
          break;
        case '7d':
          dateThreshold.setDate(now.getDate() - 7);
          break;
        case '30d':
          dateThreshold.setDate(now.getDate() - 30);
          break;
        case '90d':
          dateThreshold.setDate(now.getDate() - 90);
          break;
        default:
          dateThreshold.setFullYear(2000); // Show all
      }

      filteredLogs = filteredLogs.filter(log => log.timestamp >= dateThreshold);

      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAuditLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportLogs = () => {
    // In real implementation, this would export the audit logs
    toast({
      title: "Export Started",
      description: "Audit logs are being exported. You will receive a download link shortly."
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'activated':
        return <Unlock className="h-4 w-4 text-green-600" />;
      case 'deactivated':
        return <Lock className="h-4 w-4 text-gray-600" />;
      case 'shared':
        return <Share2 className="h-4 w-4 text-purple-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'restored':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'exported':
        return <Download className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants = {
      created: 'default',
      updated: 'secondary',
      deleted: 'destructive',
      activated: 'default',
      deactivated: 'secondary',
      shared: 'outline',
      approved: 'default',
      rejected: 'destructive',
      restored: 'secondary',
      exported: 'outline'
    } as const;

    return (
      <Badge variant={variants[action as keyof typeof variants] || 'outline'} className="text-xs">
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    );
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    const variants = {
      low: 'outline',
      medium: 'secondary',
      high: 'destructive'
    } as const;

    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600'
    } as const;

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants]} className={`text-xs ${colors[riskLevel as keyof typeof colors]}`}>
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const uniqueUsers = Array.from(new Set(auditLogs.map(log => log.userId)))
    .map(userId => auditLogs.find(log => log.userId === userId))
    .filter(Boolean) as AuditLogEntry[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
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
              <Shield className="h-5 w-5" />
              <CardTitle>
                {showAllTemplates ? 'System Audit Log' : 'Template Audit Log'}
              </CardTitle>
              <Badge variant="outline">{auditLogs.length} entries</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="restored">Restored</SelectItem>
                <SelectItem value="exported">Exported</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last Day</SelectItem>
                <SelectItem value="7d">Last Week</SelectItem>
                <SelectItem value="30d">Last Month</SelectItem>
                <SelectItem value="90d">Last 3 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Log Entries */}
          {auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Audit Logs Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || actionFilter || userFilter 
                  ? "No logs match your current filters."
                  : "No audit logs are available for this template."
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Action Icon */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                        {getActionIcon(log.action)}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Log Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getActionBadge(log.action)}
                            {getRiskLevelBadge(log.riskLevel)}
                          </div>
                          
                          <p className="text-sm font-medium mb-1">{log.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{log.userName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{log.timestamp.toLocaleDateString()}</span>
                            </div>
                            {log.ipAddress && (
                              <span>IP: {log.ipAddress}</span>
                            )}
                          </div>

                          {/* Metadata */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <strong>Details:</strong>
                              <ul className="mt-1 space-y-1">
                                {Object.entries(log.metadata).map(([key, value]) => (
                                  <li key={key}>
                                    <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* User Avatar */}
                        <div className="flex items-center gap-2 ml-4">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.userAvatar} />
                            <AvatarFallback>
                              {log.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateAuditLog;