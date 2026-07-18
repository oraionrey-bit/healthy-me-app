import React from 'react';
import {
  act,
  fireEvent,
  mockDatabaseWrites,
  mockResetZepboundData,
  mockRpcCalls,
  mockSetRpcError,
  mockSetRpcPromise,
  mockSetTableData,
  mockSetTableError,
  render,
  screen,
  waitFor,
} from './test-utils';
import { DailyZepboundLogCard } from '../components/home/daily-zepbound-status-card';
import { ZepboundTrackerCard } from '../components/health/zepbound-tracker-card';
import type { ZepboundDailyCheckin, ZepboundInjection, ZepboundSymptomLog } from '../types/database';

const DATE = new Date(2026, 6, 17);

function symptom(id: string, date: string, type: string, severity = 3, notes: string | null = null): ZepboundSymptomLog {
  return {
    id,
    user_id: 'test-user-id',
    injection_id: null,
    created_at: `${date}T12:00:00Z`,
    log_date: date,
    symptom_time: '12:00:00',
    symptom_type: type,
    severity,
    notes,
  };
}

function checkin(
  id: string,
  date: string,
  workedOut: boolean | null,
  duration: number | null,
  pooped: boolean | null,
): ZepboundDailyCheckin {
  return {
    id,
    user_id: 'test-user-id',
    log_date: date,
    worked_out: workedOut,
    workout_duration_minutes: duration,
    pooped,
    created_at: `${date}T12:00:00Z`,
    updated_at: `${date}T12:00:00Z`,
  };
}

function injection(id: string, date: string): ZepboundInjection {
  return {
    id,
    user_id: 'test-user-id',
    injection_date: date,
    injection_time: '08:00:00',
    dose_mg: 2.5,
    injection_site: 'abdomen',
    notes: null,
    created_at: `${date}T08:00:00Z`,
  };
}

function setShotTime(hour: string, minute: string, period: 'AM' | 'PM') {
  fireEvent.change(screen.getByLabelText('Shot hour'), { target: { value: hour } });
  fireEvent.change(screen.getByLabelText('Shot minute'), { target: { value: minute } });
  fireEvent.click(screen.getByLabelText(`Shot ${period}`));
}

function lastInjectionInsert() {
  return [...mockDatabaseWrites].reverse().find(
    (write) => write.table === 'zepbound_injections' && write.operation === 'insert',
  );
}

async function openDaily() {
  const button = await screen.findByRole('button', { name: /Daily check-in/i });
  fireEvent.click(button);
  await screen.findByText('Daily Zepbound check-in · Jul 17');
}

function saveDaily() {
  fireEvent.click(screen.getByRole('button', { name: 'Save daily check-in' }));
}

function expectOnlyUnifiedRpc(args: unknown) {
  expect(mockRpcCalls).toEqual([{ functionName: 'save_zepbound_daily_log', args }]);
  expect(mockDatabaseWrites.filter((write) =>
    write.table === 'zepbound_symptom_logs' || write.table === 'zepbound_daily_checkins')).toHaveLength(0);
}

