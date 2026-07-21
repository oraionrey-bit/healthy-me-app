/**
 * Supplement Tracker Tests
 *
 * Tests the SupplementTracker component and parseFeelingFromNotes utility.
 */
import React from 'react';
import { act, render, renderHook, screen, fireEvent, waitFor, within, mockDatabaseWrites, mockSetMutableWrites, mockSetTableData } from './test-utils';
import { parseFeelingFromNotes, useSupplements } from '../hooks/use-supplements';
import { SupplementTracker } from '../components/health/supplement-tracker';
import { SupplementManager } from '../components/settings/supplement-manager';
import { SupplementGroup } from '../app/(tabs)/index';
import type { UserSupplement } from '../types/database';

const creatineEntries: UserSupplement[] = [
  { id: 'creatine-am', user_id: 'test-user-id', supplement_name: 'Creatine', dosage: '5g', frequency: 'daily', time_of_day: 'morning', notes: null, is_active: true, sort_order: 0, created_at: '2026-01-01', phase_schedule: null },
  { id: 'creatine-pm', user_id: 'test-user-id', supplement_name: 'Creatine', dosage: '5g', frequency: 'daily', time_of_day: 'evening', notes: null, is_active: true, sort_order: 1, created_at: '2026-01-01', phase_schedule: null },
];

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

// ── Distinct scheduled entries ──

describe('useSupplements scheduled entry identity', () => {
  afterEach(() => {
    mockSetMutableWrites(false);
    mockSetTableData('user_supplements', [
      { id: 'sup-1', user_id: 'test-user-id', supplement_name: 'Ovasitol (AM)', dosage: '1 scoop', frequency: 'daily', time_of_day: 'morning', notes: null, is_active: true, sort_order: 0, created_at: '2026-01-01' },
      { id: 'sup-2', user_id: 'test-user-id', supplement_name: 'NAC', dosage: '500mg', frequency: 'daily', time_of_day: 'morning', notes: null, is_active: true, sort_order: 2, created_at: '2026-01-01' },
      { id: 'sup-3', user_id: 'test-user-id', supplement_name: 'Ovasitol (PM)', dosage: '1 scoop', frequency: 'daily', time_of_day: 'evening', notes: null, is_active: true, sort_order: 4, created_at: '2026-01-01' },
    ]);
    mockSetTableData('supplement_logs', []);
    mockDatabaseWrites.length = 0;
  });

  it('persists and refetches morning and evening creatine as separate entries', async () => {
    mockSetMutableWrites(true);
    mockSetTableData('user_supplements', [creatineEntries[0]]);
    mockDatabaseWrites.length = 0;
    const { result } = renderHook(() => useSupplements());
    await waitFor(() => expect(result.current.supplements).toHaveLength(1));

    await act(async () => {
      await result.current.addSupplement('Creatine', '5g', 'evening');
    });

    expect(mockDatabaseWrites).toContainEqual({
      table: 'user_supplements',
      operation: 'insert',
      values: expect.objectContaining({ supplement_name: 'Creatine', time_of_day: 'evening' }),
    });
    expect(result.current.supplements.map((supplement) => supplement.time_of_day)).toEqual([
      'morning', 'evening',
    ]);
    expect(new Set(result.current.supplements.map((supplement) => supplement.id)).size).toBe(2);
  });

  it('turns a two-time add into two distinct rows and never a combined row', async () => {
    mockSetMutableWrites(true);
    // Keep one unrelated row so the hook does not enter its empty-account
    // default-seeding path while this test exercises scheduled-dose creation.
    mockSetTableData('user_supplements', [{
      id: 'existing-magnesium', user_id: 'test-user-id', supplement_name: 'Magnesium',
      dosage: '200mg', frequency: 'daily', time_of_day: 'evening', notes: null,
      is_active: true, sort_order: 0, created_at: '2026-01-01', phase_schedule: null,
    }]);
    const { result } = renderHook(() => useSupplements());
    await waitFor(() => expect(result.current.supplements).toHaveLength(1));

    await act(async () => {
      await result.current.addSupplement(' Creatine ', '5g', ' Morning, EVENING ');
    });

    const creatine = result.current.supplements.filter(
      (supplement) => supplement.supplement_name === 'Creatine',
    );
    expect(creatine.map((supplement) => supplement.time_of_day)).toEqual([
      'morning', 'evening',
    ]);
    expect(new Set(creatine.map((supplement) => supplement.id)).size).toBe(2);
    expect(mockDatabaseWrites.filter(
      (write) => write.table === 'user_supplements' && write.operation === 'insert',
    )).toEqual([
      expect.objectContaining({ values: expect.objectContaining({ time_of_day: 'morning' }) }),
      expect.objectContaining({ values: expect.objectContaining({ time_of_day: 'evening' }) }),
    ]);
  });

  it('selects and persists each creatine schedule by its own entry id', async () => {
    mockSetMutableWrites(true);
    mockSetTableData('user_supplements', creatineEntries);
    mockSetTableData('supplement_logs', [{
      id: 'log-am', user_id: 'test-user-id', user_supplement_id: 'creatine-am',
      log_date: '2026-07-21', taken: true, taken_at: '2026-07-21T08:00:00Z', notes: null,
    }]);
    mockDatabaseWrites.length = 0;
    const date = new Date(2026, 6, 21, 12);
    const { result, unmount } = renderHook(() => useSupplements(date));
    await waitFor(() => expect(result.current.todaysLogs).toHaveLength(1));

    expect(result.current.isSupplementTaken('creatine-am')).toBe(true);
    expect(result.current.isSupplementTaken('creatine-pm')).toBe(false);
    await act(async () => { await result.current.toggleSupplement('creatine-pm'); });

    await waitFor(() => {
      expect(result.current.isSupplementTaken('creatine-am')).toBe(true);
      expect(result.current.isSupplementTaken('creatine-pm')).toBe(true);
    });

    unmount();
    const remounted = renderHook(() => useSupplements(date));
    await waitFor(() => {
      expect(remounted.result.current.isSupplementTaken('creatine-am')).toBe(true);
      expect(remounted.result.current.isSupplementTaken('creatine-pm')).toBe(true);
    });
  });

  it('splits a stale comma-combined edit instead of persisting it', async () => {
    mockSetTableData('user_supplements', [creatineEntries[0]]);
    mockDatabaseWrites.length = 0;
    const { result } = renderHook(() => useSupplements());
    await waitFor(() => expect(result.current.supplements).toHaveLength(1));

    await act(async () => {
      await result.current.updateSupplement('creatine-am', { time_of_day: ' Morning, EVENING ' });
    });

    expect(mockDatabaseWrites).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'update', values: expect.objectContaining({ time_of_day: 'morning' }) }),
      expect.objectContaining({ operation: 'insert', values: expect.objectContaining({ time_of_day: 'evening' }) }),
    ]));
    for (const write of mockDatabaseWrites) {
      expect(JSON.stringify(write.values)).not.toMatch(/morning\s*,\s*evening/i);
    }
  });
});

