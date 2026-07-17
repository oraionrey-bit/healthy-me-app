import React from 'react';
import {
  act,
  fireEvent,
  mockDatabaseWrites,
  mockRpcCalls,
  mockResetZepboundData,
  mockSetRpcError,
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
