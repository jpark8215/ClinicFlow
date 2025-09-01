# Custom Reports Component

## Overview

The CustomReports component implements a comprehensive drag-and-drop report builder interface that allows users to create, configure, and preview custom analytics reports. This component fulfills task 3.1 of the development roadmap completion specification.

## Features Implemented

### 1. Drag-and-Drop Report Builder
- **Available Metrics Panel**: Displays categorized metrics that can be dragged into the report builder
- **Report Sections Panel**: Drop zone where users can build their reports by dropping metrics
- **Interactive Metric Cards**: Each metric displays with an icon, name, description, and drag handle
- **Real-time Section Management**: Users can add, remove, and configure report sections dynamically

### 2. Metric Selection and Configuration
- **Categorized Metrics**: Metrics are organized by category (Appointments, Capacity, Efficiency, Financial)
- **Chart Type Selection**: Each metric supports multiple visualization types (number, line, bar, pie, gauge, area)
- **Section Customization**: Users can customize section titles and chart types
- **Validation**: Ensures appropriate chart types are available for each metric's data type

### 3. Report Preview Functionality
- **Sample Data Preview**: Generates preview using real analytics data
- **Multiple Layout Options**: Supports single-column, two-column, and grid layouts
- **Interactive Preview**: Shows how the report will look with actual formatting
- **Real-time Updates**: Preview updates as users modify report configuration

### 4. Template Management
- **Template Creation**: Save report configurations as reusable templates
- **Template Settings**: Configure name, description, date range, export format, and layout
- **Public/Private Templates**: Option to make templates available to all users
- **Template Validation**: Ensures required fields and metrics are present before creation

## Component Structure

```
CustomReports/
├── Main Component (CustomReports.tsx)
├── Tests/
│   ├── CustomReports.test.tsx (Unit tests)
│   └── CustomReports.integration.test.tsx (Integration tests)
└── Types and Interfaces
```

## Available Metrics

### Appointments Category
- **Total Appointments**: Total number of appointments in the selected period
- **Completed Appointments**: Number of successfully completed appointments
- **No-Show Rate**: Percentage of appointments that resulted in no-shows
- **Completion Rate**: Percentage of appointments that were completed

### Capacity Category
- **Utilization Rate**: Percentage of available appointment slots that were booked

### Efficiency Category
- **Average Duration**: Average duration of completed appointments

### Financial Category
- **Estimated Revenue**: Total estimated revenue from completed appointments
- **Revenue Trend**: Revenue trends over time

## Chart Types

Each metric supports different visualization types based on its data type:

- **Number Display**: Simple numeric display for KPIs
- **Line Chart**: Time-series data visualization
- **Bar Chart**: Comparative data visualization
- **Pie Chart**: Proportional data visualization
- **Area Chart**: Filled time-series visualization
- **Gauge Chart**: Progress/percentage visualization

## Usage

### Basic Usage
```tsx
import { CustomReports } from '@/components/analytics/CustomReports';

<CustomReports clinicId="optional-clinic-id" />
```

### Integration with Analytics Dashboard
The component is integrated into the main AnalyticsDashboard as a tab:

```tsx
<TabsContent value="reports" className="space-y-4">
  <CustomReports clinicId={clinicId} />
</TabsContent>
```

## API Integration

The component integrates with the analytics service for:

### Report Template Operations
- `createReportTemplate()`: Creates new report templates
- `getReportTemplates()`: Retrieves existing templates
- `generateReport()`: Generates reports from templates

### Data Operations
- `computeRealTimeMetrics()`: Fetches sample data for previews
- Template validation and configuration storage

## Database Schema

The component works with the following database tables:

### report_templates
```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Template Configuration Structure
```typescript
interface ReportConfig {
  sections: ReportSection[];
  dateRange: string;
  format: string;
  filters: Record<string, any>;
  layout: 'single-column' | 'two-column' | 'grid';
}

