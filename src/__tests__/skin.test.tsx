/**
 * Skin Tab Tests
 *
 * Tests the skincare screen: tab navigation (Routine/Journal/Products),
 * AM/PM routine checklists, trigger watchlist, product library.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';
import userEvent from '@testing-library/user-event';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

process.env.EXPO_PUBLIC_CHAT_TOKEN = 'test-chat-token';

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
    fireEvent.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText('Skin Journal')).toBeTruthy();
    });
    expect(screen.getByText('+ New Entry')).toBeTruthy();
  });

  it('shows empty journal state', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText(/No journal entries yet/)).toBeTruthy();
    });
  });

  it('opens journal form on "+ New Entry"', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Journal'));
    await waitFor(() => {
      expect(screen.getByText('+ New Entry')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('+ New Entry'));
    await waitFor(() => {
      expect(screen.getByText(/How's your skin today/)).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('Describe your skin today...')).toBeTruthy();
    expect(screen.getByText('Severity')).toBeTruthy();
  });

  it('renders trigger chips in journal form', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Journal'));
    await waitFor(() => expect(screen.getByText('+ New Entry')).toBeTruthy());
    fireEvent.click(screen.getByText('+ New Entry'));
    await waitFor(() => expect(screen.getByText('Stress')).toBeTruthy());
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Hormonal')).toBeTruthy();
    expect(screen.getByText('Sleep')).toBeTruthy();
  });

  // ── Products Tab ──

  it('switches to Products tab on press', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Product Library')).toBeTruthy();
    });
    expect(screen.getByText('+ Add')).toBeTruthy();
  });

  it('groups products by status', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('✅ Safe Products')).toBeTruthy();
    });
    expect(screen.getByText('🧪 Testing')).toBeTruthy();
    expect(screen.getByText('❌ Triggers')).toBeTruthy();
  });

  it('shows safe products in library', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    expect(screen.getByText('Wellage HA Blue Ampoule')).toBeTruthy();
  });

  it('shows trigger products in library', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Niacinamide (high %)')).toBeTruthy();
    });
    expect(screen.getByText('Snail Mucin')).toBeTruthy();
  });

  // ── Product Usage Tracking ──

  it('shows product expand arrow in product library', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    // Products should show expand indicators
    const arrows = screen.getAllByText('▸');
    expect(arrows.length).toBeGreaterThanOrEqual(1);
  });

  it('shows product status icons in library', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    // Safe products have ✅ icon, triggers have ❌
    expect(screen.getAllByText('✅').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('❌').length).toBeGreaterThanOrEqual(1);
  });

  it('shows testing day count for testing products', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('🧪 Testing')).toBeTruthy();
    });
    expect(screen.getByText('Madeca Cream')).toBeTruthy();
  });

  it('shows product card with expand capability', async () => {
    await renderSkin();
    fireEvent.click(screen.getByText('Products'));
    await waitFor(() => {
      expect(screen.getByText('Laneige Cream Skin')).toBeTruthy();
    });
    // Product cards should have testIDs for expand
    const productCards = screen.getAllByTestId(/product-card-/);
    expect(productCards.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the chosen product photo visible and auto-fills concise skin product info after analysis', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://skin-product.jpg' }],
    });

    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === 'file://skin-product.jpg') {
        return { blob: async () => new Blob(['img'], { type: 'image/jpeg' }) } as Response;
      }
      if (url.endsWith('/health')) {
        return { ok: true } as Response;
      }
      if (url.endsWith('/analyze')) {
        return { ok: true, status: 200, json: async () => ({ id: 'scan-1' }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as jest.Mock;

    const originalFrom = supabase.from as jest.Mock;
    const defaultFrom = originalFrom.getMockImplementation();
    originalFrom.mockImplementation((table: string) => {
      if (table !== 'chat_messages') return defaultFrom?.(table);

      let selected = '';
      const builder: any = {};
      builder.select = jest.fn((value: string) => {
        selected = value;
        return builder;
      });
      builder.eq = jest.fn(() => builder);
      builder.order = jest.fn(() => builder);
      builder.limit = jest.fn(() => builder);
      builder.single = jest.fn(() => Promise.resolve({
        data: selected === 'status'
          ? { status: 'complete' }
          : { content: JSON.stringify({
              name: 'Azalea Cream',
              brand: '태극제약',
              ingredients: ['Azelaic acid 20%'],
              product_type: 'treatment',
              triggers_found: [],
              notes: '20% azelaic acid treatment; start slowly and use sunscreen.',
            }) },
        error: null,
      }));
      return builder;
    });

    try {
      await renderSkin();
      fireEvent.click(screen.getByText('Products'));
      await waitFor(() => expect(screen.getByText('+ Add')).toBeTruthy());
      fireEvent.click(screen.getByText('+ Add'));
      await waitFor(() => expect(screen.getByText('🖼️ Gallery')).toBeTruthy());

      fireEvent.click(screen.getByText('🖼️ Gallery'));

      await waitFor(() => expect(screen.getByTestId('skin-product-preview-image')).toBeTruthy());

      await waitFor(() => expect(screen.getByDisplayValue('태극제약 Azalea Cream')).toBeTruthy());
      expect(screen.getByDisplayValue(/Azelaic acid 20%/)).toBeTruthy();
      expect(screen.getByDisplayValue(/start slowly and use sunscreen/)).toBeTruthy();
    } finally {
      global.fetch = originalFetch;
      originalFrom.mockImplementation(defaultFrom);
    }
  });

  it('stops polling and shows a manual-entry message when product analysis is marked error', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://skin-product.jpg' }],
    });

    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === 'file://skin-product.jpg') {
        return { blob: async () => new Blob(['img'], { type: 'image/jpeg' }) } as Response;
      }
      if (url.endsWith('/health')) return { ok: true } as Response;
      if (url.endsWith('/analyze')) {
        return { ok: true, status: 200, json: async () => ({ id: 'scan-error' }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as jest.Mock;

    const originalFrom = supabase.from as jest.Mock;
    const defaultFrom = originalFrom.getMockImplementation();
    originalFrom.mockImplementation((table: string) => {
      if (table !== 'chat_messages') return defaultFrom?.(table);

      const builder: any = {};
      builder.select = jest.fn(() => builder);
      builder.eq = jest.fn(() => builder);
      builder.order = jest.fn(() => builder);
      builder.limit = jest.fn(() => builder);
      builder.single = jest.fn(() => Promise.resolve({ data: { status: 'error' }, error: null }));
      return builder;
    });

    try {
      await renderSkin();
      fireEvent.click(screen.getByText('Products'));
      await waitFor(() => expect(screen.getByText('+ Add')).toBeTruthy());
      fireEvent.click(screen.getByText('+ Add'));
      await waitFor(() => expect(screen.getByText('🖼️ Gallery')).toBeTruthy());
      fireEvent.click(screen.getByText('🖼️ Gallery'));

      await waitFor(() => {
        expect(screen.getByText(/Photo analysis could not finish/)).toBeTruthy();
      });
    } finally {
      global.fetch = originalFetch;
      originalFrom.mockImplementation(defaultFrom);
    }
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
    const amSection = screen.getByText('☀️ AM Routine');
    expect(amSection).toBeTruthy();
    // The "+" is in the Up Next section input area
    const addButtons = screen.getAllByText('+');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button on routine sections', async () => {
    await renderSkin();
    // Both AM and PM routines have an Edit button
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows remove button on routine steps', async () => {
    await renderSkin();
    // Up Next items have ✕ remove buttons
    const removeButtons = screen.getAllByText('✕');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('entering edit mode shows reorder arrows', async () => {
    await renderSkin();
    // Click Edit on AM Routine to enter edit mode
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      // Edit mode shows ▲/▼ reorder arrows on each step
      const upArrows = screen.getAllByText('▲');
      expect(upArrows.length).toBeGreaterThanOrEqual(1);
    });
    const downArrows = screen.getAllByText('▼');
    expect(downArrows.length).toBeGreaterThanOrEqual(1);
  });

  it('edit mode shows + Add Product button and product picker', async () => {
    await renderSkin();
    // Click Edit on AM Routine
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('+ Add Product')).toBeTruthy();
    });
    // Click + Add Product to open picker
    fireEvent.click(screen.getByText('+ Add Product'));
    await waitFor(() => {
      expect(screen.getByText('Add Product to Routine')).toBeTruthy();
    });
    // Product picker shows safe/testing products (may duplicate names from routine)
    expect(screen.getAllByText('Laneige Cream Skin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Madeca Cream').length).toBeGreaterThanOrEqual(1);
  });
});
