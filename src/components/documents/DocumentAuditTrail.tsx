import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye,
  Download,
  Share2,
  Trash2,
  Edit,
  Calendar,
  User,
  Monitor,
  Smartphone,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  FileText,
  BarChart3
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { documentStorageService } from '@/services/documentStorageService';
import type { 
  DocumentAccessLog,
  DocumentAccessFilters,
  DocumentAuditReport,
  AccessType,
  AccessMethod
} from '@/types/documentStorage';

interface DocumentAuditTrailProps {
  documentStorageId?: string;
  showReportButton?: boolean;
}

export const DocumentAuditTrail: React.FC<DocumentAuditTrailProps> = ({
  documentStorageId,
  showReportButton = true
}) => {
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<DocumentAuditReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [filters, setFilters] = useState<DocumentAccessFilters>({
    documentStorageId
  });

  const loadAccessLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const logs = await documentStorageService.getDocumentAccessLogs(filters);
      setAccessLogs(logs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load access logs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAccessLogs();
  }, [loadAccessLogs]);

  const handleGenerateReport = async () => {
    if (!documentStorageId) return;

    try {
      const report = await documentStorageService.generateDocumentAuditReport(documentStorageId);
      setAuditReport(report);
      setShowReport(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audit report');
    }
  };

  const handleFilterChange = (key: keyof DocumentAccessFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const getAccessTypeIcon = (accessType: AccessType) => {
    switch (accessType) {
      case 'view':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'download':
        return <Download className="h-4 w-4 text-green-500" />;
      case 'share':
        return <Share2 className="h-4 w-4 text-purple-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'modify':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'print':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAccessMethodIcon = (accessMethod: AccessMethod) => {
    switch (accessMethod) {
      case 'web':
        return <Monitor className="h-4 w-4 text-blue-500" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-green-500" />;
      case 'api':
        return <Server className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Server className="h-4 w-4 text-gray-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAccessStatusIcon = (granted: boolean) => {
    return granted ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return 'N/A';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const accessTypes: AccessType[] = ['view', 'download', 'share', 'delete', 'modify', 'print'];
  const accessMethods: AccessMethod[] = ['web', 'mobile', 'api', 'system'];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Access Audit Trail</CardTitle>
            {showReportButton && documentStorageId && (
              <Dialog open={showReport} onOpenChange={setShowReport}>
                <DialogTrigger asChild>
                  <Button onClick={handleGenerateReport}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Document Audit Report</DialogTitle>
                    <DialogDescription>
                      Comprehensive access report for document
                    </DialogDescription>
                  </DialogHeader>
                  {auditReport && (
                    <div className="space-y-6">
                      {/* Report Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {auditReport.totalAccesses}
                          </div>
                          <div className="text-sm text-blue-600">Total Accesses</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {auditReport.uniqueUsers}
                          </div>
                          <div className="text-sm text-green-600">Unique Users</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(auditReport.accessTypes).length}
                          </div>
                          <div className="text-sm text-purple-600">Access Types</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {auditReport.lastAccessed ? 
                              auditReport.lastAccessed.toLocaleDateString() : 'Never'
                            }
                          </div>
                          <div className="text-sm text-orange-600">Last Accessed</div>
                        </div>
                      </div>

                      {/* Access Types Breakdown */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Access Types</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(auditReport.accessTypes).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                {getAccessTypeIcon(type as AccessType)}
                                <span className="text-sm capitalize">{type}</span>
                              </div>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Access Methods Breakdown */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Access Methods</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(auditReport.accessMethods).map(([method, count]) => (
                            <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                {getAccessMethodIcon(method as AccessMethod)}
                                <span className="text-sm capitalize">{method}</span>
                              </div>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Access Logs */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Recent Access Logs</h3>
                        <div className="max-h-64 overflow-y-auto border rounded">
                          {auditReport.accessLogs.slice(0, 10).map((log) => (
                            <div key={log.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getAccessTypeIcon(log.accessType)}
                                  {getAccessMethodIcon(log.accessMethod)}
                                  {getAccessStatusIcon(log.accessGranted)}
                                  <div>
                                    <div className="text-sm font-medium">
                                      {log.accessType.toUpperCase()} via {log.accessMethod.toUpperCase()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {log.accessedAt.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDuration(log.durationMs)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <Select onValueChange={(value) => handleFilterChange('accessType', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Access Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {accessTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleFilterChange('accessMethod', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Access Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Methods</SelectItem>
                  {accessMethods.map(method => (
                    <SelectItem key={method} value={method}>
                      {method.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleFilterChange('accessGranted', value === 'true')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Granted</SelectItem>
                  <SelectItem value="false">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Access Logs List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No access logs found
            </div>
          ) : (
            <div className="divide-y">
              {accessLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getAccessTypeIcon(log.accessType)}
                      {getAccessMethodIcon(log.accessMethod)}
                      {getAccessStatusIcon(log.accessGranted)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {log.accessType.toUpperCase()} via {log.accessMethod.toUpperCase()}
                          </h3>
                          {!log.accessGranted && (
                            <Badge variant="destructive" className="text-xs">
                              DENIED
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{log.accessedAt.toLocaleString()}</span>
                          </span>
                          
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>User: {log.accessedBy}</span>
                          </span>
                          
                          {log.durationMs && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Duration: {formatDuration(log.durationMs)}</span>
                            </span>
                          )}
                          
                          {log.ipAddress && (
                            <span>IP: {log.ipAddress}</span>
                          )}
                        </div>
                        
                        {log.denialReason && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <strong>Denial Reason:</strong> {log.denialReason}
                          </div>
                        )}
                        
                        {Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <details>
                              <summary className="cursor-pointer hover:text-gray-800">
                                Additional Details
                              </summary>
                              <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentAuditTrail;