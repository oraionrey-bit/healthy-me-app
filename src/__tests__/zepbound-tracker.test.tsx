import React from 'react';
import { fireEvent, render, screen, waitFor } from './test-utils';
import { ZepboundTrackerCard } from '../components/health/zepbound-tracker-card';
import { DailyZepboundStatusCard } from '../components/home/daily-zepbound-status-card';

describe('ZepboundTrackerCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps shot and symptom tracking in a dedicated section', async () => {
    render(<ZepboundTrackerCard />);
    await waitFor(() => expect(screen.getByText('💉 Zepbound')).toBeTruthy());
    expect(screen.getByText('+ Log shot')).toBeTruthy();
    expect(screen.getByText('+ Log symptom')).toBeTruthy();
  });

  it('collects weekly shot date, time, dose, site, and notes', async () => {
    render(<ZepboundTrackerCard />);
    fireEvent.click(screen.getByText('+ Log shot'));
    expect(screen.getByText('Dose (mg)')).toBeTruthy();
    expect(screen.getByLabelText('Shot date')).toBeTruthy();
    expect(screen.getByLabelText('Shot time')).toBeTruthy();
    expect(screen.getByText('Injection site')).toBeTruthy();
    expect(screen.getByLabelText('Shot notes')).toBeTruthy();
  });

  it('collects symptom, severity, date, time, and notes', async () => {
    render(<ZepboundTrackerCard />);
    fireEvent.click(screen.getByText('+ Log symptom'));
    expect(screen.getByText('Symptom')).toBeTruthy();
    expect(screen.getByText('Severity')).toBeTruthy();
    expect(screen.getByLabelText('Symptom date')).toBeTruthy();
    expect(screen.getByLabelText('Symptom time')).toBeTruthy();
    expect(screen.getByLabelText('Symptom notes')).toBeTruthy();
  });
});

describe('DailyZepboundStatusCard', () => {
  it('surfaces daily status without duplicating entry controls', async () => {
    render(<DailyZepboundStatusCard date={new Date(2026, 6, 15)} />);
    await waitFor(() => expect(screen.getByText('Open tracker ›')).toBeTruthy());
    expect(screen.getByText('Shots and related symptoms are entered once in Health.')).toBeTruthy();
    expect(screen.queryByText('+ Log shot')).toBeNull();
  });
});
