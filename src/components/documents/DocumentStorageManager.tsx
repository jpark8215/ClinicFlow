import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload,
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  Trash2,
  FileText,
  Image,
  File,
  Lock,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock
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
import { DocumentViewer } from './DocumentViewer';
import type { 
  DocumentStorage, 
  DocumentStorageFilters,
  DocumentType,
  AccessLevel,
  StorageStatus,
  CreateDocumentStorageRequest
} from '@/types/documentStorage';

interface DocumentStorageManagerProps {
  patientId?: string;
  appointmentId?: string;
  onDocumentSelected?: (document: DocumentStorage) => void;
}

export const DocumentStorageManager: React.FC<DocumentStorageManagerProps> = ({
  patientId,
  appointmentId,
  onDocumentSelected
}) => {
  const [documents, setDocuments] = useState<DocumentStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentStorage | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState<DocumentStorageFilters>({
    patientId,
    appointmentId
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocumentType, setUploadDocumentType] = useState<DocumentType>('other');
  const [uploadAccessLevel, setUploadAccessLevel] = useState<AccessLevel>('restricted');
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const docs = await documentStorageService.getDocumentStorageList(filters);
      setDocuments(docs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
  };

  const handleFilterChange = (key: keyof DocumentStorageFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleViewDocument = (document: DocumentStorage) => {
    setSelectedDocument(document);
    setShowViewer(true);
    onDocumentSelected?.(document);
  };

  const handleDownloadDocument = async (document: DocumentStorage) => {
    try {
      const downloadUrl = await documentStorageService.downloadDocument(document.id);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleDeleteDocument = async (document: DocumentStorage) => {
    if (!confirm(`Are you sure you want to delete "${document.originalFilename}"?`)) {
      return;
    }

    try {
      await documentStorageService.deleteDocument(document.id);
      await loadDocuments(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      
      const request: CreateDocumentStorageRequest = {
        documentId: crypto.randomUUID(), // Generate temporary ID
        patientId,
        appointmentId,
        file: uploadFile,
        documentType: uploadDocumentType,
        accessLevel: uploadAccessLevel
      };

      await documentStorageService.storeDocument(request);
      
      // Reset upload state
      setUploadFile(null);
      setUploadDocumentType('other');
      setUploadAccessLevel('restricted');
      setShowUpload(false);
      
      // Refresh documents list
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = (status: StorageStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'archived':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'deleted':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const documentTypes: DocumentType[] = [
    'consent', 'intake', 'referral', 'report', 'prescription', 
    'lab_result', 'imaging', 'insurance', 'billing', 'correspondence', 'other'
  ];

  const accessLevels: AccessLevel[] = ['public', 'restricted', 'confidential'];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Storage</CardTitle>
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Upload a new document to secure storage
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">File</label>
                    <Input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.tiff"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Document Type</label>
                    <Select value={uploadDocumentType} onValueChange={(value) => setUploadDocumentType(value as DocumentType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Access Level</label>
                    <Select value={uploadAccessLevel} onValueChange={(value) => setUploadAccessLevel(value as AccessLevel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessLevels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUpload(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUploadDocument}
                      disabled={!uploadFile || uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  className="pl-10"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select onValueChange={(value) => handleFilterChange('documentType', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleFilterChange('accessLevel', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Access Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  {accessLevels.map(level => (
                    <SelectItem key={level} value={level}>
                      {level.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => handleFilterChange('storageStatus', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
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

      {/* Documents List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((document) => (
                <div key={document.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getFileIcon(document.mimeType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.originalFilename}
                          </h3>
                          {getStatusIcon(document.storageStatus)}
                          {document.isEncrypted && (
                            <Lock className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <Badge variant="secondary" className="text-xs">
                            {document.documentType.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span>{formatFileSize(document.fileSize)}</span>
                          <span>{document.accessLevel.toUpperCase()}</span>
                          <span>{document.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Implement sharing */}}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(document)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          {selectedDocument && (
            <DocumentViewer
              documentId={selectedDocument.id}
              documentStorage={selectedDocument}
              onError={(error) => setError(error.message)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentStorageManager;