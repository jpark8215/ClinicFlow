import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function TempErrorPage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Database Migration Required</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">
            The application is currently waiting for database migrations to be applied. 
            Several features are temporarily disabled until the following migrations from your GitHub repository are run:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>Migration files dated 20250831</li>
            <li>Migration files dated 20250901</li>
          </ul>
          <p className="mb-4">
            These migrations are available at: 
            <a 
              href="https://github.com/jpark8215/ClinicFlow/tree/main/supabase/migrations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              GitHub Repository - Supabase Migrations
            </a>
          </p>
          <p className="text-sm text-gray-600">
            Please run these migrations in your Supabase dashboard, then the application will be fully functional.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}