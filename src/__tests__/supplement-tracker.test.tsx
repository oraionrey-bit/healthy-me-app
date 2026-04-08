/**
 * Supplement Tracker Tests
 *
 * Tests the SupplementTracker component and parseFeelingFromNotes utility.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { parseFeelingFromNotes } from '../hooks/use-supplements';
import { SupplementTracker } from '../components/health/supplement-tracker';

// ── parseFeelingFromNotes ──

describe('parseFeelingFromNotes', () => {
  it('returns null for null input', () => {
    expect(parseFeelingFromNotes(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseFeelingFromNotes('')).toBeNull();
  });

  it('returns null for plain text (not JSON)', () => {
    expect(parseFeelingFromNotes('just a note')).toBeNull();
  });

  it('returns null for JSON without feeling field', () => {
    expect(parseFeelingFromNotes('{"note":"test"}')).toBeNull();
  });

  it('parses good feeling', () => {
    const result = parseFeelingFromNotes('{"feeling":"good","note":"energy boost"}');
    expect(result).toEqual({ feeling: 'good', note: 'energy boost' });
  });

  it('parses feeling without note', () => {
    const result = parseFeelingFromNotes('{"feeling":"bad"}');
    expect(result).toEqual({ feeling: 'bad' });
  });

  it('parses neutral feeling', () => {
    const result = parseFeelingFromNotes('{"feeling":"neutral"}');
    expect(result).toEqual({ feeling: 'neutral' });
  });
});

// ── SupplementTracker Component ──

describe('SupplementTracker', () => {
  it('renders title', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText(/My Supplements/)).toBeTruthy();
    });
  });

  it('shows supplement count badge', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  it('renders morning and evening group labels', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText(/Morning/)).toBeTruthy();
      expect(screen.getByText(/Evening/)).toBeTruthy();
    });
  });

  it('renders supplement names', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('Ovasitol (AM)')).toBeTruthy();
      expect(screen.getByText('NAC')).toBeTruthy();
      expect(screen.getByText('Ovasitol (PM)')).toBeTruthy();
    });
  });

  it('renders dosage info', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      const metaTexts = screen.getAllByText(/500mg/);
      expect(metaTexts.length).toBeGreaterThan(0);
    });
  });

  it('shows add supplement button', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Supplement')).toBeTruthy();
    });
  });

  it('shows add form when button is clicked', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Supplement')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('+ Add Supplement'));
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Dosage')).toBeTruthy();
      expect(screen.getByText('Notes')).toBeTruthy();
    });
  });

  it('expands supplement to show feeling tracker', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('Ovasitol (AM)')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Ovasitol (AM)'));
    await waitFor(() => {
      expect(screen.getByText(/How does this make you feel/)).toBeTruthy();
    });
  });

  it('shows feeling buttons when expanded', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('NAC')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('NAC'));
    await waitFor(() => {
      expect(screen.getByText('Good')).toBeTruthy();
      expect(screen.getByText('Neutral')).toBeTruthy();
      expect(screen.getByText('Bad')).toBeTruthy();
    });
  });

  it('shows edit and remove buttons when expanded', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('Ovasitol (AM)')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Ovasitol (AM)'));
    await waitFor(() => {
      expect(screen.getByText(/Edit/)).toBeTruthy();
      expect(screen.getByText(/Remove/)).toBeTruthy();
    });
  });

  it('shows move up/down buttons when expanded', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('NAC')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('NAC'));
    await waitFor(() => {
      const upArrows = screen.getAllByText('\u25B2');
      expect(upArrows.length).toBeGreaterThan(0);
    });
  });

  it('shows edit form when edit button is clicked', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('Ovasitol (AM)')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Ovasitol (AM)'));
    await waitFor(() => {
      expect(screen.getByText(/Edit/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/Edit/));
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  it('hides add form when cancel is clicked', async () => {
    render(<SupplementTracker />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Supplement')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('+ Add Supplement'));
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('+ Add Supplement')).toBeTruthy();
    });
  });
});
