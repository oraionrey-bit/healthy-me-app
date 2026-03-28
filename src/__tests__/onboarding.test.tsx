/**
 * Onboarding Flow Tests
 *
 * Tests the real component rendering and user interactions
 * through the onboarding screens: Welcome → Profile → Goals → Supplements → Complete
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from './test-utils';
import { router } from 'expo-router';

// ── Welcome Screen ──────────────────────────────────────────────────────

describe('Welcome Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function renderWelcome() {
    const WelcomeScreen = require('../app/(onboarding)/welcome').default;
    render(<WelcomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('WELCOME!')).toBeTruthy();
    }, { timeout: 3000 });
  }

  it('renders welcome title and subtitle', async () => {
    await renderWelcome();
    expect(screen.getByText('WELCOME!')).toBeTruthy();
    expect(screen.getByText(/set up your Healthy Me profile/)).toBeTruthy();
  });

  it('renders "Get Started" button', async () => {
    await renderWelcome();
    expect(screen.getByText('Get Started →')).toBeTruthy();
  });

  it('renders hint text about 60 seconds', async () => {
    await renderWelcome();
    expect(screen.getByText(/Takes about 60 seconds/)).toBeTruthy();
  });

  it('navigates to profile on "Get Started" press', async () => {
    await renderWelcome();
    fireEvent.click(screen.getByText('Get Started →'));
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/profile');
  });
});

// ── Profile Screen ──────────────────────────────────────────────────────

describe('Profile Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function renderProfile() {
    const ProfileScreen = require('../app/(onboarding)/profile').default;
    render(<ProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('ABOUT YOU')).toBeTruthy();
    }, { timeout: 3000 });
  }

  it('renders "ABOUT YOU" title', async () => {
    await renderProfile();
    expect(screen.getByText('ABOUT YOU')).toBeTruthy();
  });

  it('renders name input with email prefix as default', async () => {
    await renderProfile();
    expect(screen.getByDisplayValue('tina')).toBeTruthy();
  });

  it('renders PCOS type options', async () => {
    await renderProfile();
    expect(screen.getByText(/Insulin Resistant/)).toBeTruthy();
    expect(screen.getByText(/Post-Pill/)).toBeTruthy();
    expect(screen.getByText(/Inflammatory/)).toBeTruthy();
    expect(screen.getByText(/Adrenal/)).toBeTruthy();
    expect(screen.getByText(/Not Sure Yet/)).toBeTruthy();
  });

  it('allows typing a name', async () => {
    await renderProfile();
    const nameInput = screen.getByDisplayValue('tina');
    fireEvent.change(nameInput, { target: { value: 'Tina K' } });
    expect(screen.getByDisplayValue('Tina K')).toBeTruthy();
  });

  it('renders age and height fields', async () => {
    await renderProfile();
    expect(screen.getByText('Age')).toBeTruthy();
    expect(screen.getByText('Height')).toBeTruthy();
    expect(screen.getByPlaceholderText('Age')).toBeTruthy();
  });

  it('renders Next button', async () => {
    await renderProfile();
    expect(screen.getByText('Next →')).toBeTruthy();
  });
});

// ── Goals Screen ────────────────────────────────────────────────────────

describe('Goals Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function renderGoals() {
    const GoalsScreen = require('../app/(onboarding)/goals').default;
    render(<GoalsScreen />);
    await waitFor(() => {
      expect(screen.getByText('YOUR GOALS')).toBeTruthy();
    }, { timeout: 3000 });
  }

  it('renders "YOUR GOALS" title', async () => {
    await renderGoals();
    expect(screen.getByText('YOUR GOALS')).toBeTruthy();
  });

  it('renders calorie and protein values', async () => {
    await renderGoals();
    // Multiple elements may show 1500 (value + tip). Just verify at least one exists.
    expect(screen.getAllByText(/1500/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/80/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders stepper controls (+ and − buttons)', async () => {
    await renderGoals();
    const plusBtns = screen.getAllByText('+');
    const minusBtns = screen.getAllByText('−');
    expect(plusBtns.length).toBeGreaterThanOrEqual(2);
    expect(minusBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('increments calorie target on + press', async () => {
    await renderGoals();
    const plusBtns = screen.getAllByText('+');
    fireEvent.click(plusBtns[0]);
    expect(screen.getByText(/1550/)).toBeTruthy();
  });

  it('decrements protein target on − press', async () => {
    await renderGoals();
    const minusBtns = screen.getAllByText('−');
    fireEvent.click(minusBtns[1]);
    expect(screen.getByText(/75/)).toBeTruthy();
  });

  it('renders optional goal weight field', async () => {
    await renderGoals();
    expect(screen.getByText(/Goal Weight/)).toBeTruthy();
  });

  it('renders lbs/kg toggle', async () => {
    await renderGoals();
    expect(screen.getByText('lbs')).toBeTruthy();
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('renders PCOS tip', async () => {
    await renderGoals();
    expect(screen.getByText(/Common PCOS targets/)).toBeTruthy();
  });
});

// ── Supplements Screen ──────────────────────────────────────────────────

describe('Supplements Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function renderSupplements() {
    const SupplementsScreen = require('../app/(onboarding)/supplements').default;
    render(<SupplementsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/SUPPLEMENTS/)).toBeTruthy();
    }, { timeout: 3000 });
  }

  it('renders "SUPPLEMENTS" title', async () => {
    await renderSupplements();
    expect(screen.getByText(/SUPPLEMENTS/)).toBeTruthy();
  });

  it('renders all default supplements', async () => {
    await renderSupplements();
    expect(screen.getByText('Ovasitol (AM)')).toBeTruthy();
    expect(screen.getByText('Knowell')).toBeTruthy();
    expect(screen.getByText('NAC')).toBeTruthy();
    expect(screen.getByText('Omega-3')).toBeTruthy();
    expect(screen.getByText('Ovasitol (PM)')).toBeTruthy();
    expect(screen.getByText('BionerLab Gummies')).toBeTruthy();
  });

  it('shows dosage and time of day', async () => {
    await renderSupplements();
    expect(screen.getByText(/1 scoop · ☀️ AM/)).toBeTruthy();
    expect(screen.getByText(/4 caps · ☀️ AM/)).toBeTruthy();
    expect(screen.getByText(/2 gummies · 🌙 PM/)).toBeTruthy();
  });

  it('supplements are pre-selected by default', async () => {
    await renderSupplements();
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBe(6);
  });

  it('can uncheck a supplement by tapping', async () => {
    await renderSupplements();
    fireEvent.click(screen.getByText('NAC'));
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBe(5);
  });

  it('renders Next button', async () => {
    await renderSupplements();
    expect(screen.getByText('Next →')).toBeTruthy();
  });
});

// ── Complete Screen ─────────────────────────────────────────────────────

describe('Complete Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function renderComplete() {
    const CompleteScreen = require('../app/(onboarding)/complete').default;
    render(<CompleteScreen />);
    await waitFor(() => {
      expect(screen.getByText(/YOU'RE ALL SET/)).toBeTruthy();
    }, { timeout: 3000 });
  }

  it('renders celebration title', async () => {
    await renderComplete();
    expect(screen.getByText(/YOU'RE ALL SET/)).toBeTruthy();
  });

  it('renders user greeting with display name', async () => {
    await renderComplete();
    expect(screen.getByText(/Great job, Tina/)).toBeTruthy();
  });

  it('renders daily targets summary', async () => {
    await renderComplete();
    expect(screen.getByText(/1500 cal/)).toBeTruthy();
    expect(screen.getByText(/80g protein/)).toBeTruthy();
  });

  it('renders motivation text', async () => {
    await renderComplete();
    expect(screen.getByText(/Small steps, big results/)).toBeTruthy();
  });

  it('renders "Enter Healthy Me" button', async () => {
    await renderComplete();
    expect(screen.getByText(/Enter Healthy Me/)).toBeTruthy();
  });
});
