/**
 * Snapshot Tests — Baseline Protection
 *
 * These snapshots capture the rendered output of every major screen and
 * key sub-components. If a real component is replaced with a stub,
 * the snapshot diff will catch it immediately.
 *
 * Run: npx jest src/__tests__/snapshots.test.tsx --forceExit
 * Update snapshots: npx jest src/__tests__/snapshots.test.tsx --forceExit -u
 */
import React from 'react';
import { render, waitFor } from './test-utils';

const RealDate = Date;
const SNAPSHOT_DATE = new RealDate('2026-05-21T12:00:00-07:00');

beforeAll(() => {
  class FixedDate extends RealDate {
    constructor(
      ...args:
        | [value?: string | number | Date]
        | [year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number]
    ) {
      if (args.length === 0) {
        super(SNAPSHOT_DATE);
      } else if (args.length === 1) {
        super(args[0] ?? SNAPSHOT_DATE);
      } else {
        const [year, monthIndex, date = 1, hours = 0, minutes = 0, seconds = 0, ms = 0] = args as [number, number, number?, number?, number?, number?, number?];
        super(year, monthIndex, date, hours, minutes, seconds, ms);
      }
    }

    static now() {
      return SNAPSHOT_DATE.getTime();
    }
  }

  global.Date = FixedDate as DateConstructor;
});

afterAll(() => {
  global.Date = RealDate;
});

// ── Tab Screens ──

describe('Snapshot: Home Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', async () => {
    const HomeScreen = require('../app/(tabs)/index').default;
    const { container } = render(<HomeScreen />);
    await waitFor(() => {
      expect(container.textContent).toContain('HEALTHY ME');
    }, { timeout: 3000 });
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: Food Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', async () => {
    const FoodScreen = require('../app/(tabs)/food').default;
    const { container } = render(<FoodScreen />);
    await waitFor(() => {
      expect(container.textContent).toContain('Calories');
    }, { timeout: 3000 });
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: Skin Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', async () => {
    const SkinScreen = require('../app/(tabs)/skin').default;
    const { container } = render(<SkinScreen />);
    await waitFor(() => {
      expect(container.textContent).toContain('Routine');
    }, { timeout: 3000 });
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: Health Screen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', async () => {
    const HealthScreen = require('../app/(tabs)/health').default;
    const { container } = render(<HealthScreen />);
    await waitFor(() => {
      expect(container.textContent).toContain('HEALTH');
    }, { timeout: 3000 });
    expect(container).toMatchSnapshot();
  });
});

// ── Key Sub-Components ──

describe('Snapshot: PantrySection', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', () => {
    const { PantrySection } = require('../components/food/pantry-section');
    const { container } = render(
      <PantrySection items={[]} onLogItem={() => {}} onRemoveItem={() => {}} onAddItem={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: CalorieBalanceCard', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', () => {
    const { CalorieBalanceCard } = require('../components/home/calorie-balance-card');
    const { container } = render(
      <CalorieBalanceCard calories={850} calorieTarget={1800} protein={45} proteinTarget={100} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: SkinProfileCard', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', () => {
    const { SkinProfileCard } = require('../components/skin/skin-profile-card');
    const { container } = render(
      <SkinProfileCard profile={{
        skin_type: 'oily',
        skin_concerns: ['acne', 'hyperpigmentation'],
        known_sensitivities: [],
        known_triggers: [],
        fitzpatrick: 'III',
        pcos_flag: true,
        cycle_tracking_enabled: true,
        safe_products: [],
      }} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Snapshot: SuggestionCard', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('matches snapshot', () => {
    const { SuggestionCard } = require('../components/skin/suggestion-card');
    const { container } = render(<SuggestionCard />);
    expect(container).toMatchSnapshot();
  });
});