describe('unified Daily Zepbound check-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('has one compact daily action and one save; shot logging remains separate', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    expect(await screen.findByRole('button', { name: '+ Daily check-in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Log shot' })).toBeTruthy();
    expect(screen.queryByText('+ Log symptom')).toBeNull();
    expect(screen.queryByText('Save symptoms')).toBeNull();
    expect(screen.queryByText('Save check-in')).toBeNull();

    await openDaily();
    expect(screen.getAllByRole('button', { name: 'Save daily check-in' })).toHaveLength(1);
    expect(screen.getByText('Symptoms (optional)')).toBeTruthy();
    expect(screen.getByText('Worked out today?')).toBeTruthy();
    expect(screen.getByText('Pooped today?')).toBeTruthy();
  });

  it('hydrates both tables and sends exactly one complete RPC payload', async () => {
    mockSetTableData('zepbound_symptom_logs', [symptom('low', '2026-07-17', 'Low appetite', 2, 'Still eating')]);
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', true, 20, true)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();

    expect(screen.getByRole('checkbox', { name: 'Low appetite' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Still eating');
    expect(screen.getByRole('radio', { name: 'Workout Yes' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('20');
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('true');
    saveDaily();

    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [{ symptom_type: 'Low appetite', severity: 2, notes: 'Still eating' }],
      p_worked_out: true,
      p_workout_duration_minutes: 20,
      p_pooped: true,
    }));
  });

  it('editing only symptoms preserves workout and pooped exactly', async () => {
    mockSetTableData('zepbound_symptom_logs', [symptom('low', '2026-07-17', 'Low appetite', 2)]);
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', false, null, true)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fatigue' }));
    saveDaily();

    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [
        { symptom_type: 'Low appetite', severity: 2, notes: null },
        { symptom_type: 'Fatigue', severity: 2, notes: null },
      ],
      p_worked_out: false,
      p_workout_duration_minutes: null,
      p_pooped: true,
    }));
  });

  it('preserves heterogeneous existing symptom details during a selection-only edit', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('nausea', '2026-07-17', 'Nausea', 4, 'After lunch'),
      symptom('reflux', '2026-07-17', 'Reflux', 2, 'At night'),
    ]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fullness' }));
    saveDaily();

    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [
        { symptom_type: 'Nausea', severity: 4, notes: 'After lunch' },
        { symptom_type: 'Reflux', severity: 2, notes: 'At night' },
        { symptom_type: 'Fullness', severity: 4, notes: 'After lunch\nAt night' },
      ],
      p_worked_out: null,
      p_workout_duration_minutes: null,
      p_pooped: null,
    }));
  });

  it('offers separate ordered Indigestion and Fullness options that can save together', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    const options = screen.getAllByRole('checkbox').map((node) => node.textContent);
    expect(options.indexOf('Reflux')).toBeLessThan(options.indexOf('Indigestion'));
    expect(options.indexOf('Indigestion')).toBeLessThan(options.indexOf('Fullness'));
    expect(options.indexOf('Fullness')).toBeLessThan(options.indexOf('Bloating'));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Indigestion' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fullness' }));
    expect(screen.getByRole('checkbox', { name: 'Indigestion' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Fullness' }).getAttribute('aria-checked')).toBe('true');
    saveDaily();

    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [
        { symptom_type: 'Indigestion', severity: 3, notes: null },
        { symptom_type: 'Fullness', severity: 3, notes: null },
      ],
      p_worked_out: null,
      p_workout_duration_minutes: null,
      p_pooped: null,
    }));
  });

  it('prefills and displays Indigestion and Fullness independently on Home', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('indigestion', '2026-07-17', 'Indigestion', 2),
      symptom('fullness', '2026-07-17', 'Fullness', 4),
    ]);
    render(<DailyZepboundLogCard date={DATE} />);
    expect(await screen.findByText('Indigestion · 2/5')).toBeTruthy();
    expect(screen.getByText('Fullness · 4/5')).toBeTruthy();
    for (const id of ['indigestion', 'fullness']) {
      const status = screen.getByTestId(`zepbound-home-symptom-${id}`);
      expect(getComputedStyle(status).flexShrink).toBe('1');
      expect(getComputedStyle(status).maxWidth).toBe('100%');
    }
    await openDaily();
    expect(screen.getByRole('checkbox', { name: 'Indigestion' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Fullness' }).getAttribute('aria-checked')).toBe('true');
  });

  it('editing only check-in answers preserves every symptom', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('a', '2026-07-17', 'Nausea', 4, 'After lunch'),
      symptom('b', '2026-07-17', 'Reflux', 2, 'Evening legacy note'),
    ]);
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', false, null, false)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped Yes' }));
    saveDaily();

    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [
        { symptom_type: 'Nausea', severity: 4, notes: 'After lunch' },
        { symptom_type: 'Reflux', severity: 2, notes: 'Evening legacy note' },
      ],
      p_worked_out: false,
      p_workout_duration_minutes: null,
      p_pooped: true,
    }));
  });

  it('allows no symptom answer when a manual answer exists', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped No' }));
    saveDaily();
    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17', p_symptoms: [], p_worked_out: null,
      p_workout_duration_minutes: null, p_pooped: false,
    }));
  });

  it('allows symptoms with both manual questions unanswered', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nausea' }));
    saveDaily();
    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [{ symptom_type: 'Nausea', severity: 3, notes: null }],
      p_worked_out: null, p_workout_duration_minutes: null, p_pooped: null,
    }));
  });

  it('keeps None exclusive and combines it with check-in answers', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nausea' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'None' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Workout No' }));
    saveDaily();
    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [{ symptom_type: 'None', severity: 1, notes: null }],
      p_worked_out: false, p_workout_duration_minutes: null, p_pooped: null,
    }));
  });

  it('supports quick and arbitrary workout minutes with goal status', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    for (const minutes of [20, 30, 45, 60]) {
      expect(screen.getByRole('button', { name: `${minutes} minutes` })).toBeTruthy();
    }
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '17' } });
    expect(screen.getByText('3 minutes remaining for today’s 20-minute goal.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '20 minutes' }));
    expect(screen.getByText('20-minute daily goal met.')).toBeTruthy();
  });

  it('rejects a completely blank save and invalid workout duration without calling RPC', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    saveDaily();
    expect(await screen.findByText('Answer at least one part of the daily check-in.')).toBeTruthy();
    expect(mockRpcCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '1441' } });
    saveDaily();
    expect(await screen.findByText('Enter workout duration in whole minutes from 1 to 1440.')).toBeTruthy();
    expect(mockRpcCalls).toHaveLength(0);
  });

  it('can clear both check-in answers while retaining symptoms', async () => {
    mockSetTableData('zepbound_symptom_logs', [symptom('custom', '2026-07-17', 'Body soreness', 5, 'Legacy custom')]);
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', true, 45, false)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Workout answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Pooped answer' }));
    saveDaily();
    await waitFor(() => expectOnlyUnifiedRpc({
      p_log_date: '2026-07-17',
      p_symptoms: [{ symptom_type: 'Body soreness', severity: 5, notes: 'Legacy custom' }],
      p_worked_out: null, p_workout_duration_minutes: null, p_pooped: null,
    }));
  });

  it('retains the complete draft after RPC failure', async () => {
    mockSetRpcError(new Error('rolled back'));
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fatigue' }));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Keep all of this' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped No' }));
    saveDaily();

    expect(await screen.findByText(/Your changes are still here/)).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Fatigue' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Keep all of this');
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('35');
    expect(screen.getByRole('radio', { name: 'Pooped No' }).getAttribute('aria-checked')).toBe('true');
    expect(mockRpcCalls).toHaveLength(1);
  });

  it('cancel/reopen and date switching hydrate the complete selected date', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('custom', '2026-07-17', 'Legacy custom symptom', 5, 'First'),
      symptom('other', '2026-07-18', 'Reflux', 2, 'Second'),
    ]);
    mockSetTableData('zepbound_daily_checkins', [
      checkin('first', '2026-07-17', true, 30, false),
      checkin('second', '2026-07-18', false, null, true),
    ]);
    const { rerender } = render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    expect(screen.getByRole('checkbox', { name: 'Legacy custom symptom' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit daily check-in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit daily check-in' }));
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('First');

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 18)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit daily check-in' }));
    expect(screen.getByRole('checkbox', { name: 'Reflux' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('checkbox', { name: 'Legacy custom symptom' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Workout No' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Pooped Yes' }).getAttribute('aria-checked')).toBe('true');
  });

  it('stores a midnight shot on the selected date', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Log shot' }));
    setShotTime('12', '00', 'AM');
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    await waitFor(() => expect(lastInjectionInsert()?.values).toEqual(expect.objectContaining({
      injection_date: '2026-07-17', injection_time: '00:00',
    })));
  });

  it('sends optional injection site and notes with the shot payload', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Log shot' }));
    fireEvent.click(screen.getByText(/Optional details/));
    fireEvent.click(screen.getByRole('radio', { name: 'Thigh' }));
    fireEvent.change(screen.getByLabelText('Shot notes'), { target: { value: ' Left side ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    await waitFor(() => expect(lastInjectionInsert()?.values).toEqual(expect.objectContaining({
      injection_site: 'thigh', notes: 'Left side',
    })));
  });

  it('rejects an invalid shot time before any write', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Log shot' }));
    setShotTime('13', '00', 'AM');
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    expect(await screen.findByText(/Choose a valid shot time/)).toBeTruthy();
    expect(lastInjectionInsert()).toBeUndefined();
  });

  it('accepts a symptom dated before the first shot through the association-safe RPC', async () => {
    mockSetTableData('zepbound_injections', [injection('future', '2026-07-18')]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nausea' }));
    saveDaily();
    await waitFor(() => expect(mockRpcCalls[0]).toEqual(expect.objectContaining({
      functionName: 'save_zepbound_daily_log',
      args: expect.objectContaining({ p_log_date: '2026-07-17' }),
    })));
  });

  it('preserves a dirty daily draft through a separate shot save and refetch', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fatigue' }));
    fireEvent.change(screen.getByLabelText('Symptom notes'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Workout Yes' }));
    fireEvent.change(screen.getByLabelText('Workout duration minutes'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Log shot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    await waitFor(() => expect(lastInjectionInsert()).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '+ Daily check-in' }));
    expect(screen.getByRole('checkbox', { name: 'Fatigue' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Symptom notes').getAttribute('value')).toBe('Keep this draft');
    expect(screen.getByLabelText('Workout duration minutes').getAttribute('value')).toBe('35');
  });

  it('shows a safe Home fallback for malformed workout history', async () => {
    mockSetTableData('zepbound_daily_checkins', [checkin('bad', '2026-07-17', true, null, true)]);
    render(<DailyZepboundLogCard date={DATE} />);
    expect(await screen.findByText('Workout: logged, duration unavailable')).toBeTruthy();
    expect(screen.queryByText(/Workout: 0 min/)).toBeNull();
  });

  it('clears only the workout answer and duration', async () => {
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', true, 45, false)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Workout answer' }));
    saveDaily();
    await waitFor(() => expect(mockRpcCalls[0]?.args).toEqual(expect.objectContaining({
      p_worked_out: null, p_workout_duration_minutes: null, p_pooped: false,
    })));
  });

  it('clears only the pooped answer while retaining workout status', async () => {
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', false, null, true)]);
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Pooped answer' }));
    saveDaily();
    await waitFor(() => expect(mockRpcCalls[0]?.args).toEqual(expect.objectContaining({
      p_worked_out: false, p_workout_duration_minutes: null, p_pooped: null,
    })));
  });

  it('reports a committed save with refresh warning instead of a database failure', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nausea' }));
    mockSetTableError('zepbound_symptom_logs', new Error('offline after commit'));
    saveDaily();
    expect(await screen.findByText(/Saved successfully, but history could not refresh/)).toBeTruthy();
    expect(screen.queryByText(/Could not save the daily check-in/)).toBeNull();
    expect(mockRpcCalls).toHaveLength(1);
  });

  it('does not let an old date save completion close or mark the new date form', async () => {
    let resolveRpc!: (value: { data: null; error: null }) => void;
    mockSetRpcPromise(new Promise((resolve) => { resolveRpc = resolve; }));
    const { rerender } = render(<DailyZepboundLogCard date={DATE} />);
    await openDaily();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nausea' }));
    saveDaily();
    await waitFor(() => expect(mockRpcCalls).toHaveLength(1));

    rerender(<DailyZepboundLogCard date={new Date(2026, 6, 18)} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Daily check-in' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Pooped No' }));
    await act(async () => { resolveRpc({ data: null, error: null }); });

    expect(screen.getByText('Daily Zepbound check-in · Jul 18')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Pooped No' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText(/Could not save|Saved successfully/)).toBeNull();
  });

  it('keeps shot save separate and unchanged', async () => {
    render(<DailyZepboundLogCard date={DATE} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Log shot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save shot' }));
    await waitFor(() => expect(mockDatabaseWrites).toContainEqual(expect.objectContaining({
      table: 'zepbound_injections', operation: 'insert',
    })));
    expect(mockRpcCalls).toHaveLength(0);
  });
});

