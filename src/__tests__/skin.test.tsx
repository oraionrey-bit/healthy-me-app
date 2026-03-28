/**
 * Skin Tab Tests
 *
 * Tests the skincare screen: tab navigation (Routine/Journal/Products),
 * AM/PM routine checklists, trigger watchlist, product library.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';
import userEvent from '@testing-library/user-event';

async function renderSkin() {
  const SkinScreen = require('../app/(tabs)/skin').default;
  render(<SkinScreen />);
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.getByText('Routine')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Skin Screen', () => {
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
  });

  it('renders "Skin" header', async () => {
    await renderSkin();
    expect(screen.getByText('🧴 Skin')).toBeTruthy();
  });

  it('renders section tabs (Routine/Journal/Products)', async () => {
    await renderSkin();
    expect(screen.getByText('Routine')).toBeTruthy();
    expect(screen.getByText('Journal')).toBeTruthy();
    expect(screen.getByText('Products')).toBeTruthy();
  });

  it('defaults to Routine tab with AM/PM routines', async () => {
    await renderSkin();
    expect(screen.getByText('☀️ AM Routine')).toBeTruthy();
    expect(screen.getByText('🌙 PM Routine')).toBeTruthy();
  });

  it('shows routine step counts', async () => {
    await renderSkin();
    const counts = screen.getAllByText(/\d+\/\d+/);
    expect(counts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders trigger watchlist', async () => {
    await renderSkin();
    expect(screen.getByText('Trigger Watchlist')).toBeTruthy();
  });

  it('shows known triggers in watchlist', async () => {
    await renderSkin();
    expect(screen.getByText(/Niacinamide/)).toBeTruthy();
    expect(screen.getByText(/Snail Mucin/)).toBeTruthy();
  });

  // ── Journal Tab ──

  it('switches to Journal tab on press', async () => {
    await renderSkin();
    await user.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText('Skin Journal')).toBeTruthy();
    });
    expect(screen.getByText('+ New Entry')).toBeTruthy();
  });

  it('shows empty journal state', async () => {
    await renderSkin();
    await user.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText(/No journal entries yet/)).toBeTruthy();
    });
  });

  it('opens journal form on "+ New Entry"', async () => {
    await renderSkin();
    await user.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText('+ New Entry')).toBeTruthy();
    });
    await user.click(screen.getByText('+ New Entry'));
    await waitFor(() => {
      expect(screen.getByText(/How's your skin today/)).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('Describe your skin today...')).toBeTruthy();
    expect(screen.getByText('Severity')).toBeTruthy();
  });

  it('renders trigger chips in journal form', async () => {
    await renderSkin();
    await user.click(screen.getByText('Journal'));
    await waitFor(() => expect(screen.getByText('+ New Entry')).toBeTruthy());
    await user.click(screen.getByText('+ New Entry'));
    await waitFor(() => expect(screen.getByText('Stress')).toBeTruthy());
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Hormonal')).toBeTruthy();
    expect(screen.getByText('Sleep')).toBeTruthy();
  });

  // ── Products Tab ──

  it('switches to Products tab on press', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Product Library')).toBeTruthy();
    });
    expect(screen.getByText('+ Add')).toBeTruthy();
  });

  it('groups products by status', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('✅ Safe Products')).toBeTruthy();
    });
    expect(screen.getByText('🧪 Testing')).toBeTruthy();
    expect(screen.getByText('❌ Triggers')).toBeTruthy();
  });

  it('shows safe products in library', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    expect(screen.getByText('Wellage HA Blue Ampoule')).toBeTruthy();
  });

  it('shows trigger products in library', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Niacinamide (high %)')).toBeTruthy();
    });
    expect(screen.getByText('Snail Mucin')).toBeTruthy();
  });
});
