import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye,
  Scan,
  Clock,
  AlertCircle
} from 'lucide-react';
import { documentUploadService, type DocumentUploadResult, type DocumentUploadProgress } from '@/services/documentUploadService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DocumentUploadProps {
  patientId?: string;
  appointmentId?: string;
  taskId?: string;
  onUploadComplete?: (results: DocumentUploadResult[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  result?: DocumentUploadResult;
  error?: string;
  ocrProgress?: DocumentUploadProgress;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  patientId,
  appointmentId,
  taskId,
  onUploadComplete,
  onUploadError,
  className
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const { toast } = useToast();

  const documentTypes = documentUploadService.getSupportedDocumentTypes();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedDocumentType) {
      toast({
        title: "Document Type Required",
        description: "Please select a document type before uploading files.",
        variant: "destructive"
      });
      return;
    }

    // Initialize uploading files
    const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Process each file
    const results: DocumentUploadResult[] = [];
    
    for (const uploadingFile of newUploadingFiles) {
      try {
        // Update status to processing
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, status: 'processing', progress: 25 }
              : f
          )
        );

        // Upload and process document
        const result = await documentUploadService.uploadAndProcessDocument(
          uploadingFile.file,
          selectedDocumentType,
          patientId,
          appointmentId,
          taskId
        );

        // Update with completed result
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100, 
                  result 
                }
              : f
          )
        );

        results.push(result);

        toast({
          title: "Document Processed Successfully",
          description: `${uploadingFile.file.name} has been uploaded and processed with ${Math.round(result.ocrResult.confidence * 100)}% confidence.`
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update with error
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { 
                  ...f, 
                  status: 'failed', 
                  progress: 0, 
                  error: errorMessage 
                }
              : f
          )
        );

        toast({
          title: "Upload Failed",
          description: `Failed to process ${uploadingFile.file.name}: ${errorMessage}`,
          variant: "destructive"
        });

        onUploadError?.(errorMessage);
      }
    }

    if (results.length > 0) {
      onUploadComplete?.(results);
    }
  }, [selectedDocumentType, patientId, appointmentId, taskId, toast, onUploadComplete, onUploadError]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      onDrop(fileArray);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Scan className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload & OCR Processing
          </CardTitle>
          <CardDescription>
            Upload medical documents for automatic text extraction and data processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type *</Label>
            <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.type} value={type.type}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${!selectedDocumentType ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input 
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/tiff,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={!selectedDocumentType}
              className="hidden"
            />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, TIFF, and PDF files up to 10MB
                </p>
                {!selectedDocumentType && (
                  <p className="text-sm text-red-500">
                    Please select a document type first
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Uploading Files List */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing Files</h3>
              <div className="space-y-3">
                {uploadingFiles.map(uploadingFile => (
                  <Card key={uploadingFile.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileIcon(uploadingFile.file)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {uploadingFile.file.name}
                            </p>
                            <Badge className={`text-xs ${getStatusColor(uploadingFile.status)}`}>
                              {getStatusIcon(uploadingFile.status)}
                              <span className="ml-1 capitalize">{uploadingFile.status}</span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>{uploadingFile.file.type}</span>
                          </div>

                          {/* Progress Bar */}
                          {(uploadingFile.status === 'uploading' || uploadingFile.status === 'processing') && (
                            <div className="mt-2">
                              <Progress value={uploadingFile.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {uploadingFile.status === 'uploading' ? 'Uploading...' : 'Processing with OCR...'}
                              </p>
                            </div>
                          )}

                          {/* Success Info */}
                          {uploadingFile.status === 'completed' && uploadingFile.result && (
                            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-green-700">
                                  OCR Confidence: {Math.round(uploadingFile.result.ocrResult.confidence * 100)}%
                                </span>
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                Extracted {uploadingFile.result.ocrResult.extractedFields.length} fields
                              </div>
                            </div>
                          )}

                          {/* Error Info */}
                          {uploadingFile.status === 'failed' && uploadingFile.error && (
                            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                              <div className="flex items-center gap-2 text-xs">
                                <AlertCircle className="h-3 w-3 text-red-600" />
                                <span className="text-red-700">{uploadingFile.error}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {uploadingFile.status === 'completed' && uploadingFile.result && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Open OCR results viewer
                              console.log('View OCR results:', uploadingFile.result);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadingFile.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Expected Fields Info */}
          {selectedDocumentType && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Expected Fields for {documentTypes.find(t => t.type === selectedDocumentType)?.name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {documentTypes
                  .find(t => t.type === selectedDocumentType)
                  ?.expectedFields.map(field => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;