describe('Zepbound health history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetZepboundData();
  });

  it('remains read-only and displays shots, symptoms, workout, and pooped', async () => {
    mockSetTableData('zepbound_injections', [injection('shot', '2026-07-17')]);
    mockSetTableData('zepbound_symptom_logs', [symptom('symptom', '2026-07-17', 'Nausea', 4)]);
    mockSetTableData('zepbound_daily_checkins', [checkin('daily', '2026-07-17', true, 25, true)]);
    render(<ZepboundTrackerCard />);
    expect(await screen.findByText('Nausea · 4/5')).toBeTruthy();
    expect(screen.getByText('2026-07-17 · Workout 25 min · Pooped Yes')).toBeTruthy();
    expect(screen.queryByText('Save daily check-in')).toBeNull();
    expect(screen.queryByText('+ Log shot')).toBeNull();
  });

  it('retains symptoms associated with older shots and unassociated before-first-shot history', async () => {
    mockSetTableData('zepbound_injections', [
      injection('new-shot', '2026-07-17'),
      injection('old-shot', '2026-05-27'),
    ]);
    mockSetTableData('zepbound_symptom_logs', [
      { ...symptom('older', '2026-05-28', 'Older-shot nausea'), injection_id: 'old-shot' },
      symptom('before', '2026-05-20', 'Before-first headache'),
    ]);
    render(<ZepboundTrackerCard />);
    expect(await screen.findByText('Older-shot nausea · 3/5')).toBeTruthy();
    expect(screen.getByText('Before-first headache · 3/5')).toBeTruthy();
    expect(screen.getByText('Other symptom entries')).toBeTruthy();
    expect(screen.queryByText('Save daily check-in')).toBeNull();
  });

  it('uses a safe malformed-workout fallback in Health history', async () => {
    mockSetTableData('zepbound_daily_checkins', [checkin('bad', '2026-07-17', true, null, false)]);
    render(<ZepboundTrackerCard />);
    expect(await screen.findByText('2026-07-17 · Workout: logged, duration unavailable · Pooped No')).toBeTruthy();
    expect(screen.queryByText(/Workout null min/)).toBeNull();
  });

  it('wraps long names and notes in associated and unassociated Health layouts', async () => {
    const longName = 'ExtremelyLongUnbrokenZepboundSymptomNameThatMustWrapOnIPhone';
    const longNotes = 'A complete meaningful health note that must remain visible and wrap instead of being truncated or leaving the frame.';
    mockSetTableData('zepbound_injections', [injection('shot', '2026-07-17')]);
    mockSetTableData('zepbound_symptom_logs', [
      { ...symptom('associated', '2026-07-17', longName, 4, longNotes), injection_id: 'shot' },
      symptom('unassociated', '2026-07-16', longName, 3, longNotes),
    ]);
    render(<ZepboundTrackerCard />);
    for (const id of ['associated', 'unassociated']) {
      const content = await screen.findByTestId(`zepbound-health-symptom-content-${id}`);
      expect(getComputedStyle(content).flexShrink).toBe('1');
      expect(getComputedStyle(content).minWidth).toBe('0px');
    }
    expect(screen.getAllByText(longNotes)).toHaveLength(2);
  });

  it('shows Indigestion and Fullness as separate wrapping history rows', async () => {
    mockSetTableData('zepbound_symptom_logs', [
      symptom('indigestion', '2026-07-17', 'Indigestion', 2),
      symptom('fullness', '2026-07-17', 'Fullness', 4),
    ]);
    render(<ZepboundTrackerCard />);
    expect(await screen.findByText('Indigestion · 2/5')).toBeTruthy();
    expect(screen.getByText('Fullness · 4/5')).toBeTruthy();
    for (const id of ['indigestion', 'fullness']) {
      const content = screen.getByTestId(`zepbound-health-symptom-content-${id}`);
      expect(getComputedStyle(content).flexShrink).toBe('1');
      expect(getComputedStyle(content).minWidth).toBe('0px');
    }
  });
});
