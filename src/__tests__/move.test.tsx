/**
 * Move Tab Tests
 *
 * Tests the exercise/move screen: weekly summary, exercise type pills,
 * intensity selector, and PCOS recommendations card.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';

async function renderMove() {
  const MoveScreen = require('../app/(tabs)/move').default;
  render(<MoveScreen />);
  await waitFor(() => {
    expect(screen.getByText('Move')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Move Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders "Move" page title', async () => {
    await renderMove();
    expect(screen.getByText('Move')).toBeTruthy();
  });

  it('renders weekly summary section', async () => {
    await renderMove();
    expect(screen.getByText('This Week')).toBeTruthy();
    expect(screen.getByText('min')).toBeTruthy();
    expect(screen.getByText('sessions')).toBeTruthy();
    expect(screen.getByText('cal')).toBeTruthy();
  });

  it('renders weekly progress bar with goal', async () => {
    await renderMove();
    expect(screen.getByText(/150 min goal/)).toBeTruthy();
  });

  it('renders "Today" section', async () => {
    await renderMove();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders "+ Add Exercise" button', async () => {
    await renderMove();
    expect(screen.getByText('+ Add Exercise')).toBeTruthy();
  });

  it('shows exercise form when "+ Add Exercise" pressed', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    expect(screen.getByText('Exercise Type')).toBeTruthy();
    expect(screen.getByText('Intensity')).toBeTruthy();
    expect(screen.getByPlaceholderText('30')).toBeTruthy();
  });

  it('renders exercise type pills in form', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    // Some types appear both in form and recommendations — use getAllByText
    expect(screen.getAllByText(/Pilates/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Walking/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Yoga/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Strength Training/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders intensity selector (Low/Moderate/High)', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    // Low/Moderate/High may also appear in recommendations
    expect(screen.getAllByText(/Low/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Moderate/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/High/).length).toBeGreaterThanOrEqual(1);
  });

  it('can type duration', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    const durationInput = screen.getByPlaceholderText('30');
    fireEvent.change(durationInput, { target: { value: '45' } });
    expect(screen.getByDisplayValue('45')).toBeTruthy();
  });

  it('renders Save and Cancel buttons in form', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('closes form on Cancel', async () => {
    await renderMove();
    fireEvent.click(screen.getByText('+ Add Exercise'));
    expect(screen.getByText('Exercise Type')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Exercise Type')).toBeNull();
  });

  it('renders PCOS recommendations section', async () => {
    await renderMove();
    expect(screen.getByText('Recommended for You')).toBeTruthy();
  });

  it('renders specific PCOS recommendations', async () => {
    await renderMove();
    expect(screen.getByText('Resistance Training')).toBeTruthy();
    expect(screen.getByText('Sweaty Cardio')).toBeTruthy();
  });

  it('renders cycle-aware training section', async () => {
    await renderMove();
    expect(screen.getByText('Cycle-Aware Training')).toBeTruthy();
    expect(screen.getByText(/Follicular/)).toBeTruthy();
    expect(screen.getByText(/Luteal/)).toBeTruthy();
  });

  it('shows empty state when no exercises logged today', async () => {
    await renderMove();
    expect(screen.getByText(/No exercises logged today/)).toBeTruthy();
  });
});
