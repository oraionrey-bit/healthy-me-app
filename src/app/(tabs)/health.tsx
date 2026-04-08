import React from 'react';
import { ScreenWrapper } from '../../components/ui';
import { HealthDashboard } from '../../components/health/health-dashboard';

export default function HealthScreen() {
  return (
    <ScreenWrapper scrollable>
      <HealthDashboard />
    </ScreenWrapper>
  );
}
