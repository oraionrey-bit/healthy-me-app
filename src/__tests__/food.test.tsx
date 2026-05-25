/**
 * Food Tab Tests
 *
 * Tests the food logging screen: date navigation, meal type pills,
 * food description input, calendar toggle.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';

async function renderFood() {
  const FoodScreen = require('../app/(tabs)/food').default;
  render(<FoodScreen />);
  await waitFor(() => {
    expect(screen.getByText('◀')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Food Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders date navigation arrows', async () => {
    await renderFood();
    expect(screen.getByText('◀')).toBeTruthy();
    expect(screen.getByText('▶')).toBeTruthy();
  });

  it('renders today\'s date', async () => {
    await renderFood();
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    expect(screen.getByText(new RegExp(dayName))).toBeTruthy();
  });

  it('renders calendar toggle (📅)', async () => {
    await renderFood();
    expect(screen.getByText('📅')).toBeTruthy();
  });

  it('renders calorie and protein summary', async () => {
    await renderFood();
    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText(/1500/)).toBeTruthy();
    expect(screen.getByText(/80g/)).toBeTruthy();
  });

  it('renders "+ Add Meal" button', async () => {
    await renderFood();
    expect(screen.getByText('+ Add Meal')).toBeTruthy();
  });

  it('shows meal form when "+ Add Meal" is pressed', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    expect(screen.getByText('Meal Type')).toBeTruthy();
    expect(screen.getByText('Time eaten')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByPlaceholderText('What did you eat?')).toBeTruthy();
  });

  it('does not render quick add or food suggestion sections', async () => {
    await renderFood();
    expect(screen.queryByText(/Quick Add/)).toBeNull();
    expect(screen.queryByText(/Suggestions/)).toBeNull();
    expect(screen.queryByText(/My Pantry/)).toBeNull();
    expect(screen.queryByText(/Favorites/)).toBeNull();
    expect(screen.queryByText(/Your foods auto-save/)).toBeNull();
  });

  it('can type a simple meal time', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    const timeInput = screen.getByPlaceholderText('Optional, like 8:30 AM') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '12:30 PM' } });
    expect(timeInput.value).toBe('12:30 PM');
  });

  it('can mark meal time as not remembered', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    const timeInput = screen.getByPlaceholderText('Optional, like 8:30 AM') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '12:30 PM' } });
    fireEvent.click(screen.getByText('N/A'));
    expect(timeInput.value).toBe('');
  });

  it('renders meal type pills in form (breakfast/lunch/dinner/snack)', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    expect(screen.getByText(/Breakfast/)).toBeTruthy();
    expect(screen.getByText(/Lunch/)).toBeTruthy();
    expect(screen.getByText(/Dinner/)).toBeTruthy();
    expect(screen.getByText(/Snack/)).toBeTruthy();
  });

  it('can type a food description', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    const input = screen.getByPlaceholderText('What did you eat?');
    fireEvent.change(input, { target: { value: 'Chicken salad with quinoa' } });
    expect(screen.getByDisplayValue('Chicken salad with quinoa')).toBeTruthy();
  });

  it('renders Save and Cancel buttons in form', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('closes form on Cancel', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    expect(screen.getByText('Meal Type')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Meal Type')).toBeNull();
    expect(screen.getByText('+ Add Meal')).toBeTruthy();
  });

  it('navigates to previous day on ◀ press', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('◀'));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayName = yesterday.toLocaleDateString('en-US', { weekday: 'long' });
    expect(screen.getByText(new RegExp(dayName))).toBeTruthy();
  });

  it('shows empty state when no meals logged', async () => {
    await renderFood();
    expect(screen.getByText(/No meals logged yet/)).toBeTruthy();
  });

  it('renders photo upload area in form', async () => {
    await renderFood();
    fireEvent.click(screen.getByText('+ Add Meal'));
    expect(screen.getByText('📷 Add Photos')).toBeTruthy();
  });
});
