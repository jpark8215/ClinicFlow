import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Share2, 
  Eye, 
  FileText, 
  Lock, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { documentStorageService } from '@/services/documentStorageService';
import type { 
  DocumentStorage, 
  DocumentPreviewData, 
  DocumentAccessLog,
  DocumentViewerProps 
} from '@/types/documentStorage';

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  documentStorage,
  onAccessLogged,
  onError
}) => {
  const [previewData, setPreviewData] = useState<DocumentPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const preview = await documentStorageService.getDocumentPreview(documentId);
      setPreviewData(preview);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load document preview';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [documentId, onError]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleDownload = async () => {
    try {
      const downloadUrl = await documentStorageService.downloadDocument(documentId);
      
      // Create temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = documentStorage.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download document';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Share document:', documentId);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentTypeIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('image')) return <Eye className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const renderDocumentContent = () => {
    if (!previewData) return null;

    const containerStyle = {
      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      transition: 'transform 0.2s ease-in-out'
    };

    if (previewData.mimeType.includes('pdf')) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
          <div style={containerStyle} className="max-w-full max-h-full">
            <iframe
              src={previewData.url}
              className="w-full h-96 border border-gray-300 rounded"
              title={previewData.filename}
            />
          </div>
        </div>
      );
    }

    if (previewData.mimeType.includes('image')) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
          <div style={containerStyle}>
            <img
              src={previewData.url}
              alt={previewData.filename}
              className="max-w-full max-h-96 object-contain border border-gray-300 rounded"
            />
          </div>
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            Preview not available for this file type
          </p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download to View
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={isFullscreen ? 'fixed inset-0 z-50' : ''}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading document...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={isFullscreen ? 'fixed inset-0 z-50' : ''}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={loadPreview} 
            variant="outline" 
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {previewData && getDocumentTypeIcon(previewData.mimeType)}
            <div>
              <CardTitle className="text-lg">{documentStorage.originalFilename}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary">{documentStorage.documentType}</Badge>
                {documentStorage.documentCategory && (
                  <Badge variant="outline">{documentStorage.documentCategory}</Badge>
                )}
                {documentStorage.isEncrypted && (
                  <Badge variant="destructive" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Encrypted
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Rotation Control */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Action Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Document Metadata */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
          <span>Size: {formatFileSize(documentStorage.fileSize)}</span>
          <span>•</span>
          <span>Access Level: {documentStorage.accessLevel}</span>
          <span>•</span>
          <span>Created: {documentStorage.createdAt.toLocaleDateString()}</span>
          {documentStorage.patientId && (
            <>
              <span>•</span>
              <span>Patient ID: {documentStorage.patientId}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col" style={{ height: isFullscreen ? 'calc(100vh - 140px)' : '500px' }}>
        {renderDocumentContent()}
      </CardContent>
    </Card>
  );
};

export default DocumentViewer;