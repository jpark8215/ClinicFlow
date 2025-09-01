import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  RotateCcw,
  FileText,
  Edit3,
  Target,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { ExtractedField, FieldValidationResult } from '@/services/dataExtractionService';

interface ManualCorrectionInterfaceProps {
  documentId: string;
  extractedFields: ExtractedField[];
  validationResults: FieldValidationResult[];
  originalText: string;
  onSaveCorrections: (correctedFields: ExtractedField[]) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

interface CorrectedField extends ExtractedField {
  isModified: boolean;
  originalValue: string;
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages: string[];
}

export const ManualCorrectionInterface: React.FC<ManualCorrectionInterfaceProps> = ({
  documentId,
  extractedFields,
  validationResults,
  originalText,
  onSaveCorrections,
  onCancel,
  className
}) => {
  const [correctedFields, setCorrectedFields] = useState<CorrectedField[]>([]);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Initialize corrected fields
  useEffect(() => {
    const initialFields: CorrectedField[] = extractedFields.map(field => {
      const validation = validationResults.find(v => v.fieldName === field.fieldName);
      
      return {
        ...field,
        isModified: false,
        originalValue: field.fieldValue,
        validationStatus: validation?.isValid ? 'valid' : validation?.errors.length ? 'error' : 'warning',
        validationMessages: [
          ...(validation?.errors || []),
          ...(validation?.warnings || [])
        ]
      };
    });

    setCorrectedFields(initialFields);
  }, [extractedFields, validationResults]);

  const handleFieldChange = (index: number, newValue: string) => {
    setCorrectedFields(prev => prev.map((field, i) => 
      i === index 
        ? {
            ...field,
            fieldValue: newValue,
            isModified: newValue !== field.originalValue,
            validationStatus: validateFieldValue(field.fieldName, newValue, field.fieldType),
            validationMessages: getValidationMessages(field.fieldName, newValue, field.fieldType)
          }
        : field
    ));
  };

  const validateFieldValue = (fieldName: string, value: string, fieldType: string): 'valid' | 'warning' | 'error' => {
    if (!value.trim()) return 'error';

    switch (fieldType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'valid' : 'error';
      case 'phone':
        return /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(value) ? 'valid' : 'error';
      case 'date':
        return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) ? 'valid' : 'error';
      default:
        return value.length > 2 ? 'valid' : 'warning';
    }
  };

