/**
 * Settings Screen Tests
 *
 * Tests the settings/profile screen: renders profile info,
 * targets, and sign out functionality.
 */
import React from 'react';
import { render, fireEvent, waitFor, act, screen } from './test-utils';

async function renderSettings() {
  const SettingsScreen = require('../app/settings').default;
  render(<SettingsScreen />);
  await waitFor(() => {
    expect(screen.getByText('SETTINGS')).toBeTruthy();
  }, { timeout: 3000 });
}

describe('Settings Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders "SETTINGS" header after loading', async () => {
    await renderSettings();
    expect(screen.getByText('SETTINGS')).toBeTruthy();
  });

  it('renders back button', async () => {
    await renderSettings();
    expect(screen.getByText('← Back')).toBeTruthy();
  });

  it('navigates back on back button press', async () => {
    const { router } = require('expo-router');
    await renderSettings();
    fireEvent.click(screen.getByText('← Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('renders profile section with user name', async () => {
    await renderSettings();
    expect(screen.getByText('👤 Profile')).toBeTruthy();
    expect(screen.getByText('Tina')).toBeTruthy();
  });

  it('displays user email', async () => {
    await renderSettings();
    const emailTexts = screen.getAllByText('tina@test.com');
    expect(emailTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('displays PCOS type', async () => {
    await renderSettings();
    expect(screen.getByText('Insulin Resistant')).toBeTruthy();
  });

  it('displays height and weight', async () => {
    await renderSettings();
    expect(screen.getByText('163 cm')).toBeTruthy();
    expect(screen.getByText('135 lbs')).toBeTruthy();
  });

  it('renders targets section', async () => {
    await renderSettings();
    expect(screen.getByText('🎯 Targets')).toBeTruthy();
    expect(screen.getByText('1500 cal')).toBeTruthy();
    expect(screen.getByText('80g')).toBeTruthy();
    expect(screen.getByText('125 lbs')).toBeTruthy();
  });

  it('renders supplements section', async () => {
    await renderSettings();
    expect(screen.getByText('💊 Supplements')).toBeTruthy();
    expect(screen.getByText('Manage your daily supplement checklist')).toBeTruthy();
  });

  it('renders account section with sign out', async () => {
    await renderSettings();
    expect(screen.getByText('🔒 Account')).toBeTruthy();
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('renders edit buttons', async () => {
    await renderSettings();
    expect(screen.getByText('Edit Profile')).toBeTruthy();
    expect(screen.getByText('Edit Targets')).toBeTruthy();
  });

  it('navigates to profile edit on "Edit Profile" press', async () => {
    const { router } = require('expo-router');
    await renderSettings();
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/profile');
  });

  it('navigates to goals edit on "Edit Targets" press', async () => {
    const { router } = require('expo-router');
    await renderSettings();
    fireEvent.click(screen.getByText('Edit Targets'));
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/goals');
  });

  it('renders app version and tagline', async () => {
    await renderSettings();
    expect(screen.getByText('Healthy Me v1.0.0')).toBeTruthy();
    expect(screen.getByText(/Made with 💜/)).toBeTruthy();
  });

  it('calls signOut and navigates on "Sign Out" press', async () => {
    const { router } = require('expo-router');
    await renderSettings();
    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out'));
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    }, { timeout: 10000 });
  }, 15000);
});
