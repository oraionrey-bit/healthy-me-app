import React from 'react';
import {
  act,
  fireEvent,
  mockDatabaseWrites,
  mockRpcCalls,
  mockResetZepboundData,
  mockSetRpcError,
  mockSetTableData,
  mockSetTableError,
  render,
  screen,
  waitFor,
} from './test-utils';
import { ZepboundTrackerCard } from '../components/health/zepbound-tracker-card';
import { DailyZepboundLogCard } from '../components/home/daily-zepbound-status-card';
import type { ZepboundDailyCheckin, ZepboundInjection, ZepboundSymptomLog } from '../types/database';

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
  severity = 3,
  notes: string | null = null,
): ZepboundSymptomLog {
  return {
    id,
    user_id: 'test-user-id',
    injection_id: injectionId,
    created_at: `${logDate}T12:00:00Z`,
    log_date: logDate,
    symptom_time: '12:00:00',
    symptom_type: symptomType,
    severity,
    notes,
  };
}

function checkin(
  id: string,
  logDate: string,
  workedOut: boolean | null,
  duration: number | null,
  pooped: boolean | null,
): ZepboundDailyCheckin {
  return {
    id,
    user_id: 'test-user-id',
    log_date: logDate,
    worked_out: workedOut,
    workout_duration_minutes: duration,
    pooped,
    created_at: `${logDate}T12:00:00Z`,
    updated_at: `${logDate}T12:00:00Z`,
  };
}

function lastInsert(table: string) {
  return [...mockDatabaseWrites].reverse().find(
    (write) => write.table === table && write.operation === 'insert',
  );
}

function inserts(table: string) {
  return mockDatabaseWrites.filter(
    (write) => write.table === table && write.operation === 'insert',
  );
}

function setTwelveHourTime(label: 'Shot' | 'Symptom', hour: string, minute: string, period: 'AM' | 'PM') {
  fireEvent.change(screen.getByLabelText(`${label} hour`), { target: { value: hour } });
  fireEvent.change(screen.getByLabelText(`${label} minute`), { target: { value: minute } });
  fireEvent.click(screen.getByLabelText(`${label} ${period}`));
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
    setTwelveHourTime('Shot', '9', '45', 'AM');
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
      expect(screen.queryByLabelText('Shot hour')).toBeNull();
    });
  });

  it('stores 12 AM as midnight without shifting the selected date', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    setTwelveHourTime('Shot', '12', '00', 'AM');
    fireEvent.click(screen.getByText('Save shot'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(lastInsert('zepbound_injections')?.values).toEqual(expect.objectContaining({
      injection_date: '2026-07-15',
      injection_time: '00:00',
    })));
  });

  it('keeps injection site and notes available as optional details', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log shot'));
    fireEvent.click(screen.getByText(/Optional details/));
    fireEvent.click(screen.getByText('Thigh'));
    fireEvent.change(screen.getByLabelText('Shot notes'), { target: { value: 'Left side' } });
    setTwelveHourTime('Shot', '9', '45', 'AM');
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
    setTwelveHourTime('Shot', '13', '00', 'AM');
    fireEvent.click(screen.getByText('Save shot'));

    expect(await screen.findByText('Choose a valid shot time: hour 1–12, minute 00–59, and AM or PM.')).toBeTruthy();
    expect(lastInsert('zepbound_injections')).toBeUndefined();
  });

  it('submits multiple selected-day symptoms atomically without asking for a symptom time', async () => {
    mockSetTableData('zepbound_injections', [
      injection('earlier-shot', '2026-07-15', '08:00:00'),
      injection('prior-shot', '2026-07-08', '08:00:00'),
      injection('later-shot', '2026-07-15', '20:00:00'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getAllByText(/Shot 2.5 mg/)).toHaveLength(2));
    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.queryByLabelText('Symptom hour')).toBeNull();
    fireEvent.click(screen.getByText('Nausea'));
    fireEvent.click(screen.getByText('Reflux'));
    fireEvent.click(screen.getByLabelText('Severity 4'));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'After lunch' } });
    fireEvent.click(screen.getByText('Save symptoms'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(mockRpcCalls).toEqual([{
      functionName: 'save_zepbound_symptoms_for_date',
      args: {
        p_log_date: '2026-07-15',
        p_symptoms: [
          { symptom_type: 'Nausea', severity: 4, notes: 'After lunch' },
          { symptom_type: 'Reflux', severity: 4, notes: 'After lunch' },
        ],
      },
    }]));
    expect(inserts('zepbound_symptom_logs')).toHaveLength(0);
  });

  it('prefills every saved symptom plus shared severity and notes when editing and reopening', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('nausea', '2026-07-15', 'Nausea', null, 4, 'After lunch'),
      symptom('reflux', '2026-07-15', 'Reflux', null, 4, 'After lunch'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Nausea · 4/5');

    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Severity 4' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('After lunch');
    expect(screen.queryByLabelText('Symptom hour')).toBeNull();

    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Severity 4' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('After lunch');
  });

  it('sends an edited saved date as one complete replacement payload', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('low-appetite-old', '2026-07-16', 'Low appetite', null, 2, 'Original note'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 16)} />);
    await screen.findByText('Low appetite · 2/5');

    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.change(screen.getByLabelText('Symptom notes'), {
      target: { value: 'Original note; body kinda sore after dinner' },
    });
    fireEvent.click(screen.getByText('Save symptoms'));

    await waitFor(() => expect(mockRpcCalls).toEqual([{
      functionName: 'save_zepbound_symptoms_for_date',
      args: {
        p_log_date: '2026-07-16',
        p_symptoms: [{
          symptom_type: 'Low appetite',
          severity: 2,
          notes: 'Original note; body kinda sore after dinner',
        }],
      },
    }]));
    expect(inserts('zepbound_symptom_logs')).toHaveLength(0);
  });

  it('uses maximum severity and preserves distinct notes for legacy rows with differing values', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('nausea', '2026-07-15', 'Nausea', null, 2, 'Morning'),
      symptom('reflux', '2026-07-15', 'Reflux', null, 5, 'Evening'),
      symptom('headache', '2026-07-15', 'Headache', null, 3, 'Morning'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Nausea · 2/5');
    fireEvent.click(screen.getByText('+ Log symptom'));

    expect(screen.getByRole('radio', { name: 'Severity 5' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Morning\nEvening');
  });

  it('prefills a saved None exclusively and keeps severity hidden', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('none', '2026-07-15', 'None', null, 1, 'Good day'),
      // Defensive coverage for malformed legacy data: None remains exclusive.
      symptom('nausea', '2026-07-15', 'Nausea', null, 4, 'Old conflict'),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('No symptoms');
    fireEvent.click(screen.getByText('+ Log symptom'));

    expect(screen.getByRole('checkbox', { name: 'None' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('Severity')).toBeNull();
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Good day');
  });

  it('leaves a symptom before the first shot unassociated', async () => {
    mockSetTableData('zepbound_injections', [injection('first-shot', '2026-07-15', '08:00:00')]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 14)} />);
    await waitFor(() => expect(screen.getByText(/Last shot/)).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Nausea'));
    fireEvent.click(screen.getByText('Save symptoms'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(mockRpcCalls[0]).toEqual(expect.objectContaining({
      functionName: 'save_zepbound_symptoms_for_date',
      args: expect.objectContaining({ p_log_date: '2026-07-14' }),
    })));
  });

  it('allows an explicit no-symptoms entry and makes None exclusive', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Nausea'));
    fireEvent.click(screen.getByText('None'));

    expect(screen.getByRole('checkbox', { name: 'None' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('Severity')).toBeNull();
    fireEvent.click(screen.getByText('Save symptoms'));
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => expect(mockRpcCalls[0]).toEqual({
      functionName: 'save_zepbound_symptoms_for_date',
      args: {
        p_log_date: '2026-07-15',
        p_symptoms: [{ symptom_type: 'None', severity: 1, notes: null }],
      },
    }));
  });

  it('keeps the whole symptom draft when the atomic save fails', async () => {
    mockSetRpcError(new Error('transaction rolled back'));
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Nausea'));
    fireEvent.click(screen.getByText('Reflux'));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByText('Save symptoms'));

    expect(await screen.findByText('Could not save the symptoms. Please try again.')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Keep me');
    expect(mockRpcCalls).toHaveLength(1);
    expect(inserts('zepbound_symptom_logs')).toHaveLength(0);
  });

  it('resets the symptom draft when the selected date changes', async () => {
    const { rerender } = render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('No Zepbound entries for Jul 15.')).toBeTruthy());
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.click(screen.getByText('Nausea'));
    fireEvent.click(screen.getByLabelText('Severity 5'));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Old date' } });

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 16)} />);
    fireEvent.click(screen.getByText('+ Log symptom'));

    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Severity 3' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('');
  });

  it('rehydrates each selected date from that date records without leaking drafts', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('nausea', '2026-07-15', 'Nausea', null, 2, 'First date'),
      symptom('reflux', '2026-07-16', 'Reflux', null, 5, 'Second date'),
    ]);
    const { rerender } = render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Nausea · 2/5');
    fireEvent.click(screen.getByText('+ Log symptom'));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Unsaved draft' } });

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 16)} />);
    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.getByRole('checkbox', { name: 'Nausea' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Severity 5' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Second date');

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 17)} />);
    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Severity 3' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('');
  });

  it('shows selected-day shot time and date-only symptom status', async () => {
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
      expect(screen.getByText('✓ Shot 2.5 mg at 9:30 AM')).toBeTruthy();
      expect(screen.getByText('Selected-day nausea · 3/5')).toBeTruthy();
    });
    expect(screen.queryByText(/Other-day reflux/)).toBeNull();
  });

  it('allows long symptom names to wrap within the Home card', async () => {
    const longName = 'ExtremelyLongUnbrokenZepboundSymptomNameThatMustStayInsideTheCard';
    mockSetTableData('zepbound_symptom_logs', [symptom('long-home', '2026-07-15', longName, null)]);

    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    const content = await screen.findByTestId('zepbound-home-symptom-long-home');
    expect(getComputedStyle(content).flexShrink).toBe('1');
    expect(getComputedStyle(content).maxWidth).toBe('100%');
    expect(screen.getByText(`${longName} · 3/5`)).toBeTruthy();
  });
});

