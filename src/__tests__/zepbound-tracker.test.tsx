import React from 'react';
import {
  act,
  fireEvent,
  mockDatabaseWrites,
  mockResetZepboundData,
  mockSetTableData,
  render,
  screen,
  waitFor,
} from './test-utils';
import { ZepboundTrackerCard } from '../components/health/zepbound-tracker-card';
import { DailyZepboundLogCard } from '../components/home/daily-zepbound-status-card';
import type { ZepboundInjection, ZepboundSymptomLog } from '../types/database';

function injection(
  id: string,
  injectionDate: string,
  injectionTime = '08:00:00',
): ZepboundInjection {
  return {
    id,
    user_id: 'test-user-id',
    created_at: `${injectionDate}T${injectionTime}Z`,
    injection_date: injectionDate,
    injection_time: injectionTime,
    dose_mg: 2.5,
    injection_site: 'abdomen',
    notes: null,
  };
}

function symptom(
  id: string,
  logDate: string,
  symptomType: string,
  injectionId: string | null,
): ZepboundSymptomLog {
  return {
    id,
    user_id: 'test-user-id',
    injection_id: injectionId,
    created_at: `${logDate}T12:00:00Z`,
    log_date: logDate,
    symptom_time: '12:00:00',
    symptom_type: symptomType,
    severity: 3,
    notes: null,
  };
}

function lastInsert(table: string) {
  return [...mockDatabaseWrites].reverse().find(
    (write) => write.table === table && write.operation === 'insert',
  );
}

describe('DailyZepboundLogCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('makes Home the selected-day entry surface without requiring a typed date', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());

    expect(screen.getByText('Logging for Jul 15')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Log shot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Log symptom' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View history ›' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Log shot' }));
    expect(screen.getByText('Shot on Jul 15')).toBeTruthy();
    expect(screen.queryByLabelText('Shot date')).toBeNull();
  });

  it('submits the essential shot payload using Home selected date', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.change(screen.getByLabelText('Shot time'), { target: { value: '09:45' } });
    fireEvent.click(screen.getByText('Save shot'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => {
      expect(lastInsert('zepbound_injections')?.values).toEqual({
        user_id: 'test-user-id',
        injection_date: '2026-07-15',
        injection_time: '09:45',
        dose_mg: 5,
        injection_site: 'other',
        notes: null,
      });
      expect(screen.queryByLabelText('Shot time')).toBeNull();
    });
  });

  it('keeps injection site and notes available as optional details', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.click(screen.getByText(/Optional details/));
    fireEvent.click(screen.getByText('Thigh'));
    fireEvent.change(screen.getByLabelText('Shot notes'), { target: { value: 'Left side' } });
    fireEvent.change(screen.getByLabelText('Shot time'), { target: { value: '09:45' } });
    fireEvent.click(screen.getByText('Save shot'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(lastInsert('zepbound_injections')?.values).toEqual(expect.objectContaining({
      injection_site: 'thigh',
      notes: 'Left side',
    })));
  });

  it('shows inline validation and does not write an invalid shot time', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.change(screen.getByLabelText('Shot time'), { target: { value: '25:00' } });
    fireEvent.click(screen.getByText('Save shot'));

    expect(await screen.findByText('Enter the shot time as HH:MM (24-hour time).')).toBeTruthy();
    expect(lastInsert('zepbound_injections')).toBeUndefined();
  });

  it('submits a selected-day symptom and associates only to a prior shot time', async () => {
    mockSetTableData('zepbound_injections', [
      injection('later-shot', '2026-07-15', '20:00:00'),
      injection('earlier-shot', '2026-07-15', '08:00:00'),
      injection('prior-shot', '2026-07-08', '08:00:00'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getAllByText(/Shot 2.5 mg/)).toHaveLength(2));
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Reflux'));
    fireEvent.click(screen.getByLabelText('Severity 4'));
    fireEvent.change(screen.getByLabelText('Symptom time'), { target: { value: '12:00' } });
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'After lunch' } });
    fireEvent.click(screen.getByText('Save symptom'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(lastInsert('zepbound_symptom_logs')?.values).toEqual({
      user_id: 'test-user-id',
      injection_id: 'earlier-shot',
      log_date: '2026-07-15',
      symptom_time: '12:00',
      symptom_type: 'Reflux',
      severity: 4,
      notes: 'After lunch',
    }));
  });

  it('leaves a symptom before the first shot unassociated', async () => {
    mockSetTableData('zepbound_injections', [injection('first-shot', '2026-07-15', '08:00:00')]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 14)} />);
    await waitFor(() => expect(screen.getByText(/Last shot/)).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.change(screen.getByLabelText('Symptom time'), { target: { value: '18:00' } });
    fireEvent.click(screen.getByText('Save symptom'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(lastInsert('zepbound_symptom_logs')?.values).toEqual(expect.objectContaining({
      injection_id: null,
      log_date: '2026-07-14',
      symptom_time: '18:00',
    })));
  });

  it('shows selected-day shot and symptom status with times', async () => {
    mockSetTableData('zepbound_injections', [
      injection('selected-shot', '2026-07-15', '09:30:00'),
      injection('other-shot', '2026-07-08', '08:00:00'),
    ]);
    mockSetTableData('zepbound_symptom_logs', [
      symptom('selected-symptom', '2026-07-15', 'Selected-day nausea', 'selected-shot'),
      symptom('other-symptom', '2026-07-14', 'Other-day reflux', 'selected-shot'),
    ]);

    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => {
      expect(screen.getByText('✓ Shot 2.5 mg at 09:30')).toBeTruthy();
      expect(screen.getByText('Selected-day nausea · 3/5 at 12:00')).toBeTruthy();
    });
    expect(screen.queryByText(/Other-day reflux/)).toBeNull();
  });
});

describe('ZepboundTrackerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('keeps Health as read-only longitudinal history, not a duplicate logger', async () => {
    mockSetTableData('zepbound_injections', [injection('shot-1', '2026-07-15')]);
    mockSetTableData('zepbound_symptom_logs', [symptom('symptom-1', '2026-07-15', 'Nausea', 'shot-1')]);
    render(<ZepboundTrackerCard />);

    await waitFor(() => expect(screen.getByText('Shot and symptom history')).toBeTruthy());
    expect(screen.getByText('💉 Zepbound history')).toBeTruthy();
    expect(screen.getByText('Review weekly shots and symptoms here. Add new entries from Home.')).toBeTruthy();
    expect(screen.queryByText('+ Log shot')).toBeNull();
    expect(screen.queryByText('+ Log symptom')).toBeNull();
    expect(screen.getByText('Nausea · 3/5')).toBeTruthy();
  });

  it('retains symptoms associated with older shots and unassociated entries', async () => {
    const shots = [
      injection('shot-1', '2026-07-15'),
      injection('shot-8', '2026-05-27'),
    ];
    mockSetTableData('zepbound_injections', shots);
    mockSetTableData('zepbound_symptom_logs', [
      symptom('older-related', '2026-05-28', 'Older-shot nausea', 'shot-8'),
      symptom('before-first', '2026-05-20', 'Before-first headache', null),
    ]);

    render(<ZepboundTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Older-shot nausea/)).toBeTruthy();
      expect(screen.getByText(/Before-first headache/)).toBeTruthy();
      expect(screen.getByText('Other symptom entries')).toBeTruthy();
    });
  });
});
