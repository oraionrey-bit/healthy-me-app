/**
 * Home Tab Tests
 *
 * Tests the main dashboard/home screen rendering and interactions.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';

// Helper to render Home and wait for it to be ready
async function renderHome() {
  const HomeScreen = require('../app/(tabs)/index').default;
  render(<HomeScreen />);
  // Wait for the main title to appear (means loading is done)
  await waitFor(() => {
    expect(screen.getByText('HEALTHY ME')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Home Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders the app title "HEALTHY ME"', async () => {
    await renderHome();
    expect(screen.getByText('HEALTHY ME')).toBeTruthy();
  });

  it('renders the current date', async () => {
    await renderHome();
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    expect(screen.getByText(new RegExp(dayName))).toBeTruthy();
  });

  it('renders the settings gear icon', async () => {
    await renderHome();
    expect(screen.getByText('⚙️')).toBeTruthy();
  });

  it('navigates to settings on gear press', async () => {
    const { router } = require('expo-router');
    await renderHome();
    fireEvent.click(screen.getByText('⚙️'));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('renders supplement checklist section', async () => {
    await renderHome();
    expect(screen.getByText(/Supplements/)).toBeTruthy();
  });

  it('renders morning and evening supplement groups', async () => {
    await renderHome();
    expect(screen.getByText('☀️ Morning')).toBeTruthy();
    expect(screen.getByText('🌙 Evening')).toBeTruthy();
  });

  it('renders food summary section', async () => {
    await renderHome();
    expect(screen.getByText(/Today's Food/)).toBeTruthy();
  });

  it('shows empty food state when no meals logged', async () => {
    await renderHome();
    expect(screen.getByText(/No meals logged yet/)).toBeTruthy();
  });

  it('renders daily check-in section', async () => {
    await renderHome();
    expect(screen.getByText('📝 Daily Check-in')).toBeTruthy();
  });

  it('keeps Zepbound shot and symptom logging on Home', async () => {
    await renderHome();
    expect(screen.getByRole('button', { name: '+ Log shot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Daily check-in' })).toBeTruthy();
  });

  it('daily check-in is collapsed by default', async () => {
    await renderHome();
    expect(screen.queryByText('Mood')).toBeNull();
  });

  it('expands check-in on header press', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('Mood')).toBeTruthy();
    expect(screen.getByText('Energy')).toBeTruthy();
    expect(screen.getByText('Period')).toBeTruthy();
    expect(screen.getByText('Symptoms')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('renders mood emoji picker in expanded check-in', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('😢')).toBeTruthy();
    expect(screen.getByText('😊')).toBeTruthy();
  });

  it('renders symptom chips in expanded check-in', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('Stomach')).toBeTruthy();
    expect(screen.getByText('Diarrhea')).toBeTruthy();
    expect(screen.getByText('Bloating')).toBeTruthy();
    expect(screen.getByText('Zyrtec')).toBeTruthy();
    expect(screen.getByText('Irritated')).toBeTruthy();
  });

  it('renders period options in expanded check-in', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.getByText('On')).toBeTruthy();
    expect(screen.getByText('Spotting')).toBeTruthy();
  });

  it('renders "Save Check-in" button in expanded view', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('Save Check-in')).toBeTruthy();
  });

  it('collapses check-in when header pressed again', async () => {
    await renderHome();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.getByText('Mood')).toBeTruthy();
    fireEvent.click(screen.getByText('📝 Daily Check-in'));
    expect(screen.queryByText('Mood')).toBeNull();
  });
});
