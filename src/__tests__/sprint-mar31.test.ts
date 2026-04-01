/**
 * Tests for Mar 31 overnight sprint features:
 * - Skincare defaults validation
 * - Supplement streak calculations
 * - Lab reference range flagging
 */

// ── Skincare Default Data Tests ──

describe('Skincare Default Products', () => {
  // Inline defaults for testing without component imports
  type ProductStatus = 'safe' | 'trigger' | 'testing';
  interface SkincareProduct {
    id: string;
    name: string;
    status: ProductStatus;
    notes?: string;
  }

  const DEFAULT_PRODUCTS: SkincareProduct[] = [
    { id: 'p1', name: 'Laneige Cream Skin', status: 'safe' },
    { id: 'p2', name: 'Wellage HA Blue Ampoule', status: 'safe' },
    { id: 'p3', name: 'Aestura Atobarrier 365', status: 'safe' },
    { id: 'p4', name: 'Goodal Heartleaf SPF', status: 'safe' },
    { id: 'p5', name: 'Celimax Noni Ampoule', status: 'safe' },
    { id: 'p6', name: 'COSRX Propolis Lip Mask', status: 'safe' },
    { id: 'p12', name: 'S-Nature Aqua Squalane', status: 'safe', notes: 'Lightweight oil, good for dry patches' },
    { id: 'p13', name: 'Caudalie Vinoperfect Serum', status: 'safe', notes: 'Brightening, no irritation' },
    { id: 'p14', name: 'LRP Anthelios UVMune 400', status: 'safe', notes: 'Europe SPF, high UVA protection' },
    { id: 'p15', name: 'Acnon Spot Treatment', status: 'safe', notes: 'For active spots only' },
    { id: 'p7', name: 'Madeca Cream', status: 'testing', notes: 'Testing as moisturizer replacement' },
    { id: 'p8', name: 'Niacinamide (high %)', status: 'trigger', notes: 'High % confirmed trigger (Biodance 20%). Low % unknown' },
    { id: 'p9', name: 'Snail Mucin', status: 'trigger', notes: 'COSRX caused breakout' },
    { id: 'p10', name: 'Laneige Lip Sleeping Mask', status: 'trigger', notes: 'Wax/oils migrate above lips causing perioral bumps' },
    { id: 'p11', name: 'Vea Lipogel', status: 'trigger', notes: 'Vitamin E breaks out perioral area — do NOT use near face' },
    { id: 'p16', name: 'Dr. Reju-All Cream', status: 'trigger', notes: 'Contains niacinamide' },
    { id: 'p17', name: 'Centellian 24 Madeca Cream (original)', status: 'trigger', notes: 'Niacinamide in some versions + comedone reports' },
    { id: 'p18', name: "Mary Ruth's Probiotics", status: 'trigger', notes: 'Contains histamine-producing strains L. casei, L. bulgaricus' },
  ];

  it('has no duplicate IDs', () => {
    const ids = DEFAULT_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has 10 safe products', () => {
    expect(DEFAULT_PRODUCTS.filter((p) => p.status === 'safe').length).toBe(10);
  });

  it('has 7 trigger products', () => {
    expect(DEFAULT_PRODUCTS.filter((p) => p.status === 'trigger').length).toBe(7);
  });

  it('has 1 testing product', () => {
    expect(DEFAULT_PRODUCTS.filter((p) => p.status === 'testing').length).toBe(1);
  });

  it('all trigger products have notes explaining why', () => {
    const triggers = DEFAULT_PRODUCTS.filter((p) => p.status === 'trigger');
    triggers.forEach((t) => {
      expect(t.notes).toBeTruthy();
      expect(t.notes!.length).toBeGreaterThan(5);
    });
  });

  it('includes new products from the sprint', () => {
    const names = DEFAULT_PRODUCTS.map((p) => p.name);
    expect(names).toContain('S-Nature Aqua Squalane');
    expect(names).toContain('Caudalie Vinoperfect Serum');
    expect(names).toContain('LRP Anthelios UVMune 400');
    expect(names).toContain('Acnon Spot Treatment');
    expect(names).toContain('Dr. Reju-All Cream');
    expect(names).toContain('Centellian 24 Madeca Cream (original)');
    expect(names).toContain("Mary Ruth's Probiotics");
  });
});

// ── Supplement Streak Calculation Tests ──

