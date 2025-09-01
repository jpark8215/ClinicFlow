import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Plus,
  Eye,
  Code,
  Type,
  Palette,
  Link,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Undo,
  Redo,
  Save
} from 'lucide-react';
import type { RichTextContent, MergeField } from '@/types';

interface RichTextEditorProps {
  content: RichTextContent;
  onChange: (content: RichTextContent) => void;
  mergeFields?: MergeField[];
  placeholder?: string;
  className?: string;
  onSave?: () => void;
  readOnly?: boolean;
}

interface EditorState {
  history: string[];
  historyIndex: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
}

// Enhanced rich text editor with comprehensive formatting and merge field support
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  mergeFields = [],
  placeholder = "Start typing your document...",
  className = "",
  onSave,
  readOnly = false
}) => {
  const [textValue, setTextValue] = useState(() => {
    // Convert rich text content to markdown-like text for editing
    return convertRichTextToMarkdown(content);
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    history: [],
    historyIndex: -1,
    selectedText: '',
    selectionStart: 0,
    selectionEnd: 0
  });
  const [fontSize, setFontSize] = useState('14');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize history with initial content
  useEffect(() => {
    const initialContent = convertRichTextToMarkdown(content);
    setEditorState(prev => ({
      ...prev,
      history: [initialContent],
      historyIndex: 0
    }));
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setTextValue(value);
    
    // Add to history for undo/redo functionality
    setEditorState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(value);
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
    
    // Convert markdown-like text back to rich text content
    const richTextContent = convertMarkdownToRichText(value);
    onChange(richTextContent);
  }, [onChange]);

  const handleUndo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const previousValue = prev.history[newIndex];
        setTextValue(previousValue);
        const richTextContent = convertMarkdownToRichText(previousValue);
        onChange(richTextContent);
        return {
          ...prev,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, [onChange]);

  const handleRedo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const nextValue = prev.history[newIndex];
        setTextValue(nextValue);
        const richTextContent = convertMarkdownToRichText(nextValue);
        onChange(richTextContent);
        return {
          ...prev,
          historyIndex: newIndex
        };
      }
      return prev;
    });
  }, [onChange]);

  const updateSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textValue.substring(start, end);

    setEditorState(prev => ({
      ...prev,
      selectedText,
      selectionStart: start,
      selectionEnd: end
    }));
  }, [textValue]);

  const insertMergeField = useCallback((field: MergeField) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const mergeFieldText = `{{${field.name}}}`;
    
    const newValue = textValue.substring(0, start) + mergeFieldText + textValue.substring(end);
    handleTextChange(newValue);

    // Set cursor position after the inserted merge field
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + mergeFieldText.length, start + mergeFieldText.length);
    }, 0);
  }, [textValue, handleTextChange]);

  const insertFormatting = useCallback((format: string, customText?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textValue.substring(start, end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? formattedText.length : start + 2;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? formattedText.length : start + 1;
        break;
      case 'underline':
        formattedText = `<u>${selectedText || 'underlined text'}</u>`;
        cursorOffset = selectedText ? formattedText.length : start + 3;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText || 'strikethrough text'}~~`;
        cursorOffset = selectedText ? formattedText.length : start + 2;
        break;
      case 'code':
        formattedText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? formattedText.length : start + 1;
        break;
      case 'h1':
        formattedText = `\n# ${selectedText || 'Heading 1'}\n`;
        break;
      case 'h2':
        formattedText = `\n## ${selectedText || 'Heading 2'}\n`;
        break;
      case 'h3':
        formattedText = `\n### ${selectedText || 'Heading 3'}\n`;
        break;
      case 'quote':
        formattedText = `\n> ${selectedText || 'Quote text'}\n`;
        break;
      case 'bullet':
        formattedText = `\n- ${selectedText || 'list item'}`;
        break;
      case 'number':
        formattedText = `\n1. ${selectedText || 'numbered item'}`;
        break;
      case 'link':
        const linkText = selectedText || 'link text';
        const linkUrl = customText || 'https://example.com';
        formattedText = `[${linkText}](${linkUrl})`;
        break;
      case 'image':
        const altText = selectedText || 'image description';
        const imageUrl = customText || 'https://example.com/image.jpg';
        formattedText = `![${altText}](${imageUrl})`;
        break;
      case 'table':
        formattedText = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n`;
        break;
      case 'hr':
        formattedText = `\n---\n`;
        break;
      default:
        formattedText = selectedText;
    }

    const newValue = textValue.substring(0, start) + formattedText + textValue.substring(end);
    handleTextChange(newValue);

    // Set cursor position after the inserted formatting
    setTimeout(() => {
      textarea.focus();
      if (cursorOffset) {
        textarea.setSelectionRange(cursorOffset, cursorOffset);
      } else {
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }
    }, 0);
  }, [textValue, handleTextChange]);

  const renderPreview = () => {
    return (
      <div className="prose prose-sm max-w-none p-4 border rounded-md min-h-[300px] bg-white">
        <div dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(textValue) }} />
      </div>
    );
  };

  const groupedMergeFields = mergeFields.reduce((acc, field) => {
    if (!acc[field.dataSource]) {
      acc[field.dataSource] = [];
    }
    acc[field.dataSource].push(field);
    return acc;
  }, {} as Record<string, MergeField[]>);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Rich Text Editor</CardTitle>
          <div className="flex items-center gap-2">
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={readOnly}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {isPreviewMode ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>
        
        {!isPreviewMode && !readOnly && (
          <>
            {/* Main Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 flex-wrap">
                {/* Undo/Redo */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={editorState.historyIndex <= 0}
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={editorState.historyIndex >= editorState.history.length - 1}
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6 mx-1" />
                
                {/* Text Formatting */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('bold')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('italic')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('underline')}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('strikethrough')}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('code')}
                  title="Inline Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6 mx-1" />
                
                {/* Headings */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('h1')}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('h2')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('h3')}
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6 mx-1" />
                
                {/* Lists and Structure */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('bullet')}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('number')}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('quote')}
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6 mx-1" />
                
                {/* Insert Elements */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('link')}
                  title="Insert Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('image')}
                  title="Insert Image"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting('table')}
                  title="Insert Table"
                >
                  <Table className="h-4 w-4" />
                </Button>
                
                {/* Merge Fields */}
                {mergeFields.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" title="Insert Merge Field">
                          <Plus className="h-4 w-4 mr-1" />
                          Merge Field
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Insert Merge Field</h4>
                          <ScrollArea className="h-64">
                            <div className="space-y-3">
                              {Object.entries(groupedMergeFields).map(([source, fields]) => (
                                <div key={source} className="space-y-2">
                                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {source}
                                  </h5>
                                  <div className="space-y-1">
                                    {fields.map((field) => (
                                      <Button
                                        key={field.id}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start h-auto p-2"
                                        onClick={() => insertMergeField(field)}
                                      >
                                        <div className="text-left">
                                          <div className="font-medium text-sm">{field.displayName}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {field.name}
                                          </div>
                                          {field.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {field.description}
                                            </div>
                                          )}
                                        </div>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
              
              {/* Secondary Toolbar - Font and Style Options */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Font:</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Size:</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10px</SelectItem>
                      <SelectItem value="12">12px</SelectItem>
                      <SelectItem value="14">14px</SelectItem>
                      <SelectItem value="16">16px</SelectItem>
                      <SelectItem value="18">18px</SelectItem>
                      <SelectItem value="20">20px</SelectItem>
                      <SelectItem value="24">24px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Color:</Label>
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-12 h-8 p-1 border rounded"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardHeader>
      
      <CardContent>
        {isPreviewMode ? (
          renderPreview()
        ) : (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={textValue}
              onChange={(e) => handleTextChange(e.target.value)}
              onSelect={updateSelection}
              onKeyUp={updateSelection}
              onMouseUp={updateSelection}
              placeholder={placeholder}
              className="min-h-[400px] text-sm resize-none"
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize}px`,
                color: textColor,
                backgroundColor: backgroundColor
              }}
              readOnly={readOnly}
              onKeyDown={(e) => {
                // Handle keyboard shortcuts
                if (e.ctrlKey || e.metaKey) {
                  switch (e.key) {
                    case 'b':
                      e.preventDefault();
                      insertFormatting('bold');
                      break;
                    case 'i':
                      e.preventDefault();
                      insertFormatting('italic');
                      break;
                    case 'u':
                      e.preventDefault();
                      insertFormatting('underline');
                      break;
                    case 'z':
                      e.preventDefault();
                      if (e.shiftKey) {
                        handleRedo();
                      } else {
                        handleUndo();
                      }
                      break;
                    case 'y':
                      e.preventDefault();
                      handleRedo();
                      break;
                    case 's':
                      e.preventDefault();
                      onSave?.();
                      break;
                  }
                }
              }}
            />
            
            {/* Editor Status Bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <div className="flex items-center gap-4">
                <span>Words: {textValue.split(/\s+/).filter(word => word.length > 0).length}</span>
                <span>Characters: {textValue.length}</span>
                {editorState.selectedText && (
                  <span>Selected: {editorState.selectedText.length} chars</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>Line: {textValue.substring(0, editorState.selectionStart).split('\n').length}</span>
                <span>Column: {editorState.selectionStart - textValue.lastIndexOf('\n', editorState.selectionStart - 1)}</span>
              </div>
            </div>
            
            {/* Help Text */}
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <span>Shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline), Ctrl+Z (undo), Ctrl+Y (redo)</span>
                <span>Merge fields: Use toolbar or type {{`field.name`}}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions for content conversion