  const getValidationMessages = (fieldName: string, value: string, fieldType: string): string[] => {
    const messages: string[] = [];

    if (!value.trim()) {
      messages.push('Field is required');
      return messages;
    }

    switch (fieldType) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          messages.push('Invalid email format');
        }
        break;
      case 'phone':
        if (!/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(value)) {
          messages.push('Invalid phone number format');
        }
        break;
      case 'date':
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
          messages.push('Invalid date format (MM/DD/YYYY)');
        }
        break;
    }

    if (value.length < 2) {
      messages.push('Value seems too short');
    }

    return messages;
  };

  const resetField = (index: number) => {
    setCorrectedFields(prev => prev.map((field, i) => 
      i === index 
        ? {
            ...field,
            fieldValue: field.originalValue,
            isModified: false,
            validationStatus: 'valid',
            validationMessages: []
          }
        : field
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert back to ExtractedField format
      const fieldsToSave: ExtractedField[] = correctedFields.map(field => ({
        fieldName: field.fieldName,
        fieldValue: field.fieldValue,
        confidence: field.isModified ? 1.0 : field.confidence, // Set confidence to 100% for manually corrected fields
        fieldType: field.fieldType,
        boundingBox: field.boundingBox
      }));

      await onSaveCorrections(fieldsToSave);
      
      toast({
        title: "Corrections Saved",
        description: "Field corrections have been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save corrections. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasErrors = correctedFields.some(field => field.validationStatus === 'error');
  const hasModifications = correctedFields.some(field => field.isModified);

  const criticalFields = correctedFields.filter(field => 
    ['patient_name', 'date_of_birth', 'member_id', 'insurance_provider'].includes(field.fieldName)
  );

  const regularFields = correctedFields.filter(field => 
    !['patient_name', 'date_of_birth', 'member_id', 'insurance_provider'].includes(field.fieldName)
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Manual Field Correction
              </CardTitle>
              <CardDescription>
                Review and correct extracted field values. Fields marked with errors must be corrected before saving.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOriginalText(!showOriginalText)}
              >
                {showOriginalText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="ml-2">{showOriginalText ? 'Hide' : 'Show'} Original Text</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields">Field Corrections</TabsTrigger>
              <TabsTrigger value="text">Original Text</TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-6">
              {/* Summary Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {hasErrors 
                    ? `${correctedFields.filter(f => f.validationStatus === 'error').length} field(s) have errors that need correction.`
                    : hasModifications
                    ? `${correctedFields.filter(f => f.isModified).length} field(s) have been modified.`
                    : 'All fields are valid. Review and save if corrections look good.'
                  }
                </AlertDescription>
              </Alert>

              {/* Critical Fields */}
              {criticalFields.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-500" />
                    Critical Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criticalFields.map((field, index) => {
                      const actualIndex = correctedFields.findIndex(f => f === field);
                      return (
                        <Card key={`critical-${actualIndex}`} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                {formatFieldName(field.fieldName)} *
                              </Label>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getStatusColor(field.validationStatus)}`}
                                >
                                  {getStatusIcon(field.validationStatus)}
                                  <span className="ml-1 capitalize">{field.validationStatus}</span>
                                </Badge>
                                {field.isModified && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetField(actualIndex)}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <Input
                              value={field.fieldValue}
                              onChange={(e) => handleFieldChange(actualIndex, e.target.value)}
                              className={`text-sm ${
                                field.validationStatus === 'error' 
                                  ? 'border-red-300 focus:border-red-500' 
                                  : field.validationStatus === 'warning'
                                  ? 'border-orange-300 focus:border-orange-500'
                                  : 'border-green-300 focus:border-green-500'
                              }`}
                              placeholder={`Enter ${formatFieldName(field.fieldName).toLowerCase()}`}
                            />
                            
                            {field.validationMessages.length > 0 && (
                              <div className="space-y-1">
                                {field.validationMessages.map((message, msgIndex) => (
                                  <p key={msgIndex} className="text-xs text-red-600">
                                    {message}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {field.isModified && (
                              <div className="text-xs text-muted-foreground">
                                Original: <span className="font-mono">{field.originalValue}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
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
                    {regularFields.map((field, index) => {
                      const actualIndex = correctedFields.findIndex(f => f === field);
                      return (
                        <Card key={`regular-${actualIndex}`} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                {formatFieldName(field.fieldName)}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getStatusColor(field.validationStatus)}`}
                                >
                                  {getStatusIcon(field.validationStatus)}
                                  <span className="ml-1 capitalize">{field.validationStatus}</span>
                                </Badge>
                                {field.isModified && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetField(actualIndex)}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {field.fieldType === 'text' && field.fieldValue.length > 50 ? (
                              <Textarea
                                value={field.fieldValue}
                                onChange={(e) => handleFieldChange(actualIndex, e.target.value)}
                                className={`text-sm ${
                                  field.validationStatus === 'error' 
                                    ? 'border-red-300 focus:border-red-500' 
                                    : field.validationStatus === 'warning'
                                    ? 'border-orange-300 focus:border-orange-500'
                                    : 'border-green-300 focus:border-green-500'
                                }`}
                                rows={3}
                              />
                            ) : (
                              <Input
                                value={field.fieldValue}
                                onChange={(e) => handleFieldChange(actualIndex, e.target.value)}
                                className={`text-sm ${
                                  field.validationStatus === 'error' 
                                    ? 'border-red-300 focus:border-red-500' 
                                    : field.validationStatus === 'warning'
                                    ? 'border-orange-300 focus:border-orange-500'
                                    : 'border-green-300 focus:border-green-500'
                                }`}
                              />
                            )}
                            
                            {field.validationMessages.length > 0 && (
                              <div className="space-y-1">
                                {field.validationMessages.map((message, msgIndex) => (
                                  <p key={msgIndex} className="text-xs text-red-600">
                                    {message}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {field.isModified && (
                              <div className="text-xs text-muted-foreground">
                                Original: <span className="font-mono">{field.originalValue}</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Original Extracted Text</Label>
                <Textarea
                  value={originalText}
                  readOnly
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="No text was extracted from this document."
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {hasModifications && (
                <span className="text-orange-600">
                  {correctedFields.filter(f => f.isModified).length} field(s) modified
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={hasErrors || saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Corrections
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualCorrectionInterface;