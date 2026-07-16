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
import { DailyZepboundStatusCard } from '../components/home/daily-zepbound-status-card';
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

describe('ZepboundTrackerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('keeps shot and symptom tracking in a dedicated, accessible section', async () => {
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('No shots logged yet.')).toBeTruthy());

    const shotToggle = screen.getByRole('button', { name: '+ Log shot' });
    expect(shotToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(shotToggle);
    expect(shotToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: '2.5' }).getAttribute('aria-selected')).toBe('true');
  });

  it('submits the complete weekly shot payload', async () => {
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('No shots logged yet.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('Thigh'));
    fireEvent.change(screen.getByLabelText('Shot date'), { target: { value: '2026-07-15' } });
    fireEvent.change(screen.getByLabelText('Shot time'), { target: { value: '09:45' } });
    fireEvent.change(screen.getByLabelText('Shot notes'), { target: { value: 'Left side' } });
    fireEvent.click(screen.getByText('Save shot'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => {
      expect(lastInsert('zepbound_injections')?.values).toEqual({
        user_id: 'test-user-id',
        injection_date: '2026-07-15',
        injection_time: '09:45',
        dose_mg: 5,
        injection_site: 'thigh',
        notes: 'Left side',
      });
      expect(screen.queryByLabelText('Shot date')).toBeNull();
    });
  });

  it('shows an inline validation error and does not write an invalid shot date', async () => {
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('No shots logged yet.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.change(screen.getByLabelText('Shot date'), { target: { value: '2026-02-29' } });
    fireEvent.click(screen.getByText('Save shot'));

    expect(await screen.findByText('Enter the shot date as YYYY-MM-DD.')).toBeTruthy();
    expect(lastInsert('zepbound_injections')).toBeUndefined();
  });

  it('associates a same-day symptom only to an injection at or before its time', async () => {
    mockSetTableData('zepbound_injections', [
      injection('later-shot', '2026-07-15', '20:00:00'),
      injection('earlier-shot', '2026-07-15', '08:00:00'),
      injection('prior-shot', '2026-07-08', '08:00:00'),
    ]);
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('Shot and symptom history')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Reflux'));
    fireEvent.click(screen.getByLabelText('Severity 4'));
    fireEvent.change(screen.getByLabelText('Symptom date'), { target: { value: '2026-07-15' } });
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
    expect(screen.queryByLabelText('Symptom date')).toBeNull();
  });

  it('leaves a symptom before the first shot unassociated', async () => {
    mockSetTableData('zepbound_injections', [injection('first-shot', '2026-07-15', '08:00:00')]);
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('Shot and symptom history')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.change(screen.getByLabelText('Symptom date'), { target: { value: '2026-07-14' } });
    fireEvent.change(screen.getByLabelText('Symptom time'), { target: { value: '18:00' } });
    fireEvent.click(screen.getByText('Save symptom'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(lastInsert('zepbound_symptom_logs')?.values).toEqual(expect.objectContaining({
      injection_id: null,
      log_date: '2026-07-14',
      symptom_time: '18:00',
    })));
    expect(screen.queryByLabelText('Symptom date')).toBeNull();
  });

  it('shows an inline validation error and does not write an invalid symptom time', async () => {
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('No shots logged yet.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.change(screen.getByLabelText('Symptom time'), { target: { value: '25:00' } });
    fireEvent.click(screen.getByText('Save symptom'));

    expect(await screen.findByText('Enter the symptom time as HH:MM (24-hour time).')).toBeTruthy();
    expect(lastInsert('zepbound_symptom_logs')).toBeUndefined();
  });

  it('shows unassociated symptoms and symptoms attached to shots older than six weeks', async () => {
    const shots = [
      injection('shot-1', '2026-07-15'),
      injection('shot-2', '2026-07-08'),
      injection('shot-3', '2026-07-01'),
      injection('shot-4', '2026-06-24'),
      injection('shot-5', '2026-06-17'),
      injection('shot-6', '2026-06-10'),
      injection('shot-7', '2026-06-03'),
      injection('shot-8', '2026-05-27'),
    ];
    mockSetTableData('zepbound_injections', shots);
    mockSetTableData('zepbound_symptom_logs', [
      symptom('older-related', '2026-05-28', 'Older-shot nausea', 'shot-8'),
      symptom('before-first', '2026-05-20', 'Before-first headache', null),
      symptom('standalone', '2026-07-14', 'Standalone reflux', null),
    ]);

    render(<ZepboundTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Older-shot nausea/)).toBeTruthy();
      expect(screen.getByText(/Before-first headache/)).toBeTruthy();
      expect(screen.getByText(/Standalone reflux/)).toBeTruthy();
      expect(screen.getByText('Other symptom entries')).toBeTruthy();
    });
  });
});

describe('DailyZepboundStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('shows only the selected day and does not duplicate entry controls', async () => {
    mockSetTableData('zepbound_injections', [
      injection('selected-shot', '2026-07-15', '09:30:00'),
      injection('other-shot', '2026-07-08', '08:00:00'),
    ]);
    mockSetTableData('zepbound_symptom_logs', [
      symptom('selected-symptom', '2026-07-15', 'Selected-day nausea', 'selected-shot'),
      symptom('other-symptom', '2026-07-14', 'Other-day reflux', 'selected-shot'),
    ]);

    render(<DailyZepboundStatusCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => {
      expect(screen.getByText('✓ Shot 2.5 mg at 09:30')).toBeTruthy();
      expect(screen.getByText('Selected-day nausea · 3/5')).toBeTruthy();
    });
    expect(screen.queryByText(/Other-day reflux/)).toBeNull();
    expect(screen.queryByText('+ Log shot')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open tracker ›' })).toBeTruthy();
  });
});