function CreatineChecklist() {
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  const isChecked = (id: string) => checkedIds.has(id);
  const toggle = (id: string) => setCheckedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <>
      <SupplementGroup title="Morning schedule" items={[creatineEntries[0]]}
        isChecked={isChecked} onToggle={toggle} />
      <SupplementGroup title="Evening schedule" items={[creatineEntries[1]]}
        isChecked={isChecked} onToggle={toggle} />
    </>
  );
}

describe('visible scheduled supplement checkboxes', () => {
  it('checks only the clicked schedule because each visible row passes its own id', async () => {
    render(<CreatineChecklist />);

    await screen.findByText('Morning schedule');
    const eveningGroup = screen.getByText('Evening schedule').parentElement!;
    const eveningButton = within(eveningGroup).getByText(/Creatine/).closest('[tabindex]')!;
    fireEvent.click(eveningButton);
    await waitFor(() => {
      const currentMorning = screen.getByText('Morning schedule').parentElement!;
      const currentEvening = screen.getByText('Evening schedule').parentElement!;
      expect(within(currentMorning).queryByText('✓')).toBeNull();
      expect(within(currentEvening).getByText('✓')).toBeTruthy();
    });
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

  it('submits a single canonical schedule from the tracker edit form', async () => {
    mockDatabaseWrites.length = 0;
    render(<SupplementTracker />);
    await screen.findByText('Ovasitol (AM)');
    fireEvent.click(screen.getByText('Ovasitol (AM)'));
    fireEvent.click(await screen.findByText(/Edit/));
    fireEvent.click((await screen.findAllByText('🌙 Evening'))[0]);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      operation: 'update',
      values: expect.objectContaining({ time_of_day: 'evening' }),
    })));
    for (const write of mockDatabaseWrites) {
      expect(JSON.stringify(write.values)).not.toMatch(/morning\s*,\s*evening/i);
    }
  });
});

describe('settings SupplementManager edit form', () => {
  it('cannot recombine a row while editing', async () => {
    const onUpdate = jest.fn(() => Promise.resolve());
    render(<SupplementManager supplements={[creatineEntries[0]]} loading={false}
      onAdd={jest.fn(() => Promise.resolve())} onUpdate={onUpdate}
      onDelete={jest.fn(() => Promise.resolve())} />);

    fireEvent.click(screen.getByText('✏️'));
    fireEvent.click((await screen.findAllByText('🌙 Evening'))[0]);
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('creatine-am', expect.objectContaining({
      time_of_day: 'evening',
    })));
    expect(JSON.stringify(onUpdate.mock.calls)).not.toMatch(/morning\s*,\s*evening/i);
  });
});
