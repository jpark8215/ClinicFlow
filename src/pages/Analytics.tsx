import React from 'react';
import { AnalyticsDashboard } from '@/components/analytics';
import DashboardLayout from '@/components/layout/DashboardLayout';

const AnalyticsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <AnalyticsDashboard />
    </DashboardLayout>
  );
};

export default AnalyticsPage;