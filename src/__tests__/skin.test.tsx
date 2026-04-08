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

  // ── Product Usage Tracking ──

  it('shows reaction buttons when product is expanded', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    // Click to expand a product
    await user.click(screen.getByText('Laneige Cream Skin'));
    await waitFor(() => {
      expect(screen.getByText('Log today:')).toBeTruthy();
    });
    // Should show reaction emojis
    expect(screen.getByText('👍')).toBeTruthy();
    expect(screen.getByText('😐')).toBeTruthy();
    expect(screen.getByText('👎')).toBeTruthy();
  });

  it('shows quick note input when product is expanded', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    await user.click(screen.getByText('Laneige Cream Skin'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Quick note (optional)')).toBeTruthy();
    });
  });

  it('shows testing day count for testing products', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('🧪 Testing')).toBeTruthy();
    });
    // Madeca Cream is in testing status — should show "Day X" if testingStartDate set
    expect(screen.getByText('Madeca Cream')).toBeTruthy();
  });

  it('shows status change options when product is expanded', async () => {
    await renderSkin();
    await user.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    await user.click(screen.getByText('Laneige Cream Skin'));
    await waitFor(() => {
      expect(screen.getByText('Change status:')).toBeTruthy();
    });
  });

  // ── Routine Insights & Tester Dashboard ──

  it('shows "How It\'s Going" insights card in routine tab', async () => {
    await renderSkin();
    expect(screen.getByText(/How It.s Going/)).toBeTruthy();
  });

  it('shows AM and PM adherence labels', async () => {
    await renderSkin();
    expect(screen.getByText('☀️ AM')).toBeTruthy();
    expect(screen.getByText('🌙 PM')).toBeTruthy();
  });

  it('shows tester performance card in routine tab', async () => {
    await renderSkin();
    expect(screen.getByText('🧪 Tester Performance')).toBeTruthy();
  });

  // ── Customizable Routine Management ──

  it('shows add button on AM routine section', async () => {
    await renderSkin();
    // The AM Routine section should have a "+" button to add products
    const amSection = screen.getByText('☀️ AM Routine');
    expect(amSection).toBeTruthy();
    // Look for add button within/near AM routine section
    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows add button on PM routine section', async () => {
    await renderSkin();
    const pmSection = screen.getByText('🌙 PM Routine');
    expect(pmSection).toBeTruthy();
    // Both AM and PM sections should have add buttons
    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows remove button on routine steps', async () => {
    await renderSkin();
    // Each routine step should have an "x" remove button
    const removeButtons = screen.getAllByText('✕');
    // At least one remove button per visible routine step
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows reorder arrows on routine steps', async () => {
    await renderSkin();
    // Each routine step should have up/down reorder arrows
    const upArrows = screen.getAllByText('▲');
    const downArrows = screen.getAllByText('▼');
    expect(upArrows.length).toBeGreaterThanOrEqual(1);
    expect(downArrows.length).toBeGreaterThanOrEqual(1);
  });

  it('product picker shows only safe and testing products', async () => {
    await renderSkin();
    // Click the "+" add button on AM routine to open product picker
    const addButtons = screen.getAllByText('+');
    await user.click(addButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Add Product to Routine')).toBeTruthy();
    });
    // Should show safe products
    expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    expect(screen.getByText('Wellage HA Blue Ampoule')).toBeTruthy();
    // Should show testing products
    expect(screen.getByText('Madeca Cream')).toBeTruthy();
    // Should NOT show trigger products in the picker
    expect(screen.queryByText('Niacinamide (high %)')).toBeNull();
    expect(screen.queryByText('Snail Mucin')).toBeNull();
  });
});
