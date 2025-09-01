import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Eye, 
  Edit, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Scan,
  Target,
  Clock
} from 'lucide-react';
import type { OCRResult, ExtractedField, BoundingBox } from '@/types/aiml';

interface OCRResultsViewerProps {
  ocrResult: OCRResult;
  documentId: string;
  onFieldUpdate?: (fieldName: string, newValue: string) => void;
  onSaveChanges?: (updatedFields: ExtractedField[]) => void;
  className?: string;
}

export const OCRResultsViewer: React.FC<OCRResultsViewerProps> = ({
  ocrResult,
  documentId,
  onFieldUpdate,
  onSaveChanges,
  className
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<ExtractedField[]>(ocrResult.extractedFields);
  const [hasChanges, setHasChanges] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 0.7) return <AlertTriangle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const handleFieldEdit = (fieldName: string, newValue: string) => {
    const updatedFields = editedFields.map(field =>
      field.fieldName === fieldName
        ? { ...field, fieldValue: newValue }
        : field
    );
    setEditedFields(updatedFields);
    setHasChanges(true);
    onFieldUpdate?.(fieldName, newValue);
  };

  const handleSaveChanges = () => {
    onSaveChanges?.(editedFields);
    setHasChanges(false);
    setEditMode(false);
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const criticalFields = editedFields.filter(field => 
    ['patient_name', 'date_of_birth', 'member_id', 'insurance_provider'].includes(field.fieldName)
  );

  const regularFields = editedFields.filter(field => 
    !['patient_name', 'date_of_birth', 'member_id', 'insurance_provider'].includes(field.fieldName)
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                OCR Processing Results
              </CardTitle>
              <CardDescription>
                Extracted text and data from document processing
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getConfidenceColor(ocrResult.confidence)}>
                {getConfidenceIcon(ocrResult.confidence)}
                <span className="ml-1">{Math.round(ocrResult.confidence * 100)}% Confidence</span>
              </Badge>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Fields
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditMode(false);
                      setEditedFields(ocrResult.extractedFields);
                      setHasChanges(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveChanges}
                    disabled={!hasChanges}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fields">Extracted Fields</TabsTrigger>
              <TabsTrigger value="text">Full Text</TabsTrigger>
              <TabsTrigger value="metadata">Processing Info</TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-6">
              {/* Critical Fields */}
              {criticalFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-500" />
                    Critical Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criticalFields.map((field, index) => (
                      <Card key={`critical-${index}`} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {formatFieldName(field.fieldName)}
                            </Label>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getConfidenceColor(field.confidence)}`}
                            >
                              {Math.round(field.confidence * 100)}%
                            </Badge>
                          </div>
                          
                          {editMode ? (
                            <Input
                              value={field.fieldValue}
                              onChange={(e) => handleFieldEdit(field.fieldName, e.target.value)}
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                              {field.fieldValue || 'Not detected'}
                            </p>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Type: {field.fieldType} • Confidence: {Math.round(field.confidence * 100)}%
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Fields */}
              {regularFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Additional Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regularFields.map((field, index) => (
                      <Card key={`regular-${index}`} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {formatFieldName(field.fieldName)}
                            </Label>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getConfidenceColor(field.confidence)}`}
                            >
                              {Math.round(field.confidence * 100)}%
                            </Badge>
                          </div>
                          
                          {editMode ? (
                            field.fieldType === 'text' && field.fieldValue.length > 50 ? (
                              <Textarea
                                value={field.fieldValue}
                                onChange={(e) => handleFieldEdit(field.fieldName, e.target.value)}
                                className="text-sm"
                                rows={3}
                              />
                            ) : (
                              <Input
                                value={field.fieldValue}
                                onChange={(e) => handleFieldEdit(field.fieldName, e.target.value)}
                                className="text-sm"
                              />
                            )
                          ) : (
                            <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                              {field.fieldValue || 'Not detected'}
                            </p>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            Type: {field.fieldType} • Confidence: {Math.round(field.confidence * 100)}%
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {editedFields.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Fields Extracted</h3>
                  <p className="text-muted-foreground">
                    The OCR process did not extract any structured fields from this document.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Full Extracted Text</Label>
                <Textarea
                  value={ocrResult.extractedText}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="No text was extracted from this document."
                />
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Processing Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Time:</span>
                      <span>{ocrResult.processingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Detected Language:</span>
                      <span>{ocrResult.detectedLanguage?.toUpperCase() || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Page Count:</span>
                      <span>{ocrResult.pageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overall Confidence:</span>
                      <Badge className={getConfidenceColor(ocrResult.confidence)}>
                        {Math.round(ocrResult.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Field Statistics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Fields:</span>
                      <span>{ocrResult.extractedFields.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High Confidence (≥90%):</span>
                      <span className="text-green-600">
                        {ocrResult.extractedFields.filter(f => f.confidence >= 0.9).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Medium Confidence (70-89%):</span>
                      <span className="text-orange-600">
                        {ocrResult.extractedFields.filter(f => f.confidence >= 0.7 && f.confidence < 0.9).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low Confidence (&lt;70%):</span>
                      <span className="text-red-600">
                        {ocrResult.extractedFields.filter(f => f.confidence < 0.7).length}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {ocrResult.explanation && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Processing Notes</h4>
                  <p className="text-sm text-muted-foreground">{ocrResult.explanation}</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OCRResultsViewer;