interface ReportSection {
  id: string;
  title: string;
  metrics: string[];
  chartType: string;
  order: number;
}
```

## Testing

### Unit Tests
- Component rendering and basic functionality
- Drag and drop event handling
- Form validation and submission
- Preview generation

### Integration Tests
- Complete workflow testing
- Service integration validation
- Error handling scenarios

## Requirements Fulfilled

This implementation satisfies the following requirements from the specification:

### Requirement 1.3 (Custom Reporting)
- ✅ Custom date ranges and filtering
- ✅ Export functionality (PDF, Excel, CSV)
- ✅ Interactive report builder

### Requirement 1.5 (Template Management)
- ✅ Template creation and storage
- ✅ Template categorization
- ✅ Public/private template sharing

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Filtering**: Add more sophisticated filtering options
2. **Scheduled Reports**: Integration with automated report scheduling
3. **Collaborative Features**: Template sharing and collaboration
4. **Advanced Visualizations**: More chart types and customization options
5. **Export Enhancements**: Real-time export generation and delivery

## Performance Considerations

- **Lazy Loading**: Metrics are loaded on demand
- **Debounced Updates**: Preview generation is debounced to prevent excessive API calls
- **Optimistic UI**: Immediate feedback for user interactions
- **Error Boundaries**: Graceful error handling and recovery

## Accessibility

- **Keyboard Navigation**: Full keyboard support for drag and drop
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Logical focus flow throughout the interface
- **Color Contrast**: Meets WCAG accessibility guidelines
---


# Report Scheduler Component ⭐ NEW

## Overview

The ReportScheduler component implements comprehensive report scheduling and automation functionality that allows users to create, manage, and monitor automated report generation and email delivery. This component fulfills task 3.2 of the development roadmap completion specification.

## Features Implemented

### 1. Automated Report Scheduling
- **Schedule Configuration**: Create schedules with daily, weekly, or monthly frequency
- **Time Management**: Configure specific hours and timezone settings
- **Day Selection**: Choose specific days for weekly schedules or day of month for monthly schedules
- **Template Integration**: Schedule any existing report template for automation

### 2. Email Delivery System
- **Multiple Recipients**: Add and manage multiple email recipients per schedule
- **Delivery Tracking**: Monitor successful and failed email deliveries
- **Error Handling**: Detailed error messages for troubleshooting delivery issues
- **Recipient Management**: Add, edit, and remove email recipients dynamically

### 3. Schedule Management Interface
- **Schedule Overview**: Comprehensive table view of all scheduled reports
- **Status Management**: Activate, pause, and delete schedules
- **Quick Actions**: Run reports immediately, view history, and manage schedules
- **Status Indicators**: Visual badges showing Active, Paused, or Overdue status
- **Next Run Display**: Shows when each report is scheduled to run next

### 4. Execution History and Monitoring
- **Detailed History**: Complete execution logs with timestamps and status
- **Performance Metrics**: Track execution duration and recipient counts
- **Error Tracking**: Full error messages and troubleshooting information
- **Status Tracking**: Monitor Pending, Running, Completed, and Failed executions

## Component Structure

```
ReportScheduler/
├── Main Component (ReportScheduler.tsx)
├── Service Layer (reportSchedulerService.ts)
├── Database Migrations/
│   └── 20250831000002_report_executions.sql
├── Tests/
│   └── ReportScheduler.test.tsx
└── Types and Interfaces
```

## Schedule Configuration Options

### Frequency Types
- **Daily**: Runs every day at specified time
- **Weekly**: Runs on specific day of week at specified time
- **Monthly**: Runs on specific day of month at specified time

### Time Settings
- **Hour Selection**: 24-hour format time selection
- **Timezone Support**: Multiple timezone options including:
  - Eastern Time (America/New_York)
  - Central Time (America/Chicago)
  - Mountain Time (America/Denver)
  - Pacific Time (America/Los_Angeles)
  - UTC

### Recipient Management
- **Email Validation**: Automatic email format validation
- **Dynamic Recipients**: Add/remove recipients as needed
- **Delivery Status**: Track delivery success/failure per recipient

## Usage

### Basic Usage
```tsx
import { ReportScheduler } from '@/components/analytics/ReportScheduler';