describe('Zepbound manual daily check-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('starts unanswered and contains only the simple manual fields', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');

    expect(screen.getByText('Worked out today?')).toBeTruthy();
    expect(screen.getByText('Pooped today?')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Workout Yes' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Workout No' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Pooped No' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByLabelText('Workout duration minutes')).toBeNull();
    for (const forbidden of ['Workout type', 'Intensity', 'Calories', 'Workout time', 'Oura']) {
      expect(screen.queryByText(forbidden)).toBeNull();
    }
  });

  it('saves explicit workout No and pooped No in one owner/date upsert', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');
    fireEvent.click(screen.getByRole('radio', { name: 'Workout No' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => expect(mockDatabaseWrites).toContainEqual({
      table: 'zepbound_daily_checkins',
      operation: 'upsert',
      values: {
        user_id: 'test-user-id',
        log_date: '2026-07-15',
        worked_out: false,
        workout_duration_minutes: null,
        pooped: false,
      },
      options: { onConflict: 'user_id,log_date' },
    }));
  });

  it('requires whole valid minutes for Yes and supports arbitrary minutes with neutral goal progress', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(await screen.findByText('Enter workout duration in whole minutes.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '17' } });
    expect(screen.getByText('3 minutes remaining for today’s 20-minute goal.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      table: 'zepbound_daily_checkins',
      operation: 'upsert',
      values: expect.objectContaining({ worked_out: true, workout_duration_minutes: 17, pooped: true }),
    })));
  });

  it('rejects an empty check-in and out-of-range minutes, then clears duration for workout No', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(await screen.findByText('Answer at least one daily check-in question.')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    for (const invalidMinutes of ['0', '1.5', '1441']) {
      fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: invalidMinutes } });
      fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
      expect(await screen.findByText('Enter workout duration in whole minutes.')).toBeTruthy();
    }

    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '1440' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Workout No' }));
    expect(screen.queryByLabelText('Workout duration minutes')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      table: 'zepbound_daily_checkins',
      operation: 'upsert',
      values: expect.objectContaining({ worked_out: false, workout_duration_minutes: null }),
    })));
  });

  it('clears a workout answer and its duration back to unanswered', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('saved', '2026-07-15', true, 45, false),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByLabelText('Workout duration minutes');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Workout answer' }));
    expect(screen.getByRole('radio', { name: 'Workout Yes' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Workout No' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByLabelText('Workout duration minutes')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      table: 'zepbound_daily_checkins',
      operation: 'upsert',
      values: expect.objectContaining({
        worked_out: null,
        workout_duration_minutes: null,
        pooped: false,
      }),
    })));
  });

  it('clears a pooped answer back to unanswered while preserving the workout answer', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('saved', '2026-07-15', false, null, true),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByRole('button', { name: 'Clear Pooped answer' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Pooped answer' }));
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Pooped No' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      table: 'zepbound_daily_checkins',
      operation: 'upsert',
      values: expect.objectContaining({
        worked_out: false,
        workout_duration_minutes: null,
        pooped: null,
      }),
    })));
  });

  it('preserves a dirty check-in draft through an unrelated shot refetch', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('saved', '2026-07-15', false, null, false),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByRole('button', { name: 'Clear Workout answer' });
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped Yes' }));

    fireEvent.click(screen.getByRole('button', { name: '+ Log shot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    await waitFor(() => expect(lastInsert('zepbound_injections')).toBeTruthy());

    expect(screen.getByRole('radio', { name: 'Workout Yes' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('35');
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('true');
  });

  it('offers 20/30/45/60 quick choices and shows when the daily goal is met', async () => {
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    for (const minutes of [20, 30, 45, 60]) {
      expect(screen.getByRole('button', { name: `${minutes} minutes` })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: '30 minutes' }));
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('30');
    expect(screen.getByText('20-minute daily goal met.')).toBeTruthy();
  });

  it('hydrates saved values on reopen and switches to the selected date', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('first', '2026-07-15', true, 45, false),
      checkin('second', '2026-07-16', false, null, true),
    ]);
    const { rerender } = render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    expect(await screen.findByText('Workout: 45 min · goal met')).toBeTruthy();
    expect(screen.getByText('Pooped: No')).toBeTruthy();
    expect((await screen.findByLabelText('Workout duration minutes')).getAttribute('value')).toBe('45');

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 16)} />);
    expect(await screen.findByText('Workout: No')).toBeTruthy();
    expect(screen.getByText('Pooped: Yes')).toBeTruthy();
    expect(screen.queryByLabelText('Workout duration minutes')).toBeNull();

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 17)} />);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Workout No' }).getAttribute('aria-checked')).toBe('false'));
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('false');
  });

  it('shows compact remaining-goal status without claiming the date has no entries', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('short-workout', '2026-07-15', true, 17, null),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);

    expect(await screen.findByText('Workout: 17 min · 3 min to goal')).toBeTruthy();
    expect(screen.queryByText('No Zepbound entries for Jul 15.')).toBeNull();
  });

  it('shows a safe fallback for a malformed logged workout with no duration', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('malformed', '2026-07-15', true, null, true),
    ]);
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);

    expect(await screen.findByText('Workout: logged, duration unavailable')).toBeTruthy();
    expect(screen.queryByText(/Workout: 0 min/)).toBeNull();
  });

  it('retains the complete draft when the atomic upsert fails', async () => {
    mockSetTableError('zepbound_daily_checkins', new Error('offline'));
    render(<DailyZepboundLogCard date={new Date(2026, 6, 15)} />);
    await screen.findByText('Daily check-in');
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    expect(await screen.findByText('Could not save the daily check-in. Please try again.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Workout Yes' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('35');
    expect(screen.getByRole('radio', { name: 'Pooped No' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('ZepboundTrackerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('keeps Health as read-only longitudinal history, not a duplicate logger', async () => {
    mockSetTableData('zepbound_injections', [injection('shot-1', '2026-07-15', '00:00:00')]);
    mockSetTableData('zepbound_symptom_logs', [symptom('symptom-1', '2026-07-15', 'Nausea', 'shot-1')]);
    render(<ZepboundTrackerCard />);

    await waitFor(() => expect(screen.getByText('Shot and symptom history')).toBeTruthy());
    expect(screen.getByText('💉 Zepbound history')).toBeTruthy();
    expect(screen.getByText('Review weekly shots and symptoms here. Add new entries from Home.')).toBeTruthy();
    expect(screen.queryByText('+ Log shot')).toBeNull();
    expect(screen.queryByText('+ Log symptom')).toBeNull();
    expect(screen.getByText('Nausea · 3/5')).toBeTruthy();
    expect(screen.getByText('2026-07-15 · 12:00 AM')).toBeTruthy();
    expect(screen.getByText('2026-07-15')).toBeTruthy();
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

  it('shows manual workout and pooped values in read-only longitudinal history', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('daily-1', '2026-07-15', true, 25, true),
      checkin('daily-2', '2026-07-14', false, null, false),
    ]);
    render(<ZepboundTrackerCard />);

    await screen.findByText('Daily check-ins');
    expect(screen.getByText('2026-07-15 · Workout 25 min · Pooped Yes')).toBeTruthy();
    expect(screen.getByText('2026-07-14 · Workout No · Pooped No')).toBeTruthy();
    expect(screen.queryByText('Save check-in')).toBeNull();
  });

  it('does not print null minutes for malformed legacy workout history', async () => {
    mockSetTableData('zepbound_daily_checkins', [
      checkin('malformed', '2026-07-15', true, null, false),
    ]);
    render(<ZepboundTrackerCard />);

    await screen.findByText('Daily check-ins');
    expect(screen.getByText('2026-07-15 · Workout: logged, duration unavailable · Pooped No')).toBeTruthy();
    expect(screen.queryByText(/Workout null min/)).toBeNull();
  });

  it('wraps long symptom names and notes inside both Health history layouts', async () => {
    const longName = 'ExtremelyLongUnbrokenZepboundSymptomNameThatMustWrapOnIPhone';
    const longNotes = 'A complete meaningful health note that must remain visible and wrap instead of being truncated or leaving the frame.';
    const associated = { ...symptom('long-associated', '2026-07-15', longName, 'shot-1'), notes: longNotes };
    const unassociated = { ...symptom('long-unassociated', '2026-07-14', longName, null), notes: longNotes };
    mockSetTableData('zepbound_injections', [injection('shot-1', '2026-07-15')]);
    mockSetTableData('zepbound_symptom_logs', [associated, unassociated]);

    render(<ZepboundTrackerCard />);
    for (const id of ['long-associated', 'long-unassociated']) {
      const content = await screen.findByTestId(`zepbound-health-symptom-content-${id}`);
      expect(getComputedStyle(content).flexShrink).toBe('1');
      expect(getComputedStyle(content).minWidth).toBe('0px');
    }
    expect(screen.getAllByText(`${longName} · 3/5`)).toHaveLength(2);
    expect(screen.getAllByText(longNotes)).toHaveLength(2);
  });
});
