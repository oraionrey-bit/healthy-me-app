/**
 * Health Tab Tests
 *
 * Tests the health dashboard screen: title, time range selector, Ask Oraion FAB.
 */
import React from 'react';
import { mockSetTableData, render, screen, waitFor } from './test-utils';

jest.mock('../hooks/use-oura', () => ({
  useOura: () => ({
    isConnected: true,
    recentData: [{
      id: 'oura-1', user_id: 'test-user-id', date: '2026-07-15',
      sleep_score: 80, hrv_average: 42,
    }],
  }),
}));

async function renderHealth() {
  const HealthScreen = require('../app/(tabs)/health').default;
  render(<HealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('HEALTH')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Health Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetTableData('symptoms', [{
      id: 'symptoms-1', user_id: 'test-user-id', log_date: '2026-07-15',
      mood: 4, energy_level: 3,
    }]);
  });

  it('renders health title', async () => {
    await renderHealth();
    expect(screen.getByText('HEALTH')).toBeTruthy();
  });

  it('renders time range selector with 7D/30D/90D options', async () => {
    await renderHealth();
    expect(screen.getByText('7D')).toBeTruthy();
    expect(screen.getByText('30D')).toBeTruthy();
    expect(screen.getByText('90D')).toBeTruthy();
  });

  it('omits unused Sleep, HRV, and Mood graphs while retaining unrelated graphs', async () => {
    await renderHealth();
    expect(screen.queryByText('😴 Sleep Score')).toBeNull();
    expect(screen.queryByText('💓 HRV')).toBeNull();
    expect(screen.queryByText(/Mood & Energy/)).toBeNull();
    expect(screen.getByText(/Nutrition/)).toBeTruthy();
    expect(screen.getByText(/Weight/)).toBeTruthy();
  });

  it('shows Zepbound history without duplicate logging controls', async () => {
    await renderHealth();
    expect(screen.getByText('💉 Zepbound history')).toBeTruthy();
    expect(screen.queryByText('+ Log shot')).toBeNull();
    expect(screen.queryByText('+ Log symptom')).toBeNull();
  });
});