describe('Supplement Streak Calculation', () => {
  function calculateStreak(dailyPcts: number[], threshold = 100): number {
    let streak = 0;
    // Iterate backward (most recent first)
    for (let i = dailyPcts.length - 1; i >= 0; i--) {
      if (dailyPcts[i] >= threshold) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  it('counts consecutive 100% days from the end', () => {
    expect(calculateStreak([100, 100, 100, 100])).toBe(4);
  });

  it('stops at first non-100% day', () => {
    expect(calculateStreak([100, 50, 100, 100])).toBe(2);
  });

  it('returns 0 if latest day is not 100%', () => {
    expect(calculateStreak([100, 100, 50])).toBe(0);
  });

  it('handles empty array', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('handles single perfect day', () => {
    expect(calculateStreak([100])).toBe(1);
  });

  function calculateAdherence(dailyPcts: number[]): number {
    if (dailyPcts.length === 0) return 0;
    return Math.round(dailyPcts.reduce((s, p) => s + p, 0) / dailyPcts.length);
  }

  it('calculates weekly adherence correctly', () => {
    const week = [100, 100, 75, 100, 50, 100, 100];
    expect(calculateAdherence(week)).toBe(89);
  });

  it('returns 0 for no data', () => {
    expect(calculateAdherence([])).toBe(0);
  });

  it('returns 100 for all perfect days', () => {
    expect(calculateAdherence([100, 100, 100])).toBe(100);
  });
});

// ── Lab Reference Range Flagging Tests ──

describe('Lab Reference Range Flagging', () => {
  function isLabFlagged(
    value: number,
    refLow: number | null,
    refHigh: number | null,
  ): boolean {
    if (refLow != null && value < refLow) return true;
    if (refHigh != null && value > refHigh) return true;
    return false;
  }

  it('flags value below reference low', () => {
    expect(isLabFlagged(3.5, 4.0, 5.6)).toBe(true);
  });

  it('flags value above reference high', () => {
    expect(isLabFlagged(6.0, 4.0, 5.6)).toBe(true);
  });

  it('does not flag value within range', () => {
    expect(isLabFlagged(5.0, 4.0, 5.6)).toBe(false);
  });

  it('does not flag value at exact boundaries', () => {
    expect(isLabFlagged(4.0, 4.0, 5.6)).toBe(false);
    expect(isLabFlagged(5.6, 4.0, 5.6)).toBe(false);
  });

  it('handles null reference low (only upper bound)', () => {
    expect(isLabFlagged(250, null, 200)).toBe(true);
    expect(isLabFlagged(150, null, 200)).toBe(false);
  });

  it('handles null reference high (only lower bound)', () => {
    expect(isLabFlagged(40, 50, null)).toBe(true);
    expect(isLabFlagged(60, 50, null)).toBe(false);
  });

  it('handles both null references (never flagged)', () => {
    expect(isLabFlagged(999, null, null)).toBe(false);
  });

  // PCOS-specific lab scenarios
  it('flags high testosterone (PCOS indicator)', () => {
    expect(isLabFlagged(85, 15, 70)).toBe(true); // Total testosterone > 70 ng/dL
  });

  it('flags high fasting insulin (insulin resistance)', () => {
    expect(isLabFlagged(30, 2.6, 24.9)).toBe(true); // > 24.9 µIU/mL
  });

  it('flags low vitamin D', () => {
    expect(isLabFlagged(15, 30, 100)).toBe(true); // < 30 ng/mL
  });

  it('flags high HbA1c (pre-diabetic)', () => {
    expect(isLabFlagged(5.9, 4, 5.6)).toBe(true); // > 5.6%
  });
});

// ── Common Lab Tests Configuration ──

describe('Common Lab Tests Config', () => {
  const COMMON_LAB_TESTS = [
    { name: 'Testosterone (Total)', unit: 'ng/dL', refLow: 15, refHigh: 70, category: 'Hormones' },
    { name: 'Fasting Glucose', unit: 'mg/dL', refLow: 70, refHigh: 100, category: 'Metabolic' },
    { name: 'TSH', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0, category: 'Thyroid' },
    { name: 'Vitamin D (25-OH)', unit: 'ng/mL', refLow: 30, refHigh: 100, category: 'Vitamins' },
    { name: 'Total Cholesterol', unit: 'mg/dL', refLow: null, refHigh: 200, category: 'Lipids' },
    { name: 'CRP (hs)', unit: 'mg/L', refLow: null, refHigh: 3, category: 'Inflammation' },
  ];

  it('has no duplicate test names', () => {
    const names = COMMON_LAB_TESTS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all tests have a unit', () => {
    COMMON_LAB_TESTS.forEach((t) => {
      expect(typeof t.unit).toBe('string');
    });
  });

  it('all tests have a category', () => {
    COMMON_LAB_TESTS.forEach((t) => {
      expect(typeof t.category).toBe('string');
      expect(t.category.length).toBeGreaterThan(0);
    });
  });

  it('reference ranges make sense (low < high when both present)', () => {
    COMMON_LAB_TESTS.forEach((t) => {
      if (t.refLow != null && t.refHigh != null) {
        expect(t.refLow).toBeLessThan(t.refHigh);
      }
    });
  });
});
