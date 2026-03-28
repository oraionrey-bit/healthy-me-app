import React, { useState } from 'react';
import { ScreenWrapper } from '../../components/ui';
import { HealthDashboard } from '../../components/health/health-dashboard';
import { AskOraionFAB, AskOraionModal } from '../../components/chat';

export default function HealthScreen() {
  const [askOraionVisible, setAskOraionVisible] = useState(false);

  return (
    <>
    <ScreenWrapper scrollable>
      <HealthDashboard />
    </ScreenWrapper>
    <AskOraionFAB onPress={() => setAskOraionVisible(true)} />
    <AskOraionModal visible={askOraionVisible} onClose={() => setAskOraionVisible(false)} />
    </>
  );
}
