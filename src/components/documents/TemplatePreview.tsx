import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  Download, 
  Printer, 
  RefreshCw,
  FileText,
  User,
  Calendar,
  Building
} from 'lucide-react';
import type { DocumentTemplate, MergeField, RichTextContent } from '@/types';

interface TemplatePreviewProps {
  template: DocumentTemplate;
  mergeFields: MergeField[];
  className?: string;
}

// Sample data for different data sources
const sampleData = {
  patient: {
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    dateOfBirth: '1985-03-15',
    age: '38',
    gender: 'Male',
    email: 'john.doe@email.com',
    phone: '(555) 123-4567',
    address: '123 Main Street, Anytown, ST 12345',
    insuranceProvider: 'Blue Cross Blue Shield',
    insuranceId: 'BC123456789',
    emergencyContact: 'Jane Doe - (555) 987-6543',
    medicalRecordNumber: 'MRN-2024-001'
  },
  appointment: {
    id: 'APT-2024-001',
    date: '2024-01-15',
    time: '10:30 AM',
    duration: '30 minutes',
    type: 'Follow-up Consultation',
    status: 'Confirmed',
    reason: 'Routine check-up and medication review',
    notes: 'Patient reports feeling well, no new symptoms',
    roomNumber: 'Room 205'
  },
  provider: {
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    fullName: 'Dr. Sarah Johnson',
    title: 'MD, Internal Medicine',
    licenseNumber: 'MD-12345',
    npi: '1234567890',
    email: 'dr.johnson@clinic.com',
    phone: '(555) 234-5678',
    department: 'Internal Medicine',
    specialization: 'Internal Medicine, Preventive Care'
  },
  clinic: {
    name: 'ClinicFlow Medical Center',
    address: '456 Healthcare Blvd, Medical City, ST 54321',
    phone: '(555) 345-6789',
    fax: '(555) 345-6790',
    email: 'info@clinicflow.com',
    website: 'www.clinicflow.com',
    taxId: '12-3456789',
    npi: '9876543210',
    director: 'Dr. Michael Smith',
    hours: 'Monday-Friday: 8:00 AM - 6:00 PM'
  },
  custom: {
    currentDate: new Date().toLocaleDateString(),
    currentTime: new Date().toLocaleTimeString(),
    documentId: 'DOC-2024-001',
    pageNumber: '1',
    totalPages: '2'
  }
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  mergeFields,
  className = ""
}) => {
  const [selectedDataSet, setSelectedDataSet] = useState('default');
  const [isGenerating, setIsGenerating] = useState(false);

  // Process template content with sample data
  const processedContent = useMemo(() => {
    const contentText = convertRichTextToText(template.content);
    
    // Replace merge fields with sample data
    let processedText = contentText;
    
    mergeFields.forEach(field => {
      const fieldPattern = new RegExp(`\\{\\{${field.name}\\}\\}`, 'g');
      const sampleValue = getSampleValue(field);
      processedText = processedText.replace(fieldPattern, sampleValue);
    });
    
    return processedText;
  }, [template.content, mergeFields, selectedDataSet]);

  const getSampleValue = (field: MergeField): string => {
    const dataSource = sampleData[field.dataSource as keyof typeof sampleData];
    if (dataSource && field.name in dataSource) {
      return (dataSource as any)[field.name] || `[${field.displayName}]`;
    }
    return `[${field.displayName}]`;
  };

  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    // Simulate document generation
    setTimeout(() => {
      setIsGenerating(false);
      // In a real implementation, this would trigger actual document generation
      console.log('Document generated with template:', template.id);
    }, 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${template.name} - Preview</title>
            <style>
              body { 
                font-family: ${template.settings.fontFamily || 'Arial'}, sans-serif; 
                font-size: ${template.settings.fontSize || 12}px;
                line-height: ${template.settings.lineHeight || 1.5};
                margin: ${template.settings.margins?.top || 72}px ${template.settings.margins?.right || 72}px ${template.settings.margins?.bottom || 72}px ${template.settings.margins?.left || 72}px;
              }
              .merge-field { background-color: #e3f2fd; padding: 2px 4px; border-radius: 3px; }
              h1, h2, h3 { color: #333; }
              table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin: 16px 0; font-style: italic; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${convertMarkdownToHtml(processedContent)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Template Preview</CardTitle>
            <Badge variant="outline">{template.name}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDataSet} onValueChange={setSelectedDataSet}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sample Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Sample</SelectItem>
                <SelectItem value="patient1">Patient Sample 1</SelectItem>
                <SelectItem value="patient2">Patient Sample 2</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDocument}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Template Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-3">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Version {template.version}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Created by {template.createdBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {template.updatedAt.toLocaleDateString()}</span>
            </div>
            {template.category && (
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{template.category.name}</span>
              </div>
            )}
          </div>

          {/* Merge Fields Summary */}
          {mergeFields.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Merge Fields:</h4>
              <div className="flex flex-wrap gap-1">
                {mergeFields.map((field) => (
                  <Badge key={field.id} variant="secondary" className="text-xs">
                    {field.displayName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Document Preview */}
          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-6 bg-white">
              <div 
                className="prose prose-sm max-w-none"
                style={{
                  fontFamily: template.settings.fontFamily || 'Arial',
                  fontSize: `${template.settings.fontSize || 12}px`,
                  lineHeight: template.settings.lineHeight || 1.5
                }}
                dangerouslySetInnerHTML={{ 
                  __html: convertMarkdownToHtml(processedContent) 
                }}
              />
            </div>
          </ScrollArea>

          {/* Document Settings Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground border-t pt-3">
            <div>
              <span className="font-medium">Page Size:</span> {template.settings.pageSize || 'A4'}
            </div>
            <div>
              <span className="font-medium">Orientation:</span> {template.settings.orientation || 'Portrait'}
            </div>
            <div>
              <span className="font-medium">Font:</span> {template.settings.fontFamily || 'Arial'}
            </div>
            <div>
              <span className="font-medium">Font Size:</span> {template.settings.fontSize || 12}px
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions
function convertRichTextToText(content: RichTextContent): string {
  if (!content.content || content.content.length === 0) {
    return '';
  }
  
  return content.content.map(node => {
    if (node.type === 'paragraph') {
      return node.content?.map(child => {
        if (child.type === 'text') {
          let text = child.text || '';
          if (child.marks) {
            child.marks.forEach(mark => {
              switch (mark.type) {
                case 'bold':
                  text = `**${text}**`;
                  break;
                case 'italic':
                  text = `*${text}*`;
                  break;
                case 'underline':
                  text = `<u>${text}</u>`;
                  break;
              }
            });
          }
          return text;
        }
        return '';
      }).join('') || '';
    }
    return '';
  }).join('\n\n');
}

function convertMarkdownToHtml(markdown: string): string {
  // Enhanced markdown to HTML conversion for preview
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Underline
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded border my-2" />')
    // Merge fields
    .replace(/\{\{(.*?)\}\}/g, '<span class="merge-field bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono border border-blue-200">{{$1}}</span>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-t border-gray-300 my-6" />')
    // Line breaks (double newlines become paragraph breaks)
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1">$1</li>');

  // Handle tables
  const tableRegex = /\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)*)/g;
  html = html.replace(tableRegex, (match, header, rows) => {
    const headerCells = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
    const rowsArray = rows.trim().split('\n').map((row: string) => 
      row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
    );
    
    let tableHtml = '<table class="border-collapse border border-gray-300 w-full my-4">';
    tableHtml += '<thead><tr>';
    headerCells.forEach((cell: string) => {
      tableHtml += `<th class="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold">${cell}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    rowsArray.forEach((row: string[]) => {
      tableHtml += '<tr>';
      row.forEach((cell: string) => {
        tableHtml += `<td class="border border-gray-300 px-3 py-2">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table>';
    return tableHtml;
  });
  
  // Wrap in paragraphs if not already wrapped
  if (html && !html.startsWith('<')) {
    html = '<p class="mb-4">' + html + '</p>';
  }
  
  // Clean up list wrapping
  html = html.replace(/(<li[^>]*>.*<\/li>)/gs, (match) => {
    if (!match.includes('<ul>') && !match.includes('<ol>')) {
      return `<ul class="list-disc ml-6 my-4">${match}</ul>`;
    }
    return match;
  });
  
  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*><\/p>/g, '');
  
  return html;
}

export default TemplatePreview;