import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Template, 
  History, 
  Settings, 
  Plus,
  Download,
  Upload,
  Search
} from 'lucide-react';
import { TemplateLibrary } from '@/components/documents/TemplateLibrary';
import { TemplateAuditLog } from '@/components/documents/TemplateAuditLog';

const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');

  // Mock data for demonstration
  const recentDocuments = [
    {
      id: '1',
      name: 'Patient Consent Form - John Doe',
      template: 'Surgical Consent Form',
      createdAt: new Date('2024-01-15'),
      status: 'completed'
    },
    {
      id: '2',
      name: 'Treatment Plan - Jane Smith',
      template: 'Treatment Plan Template',
      createdAt: new Date('2024-01-14'),
      status: 'completed'
    },
    {
      id: '3',
      name: 'Referral Letter - Bob Johnson',
      template: 'Specialist Referral',
      createdAt: new Date('2024-01-13'),
      status: 'processing'
    }
  ];

  const templateStats = {
    total: 24,
    active: 18,
    pending: 3,
    inactive: 3
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage document templates and generate patient documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Template
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Template className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templateStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Available document templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{templateStats.active}</div>
            <p className="text-xs text-muted-foreground">
              Ready for document generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{templateStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval workflow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generated">Generated Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Documents</CardTitle>
              <CardDescription>
                View and manage documents generated from templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Template: {doc.template}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={doc.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {doc.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document History</CardTitle>
              <CardDescription>
                Track all document generation activities and template changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Document History</h3>
                <p className="text-muted-foreground">
                  Document generation history and audit trail will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <TemplateAuditLog showAllTemplates={true} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Categories</CardTitle>
                <CardDescription>
                  Manage template categories and organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Category Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure template categories and merge fields.
                  </p>
                  <Button variant="outline">
                    Manage Categories
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Merge Fields</CardTitle>
                <CardDescription>
                  Configure available merge fields for templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Merge Field Configuration</h3>
                  <p className="text-muted-foreground mb-4">
                    Add and configure merge fields for patient, appointment, and clinic data.
                  </p>
                  <Button variant="outline">
                    Manage Fields
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Workflows</CardTitle>
                <CardDescription>
                  Configure template approval processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Workflow Configuration</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up approval workflows and assign approvers.
                  </p>
                  <Button variant="outline">
                    Configure Workflows
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Generation</CardTitle>
                <CardDescription>
                  Configure document generation settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Generation Settings</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure PDF generation, storage, and delivery options.
                  </p>
                  <Button variant="outline">
                    Configure Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documents;