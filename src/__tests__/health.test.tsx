/**
 * Health Tab Tests
 *
 * Tests the health dashboard screen: title, time range selector, Ask Oraion FAB.
 */
import React from 'react';
import { render, screen, waitFor } from './test-utils';

async function renderHealth() {
  const HealthScreen = require('../app/(tabs)/health').default;
  render(<HealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('HEALTH')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Health Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

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

  it('renders mood and energy section', async () => {
    await renderHealth();
    expect(screen.getByText(/Mood/)).toBeTruthy();
  });

  it('shows Zepbound history without duplicate logging controls', async () => {
    await renderHealth();
    expect(screen.getByText('💉 Zepbound history')).toBeTruthy();
    expect(screen.queryByText('+ Log shot')).toBeNull();
    expect(screen.queryByText('+ Log symptom')).toBeNull();
  });
});
