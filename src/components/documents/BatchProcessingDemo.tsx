import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { BatchDocumentProcessor } from './BatchDocumentProcessor';
import { BatchJobProgressTracker } from './BatchJobProgressTracker';
import { BatchJobQueueManager } from './BatchJobQueueManager';

export const BatchProcessingDemo: React.FC = () => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleJobCreated = (jobId: string) => {
    setSelectedJobId(jobId);
    setError(null);
  };

  const handleJobComplete = (job: any) => {
    setCompletedJobs(prev => [...prev, job.id]);
  };

  const handleJobError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleJobSelected = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Batch Document Processing</h1>
        <p className="text-gray-600">
          Comprehensive batch document generation with queue management and real-time progress tracking
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {completedJobs.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {completedJobs.length} job(s) completed successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="processor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="processor">Create Jobs</TabsTrigger>
          <TabsTrigger value="tracker">Track Progress</TabsTrigger>
          <TabsTrigger value="queue">Queue Manager</TabsTrigger>
          <TabsTrigger value="demo">Demo Features</TabsTrigger>
        </TabsList>

        <TabsContent value="processor">
          <BatchDocumentProcessor onJobCreated={handleJobCreated} />
        </TabsContent>

        <TabsContent value="tracker">
          {selectedJobId ? (
            <BatchJobProgressTracker
              jobId={selectedJobId}
              onJobComplete={handleJobComplete}
              onJobError={handleJobError}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-medium">No Job Selected</h3>
                  <p className="text-gray-500">
                    Create a job or select one from the queue to track its progress
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue">
          <BatchJobQueueManager onJobSelected={handleJobSelected} />
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing Features</CardTitle>
              <CardDescription>
                Key features implemented in the batch document processing system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600">✅ Implemented Features</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Batch job creation with multiple document requests</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Priority-based queue management system</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Real-time progress tracking with live updates</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Job control (pause, resume, cancel)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Concurrent processing with configurable limits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Automatic retry mechanism for failed documents</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Queue statistics and performance monitoring</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Database schema with proper indexing and RLS</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-600">🔧 Technical Implementation</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• TypeScript interfaces for type safety</li>
                    <li>• Supabase integration with real-time subscriptions</li>
                    <li>• React components with modern UI patterns</li>
                    <li>• Comprehensive error handling and recovery</li>
                    <li>• Optimized database queries and indexes</li>
                    <li>• Row Level Security (RLS) policies</li>
                    <li>• Abort controllers for job cancellation</li>
                    <li>• Progress estimation and ETA calculations</li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Usage Scenarios</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-800">Bulk Patient Forms</h5>
                    <p className="text-blue-600">Generate consent forms for multiple patients simultaneously</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-800">Insurance Documents</h5>
                    <p className="text-green-600">Process prior authorization forms in batches</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h5 className="font-medium text-purple-800">Appointment Letters</h5>
                    <p className="text-purple-600">Send appointment confirmations to multiple patients</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Expected performance characteristics of the batch processing system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">5-10</div>
                  <div className="text-sm text-gray-600">Concurrent Jobs</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">100+</div>
                  <div className="text-sm text-gray-600">Docs per Job</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">30-60</div>
                  <div className="text-sm text-gray-600">Docs per Minute</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">99%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};