<ReportScheduler clinicId="optional-clinic-id" />
```

### Integration with CustomReports
The component is integrated into the CustomReports component as a tab:

```tsx
<Tabs defaultValue="templates" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="templates">Report Templates</TabsTrigger>
    <TabsTrigger value="scheduler">Scheduled Reports</TabsTrigger>
    <TabsTrigger value="history">Report History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="scheduler" className="space-y-6">
    <ReportScheduler clinicId={clinicId} />
  </TabsContent>
</Tabs>
```

## API Integration

The component integrates with the reportSchedulerService for:

### Schedule Management Operations
- `createScheduledReport()`: Creates new report schedules
- `getScheduledReports()`: Retrieves existing schedules
- `updateScheduledReport()`: Updates schedule configuration
- `deleteScheduledReport()`: Removes schedules
- `executeScheduledReport()`: Runs reports immediately

### History and Monitoring
- `getReportHistory()`: Retrieves execution history
- `getDueReports()`: Gets reports ready to run
- `processDueReports()`: Processes all due reports (background job)

## Database Schema

The component works with the following database tables:

### scheduled_reports
```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES report_templates(id),
  name VARCHAR NOT NULL,
  schedule_config JSONB NOT NULL,
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### report_executions
```sql
CREATE TABLE report_executions (
  id UUID PRIMARY KEY,
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  execution_duration INTEGER,
  recipient_count INTEGER DEFAULT 0,
  error_message TEXT,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Configuration Structures
```typescript
interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
}

interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  scheduleConfig: ScheduleConfig;
  recipients: string[];
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportExecution {
  id: string;
  scheduledReportId: string;
  executedAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionDuration?: number;
  recipientCount?: number;
  errorMessage?: string;
  reportData?: any;
}
```

## Email Delivery System

### Delivery Process
1. **Report Generation**: Generate report using specified template
2. **Email Composition**: Create email with report attachment
3. **Batch Delivery**: Send to all recipients with error handling
4. **Status Tracking**: Record delivery success/failure for each recipient
5. **Error Reporting**: Log detailed error messages for failed deliveries

### Delivery Results
```typescript
interface EmailDeliveryResult {
  success: boolean;
  recipientEmail: string;
  errorMessage?: string;
}
```

## Testing

### Unit Tests
- Component rendering and form validation
- Schedule creation and management
- Email delivery simulation
- Error handling scenarios

### Integration Tests
- Complete scheduling workflow
- Service integration validation
- Database operations testing
- Email delivery testing

## Requirements Fulfilled

This implementation satisfies the following requirements from the specification:

### Requirement 1.3 (Custom Reporting)
- ✅ Automated report generation
- ✅ Scheduled report execution
- ✅ Email delivery integration

### Requirement 1.5 (Template Management)
- ✅ Template-based scheduling
- ✅ Schedule management interface
- ✅ Execution history tracking

## Security Considerations

### Row Level Security (RLS)
- Users can only manage their own scheduled reports
- Admin users have full access to all schedules
- Execution history is restricted to report owners

### Data Protection
- Email addresses are validated and sanitized
- Schedule configurations are stored securely
- Execution logs include audit trails

## Performance Optimizations

### Database Indexing
- Optimized indexes for schedule queries
- Efficient execution history retrieval
- Fast due report identification

### Background Processing
- Asynchronous report generation
- Batch email delivery
- Queue management for large operations

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Scheduling**: Cron-like expressions for complex schedules
2. **Delivery Options**: SMS, Slack, and other notification channels
3. **Report Customization**: Per-schedule report customization
4. **Monitoring Dashboard**: Real-time monitoring and alerting
5. **Retry Logic**: Automatic retry for failed deliveries
6. **Template Versioning**: Handle template changes in scheduled reports

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Logical focus flow throughout the interface
- **Color Contrast**: Status indicators meet WCAG guidelines
- **Error Messaging**: Clear, accessible error messages and validation feedback
---

#
 Export Manager Component ⭐ NEW

## Overview

The ExportManager component implements comprehensive export functionality for reports and analytics data with support for multiple formats (PDF, Excel, CSV) and bulk export operations. This component fulfills task 3.3 of the development roadmap completion specification.

## Features Implemented

### 1. Multiple Export Formats
- **PDF Export**: Formatted reports with charts and tables using HTML-to-PDF conversion
- **Excel Export**: Structured data in Excel format with multiple sheets support
- **CSV Export**: Raw data in comma-separated values format for analysis
- **Format Selection**: Interactive format picker with descriptions and file extensions

### 2. Export Data Types
- **Report Templates**: Export formatted reports using existing report templates
- **Analytics Data**: Export real-time analytics metrics and calculations
- **Raw Database Data**: Export raw data from database tables for analysis
- **Flexible Configuration**: Support for different data sources and formats

### 3. Single and Bulk Export Operations
- **Single Export**: Export individual reports or data sets with custom configuration
- **Bulk Export**: Export multiple report templates in a single operation
- **Batch Processing**: Efficient processing of large export operations
- **Progress Tracking**: Real-time progress updates for long-running exports

### 4. Advanced Export Options
- **Date Range Selection**: Custom date ranges for time-based data exports
- **Filter Configuration**: Apply filters and parameters to exported data
- **Chart Inclusion**: Option to include or exclude charts and visualizations
- **Raw Data Toggle**: Include raw data tables alongside formatted reports
- **Metadata Options**: Include export metadata and summary information

### 5. Export Job Management
- **Job Queue**: Asynchronous processing of export jobs with status tracking
- **Progress Monitoring**: Real-time progress updates with percentage completion
- **Status Management**: Track pending, processing, completed, and failed exports
- **Error Handling**: Detailed error messages and retry capabilities
- **Job History**: Complete history of export operations with download links

### 6. File Management and Download
- **Secure Storage**: Files stored in Supabase Storage with proper access controls
- **Download Management**: Direct download links with automatic cleanup
- **File Size Tracking**: Monitor export file sizes and storage usage
- **Bulk Downloads**: Support for downloading multiple files or combined archives

## Component Structure

```
ExportManager/
├── Main Component (ExportManager.tsx)
├── Service Layer (exportService.ts)
├── Database Schema/
│   └── 20250831000003_export_jobs.sql
├── Tests/
│   ├── ExportManager.test.tsx
│   └── exportService.test.ts
└── Types and Interfaces
```

## Export Formats and Capabilities

### PDF Export
- **Formatted Reports**: Professional PDF documents with proper styling
- **Chart Integration**: Include charts and visualizations in PDF output
- **Metadata Headers**: Report titles, generation dates, and descriptions
- **Table Formatting**: Properly formatted data tables with headers and styling
- **Page Layout**: Responsive layout with proper margins and spacing

### Excel Export
- **Multiple Sheets**: Support for multiple data sheets in a single workbook
- **Data Formatting**: Proper cell formatting for numbers, dates, and text
- **Header Styling**: Bold headers with background colors for better readability
- **Formula Support**: Basic formula support for calculations and summaries
- **Metadata Sheet**: Separate sheet with export metadata and information

### CSV Export
- **Standard Format**: RFC 4180 compliant CSV format
- **Proper Escaping**: Handle commas, quotes, and newlines in data
- **UTF-8 Encoding**: Full Unicode support for international characters
- **Metadata Comments**: Include metadata as comments at the top of the file
- **Large Dataset Support**: Efficient handling of large data exports

## Usage

### Basic Usage
```tsx
import { ExportManager } from '@/components/analytics/ExportManager';