function convertRichTextToMarkdown(content: RichTextContent): string {
  // Simple conversion from rich text to markdown-like syntax
  // This is a basic implementation - in production, use a proper converter
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

function convertMarkdownToRichText(markdown: string): RichTextContent {
  // Simple conversion from markdown to rich text structure
  // This is a basic implementation - in production, use a proper parser
  const paragraphs = markdown.split('\n\n').filter(p => p.trim());
  
  const content = paragraphs.map(paragraph => ({
    type: 'paragraph',
    content: [{
      type: 'text',
      text: paragraph.trim()
    }]
  }));
  
  return {
    type: 'doc',
    content
  };
}

function convertMarkdownToHtml(markdown: string): string {
  // Enhanced markdown to HTML conversion for preview
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
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
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded border" />')
    // Merge fields
    .replace(/\{\{(.*?)\}\}/g, '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono border border-blue-200">{{$1}}</span>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-t border-gray-300 my-4" />')
    // Line breaks (double newlines become paragraph breaks)
    .replace(/\n\n/g, '</p><p>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');

  // Handle tables (basic implementation)
  html = html.replace(/\|(.+)\|/g, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    const isHeader = html.indexOf(match) === html.indexOf('|') && html.includes('|---|');
    const tag = isHeader ? 'th' : 'td';
    const cellClass = isHeader ? 'font-semibold bg-gray-50' : '';
    return `<tr>${cells.map((cell: string) => `<${tag} class="border border-gray-300 px-3 py-2 ${cellClass}">${cell}</${tag}>`).join('')}</tr>`;
  });

  // Wrap table rows in table
  html = html.replace(/(<tr>.*<\/tr>)/gs, '<table class="border-collapse border border-gray-300 w-full my-4">$1</table>');
  
  // Remove table separator rows
  html = html.replace(/<tr><td[^>]*>\s*-+\s*<\/td><\/tr>/g, '');
  
  // Wrap in paragraphs if not already wrapped
  if (html && !html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  // Clean up list wrapping
  html = html.replace(/(<li[^>]*>.*<\/li>)/gs, (match) => {
    if (!match.includes('<ul>') && !match.includes('<ol>')) {
      return `<ul class="list-disc ml-6 my-2">${match}</ul>`;
    }
    return match;
  });
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  
  return html;
}

export default RichTextEditor;