<ExportManager clinicId="optional-clinic-id" />
```

### Integration with CustomReports
The component is integrated into the CustomReports component as a tab:

```tsx
<Tabs defaultValue="templates" className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="templates">Report Templates</TabsTrigger>
    <TabsTrigger value="scheduler">Scheduled Reports</TabsTrigger>
    <TabsTrigger value="exports">Export Manager</TabsTrigger>
    <TabsTrigger value="history">Report History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="exports" className="space-y-6">
    <ExportManager clinicId={clinicId} />
  </TabsContent>
</Tabs>
```

## API Integration

The component integrates with the exportService for:

### Export Operations
- `createExport()`: Creates single export jobs
- `createBulkExport()`: Creates bulk export jobs
- `getExportStatus()`: Retrieves job status and progress
- `cancelExport()`: Cancels pending or processing exports
- `downloadExport()`: Handles file downloads

### Job Management
- `getExportHistory()`: Retrieves export job history
- `updateJobStatus()`: Updates job progress and status
- `uploadFile()`: Handles file storage and URL generation

## Database Schema

The component works with the following database table:

### export_jobs
```sql
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  format VARCHAR CHECK (format IN ('pdf', 'excel', 'csv')),
  data_type VARCHAR CHECK (data_type IN ('report', 'analytics', 'raw_data')),
  template_id UUID REFERENCES report_templates(id),
  template_ids UUID[], -- For bulk exports
  date_range JSONB,
  filters JSONB DEFAULT '{}',
  options JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  download_url TEXT,
  file_size BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## Requirements Fulfilled

This implementation satisfies the following requirements from the specification:

### Requirement 1.3 (Custom Reporting)
- ✅ Export functionality for PDF, Excel, and CSV formats
- ✅ Custom date ranges and filtering options
- ✅ Bulk export capabilities for large datasets

### Requirement 1.5 (Template Management)
- ✅ Template-based export operations
- ✅ Bulk export of multiple templates
- ✅ Export job management and history tracking

## Performance Optimizations

### Asynchronous Processing
- **Background Jobs**: Export processing runs asynchronously to avoid blocking UI
- **Progress Updates**: Real-time progress updates without polling overhead
- **Queue Management**: Efficient job queue with priority handling
- **Resource Management**: Proper cleanup of temporary files and resources

### Large Dataset Handling
- **Streaming Export**: Support for streaming large datasets to avoid memory issues
- **Chunked Processing**: Process large exports in chunks for better performance
- **Compression**: Optional compression for large export files
- **Pagination**: Efficient pagination for large result sets

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Formats**: Support for additional formats like JSON, XML, and Parquet
2. **Cloud Integration**: Direct export to cloud storage services (AWS S3, Google Drive)
3. **Email Delivery**: Automatic email delivery of completed exports
4. **Scheduled Exports**: Integration with report scheduler for automated exports
5. **Data Transformation**: Advanced data transformation and formatting options
6. **Export Templates**: Reusable export configurations and templates
7. **Compression Options**: Support for ZIP and other compression formats
8. **Watermarking**: Add watermarks and branding to exported documents

## Dependencies

### Required Packages
```json
{
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "xlsx": "^0.18.5",
  "file-saver": "^2.0.5"
}
```

### Type Definitions
```json
{
  "@types/file-saver": "^2.0.7"
}
```

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all export operations
- **Screen Reader Support**: Proper ARIA labels and descriptions for all elements
- **Focus Management**: Logical focus flow throughout the export interface
- **Color Contrast**: Status indicators and progress bars meet WCAG guidelines
- **Error Messaging**: Clear, accessible error messages and validation feedback
- **Progress Announcements**: Screen reader announcements for progress updates