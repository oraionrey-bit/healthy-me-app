/**
 * Calf Tracker Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { CalfTrackerCard } from '../components/home/calf-tracker-card';

describe('CalfTrackerCard', () => {
  it('renders title', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Calf Recovery/)).toBeTruthy();
    });
  });

  it('shows compression socks checkbox', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText('Wore compression socks')).toBeTruthy();
    });
  });

  it('shows calf sleeves checkbox', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText('Wore calf sleeves')).toBeTruthy();
    });
  });

  it('shows stretch tracker with goal', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText('Achilles Stretching')).toBeTruthy();
      expect(screen.getByText('0/60 min')).toBeTruthy();
    });
  });

  it('shows quick-add stretch buttons', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText('+10m')).toBeTruthy();
      expect(screen.getByText('+15m')).toBeTruthy();
      expect(screen.getByText('+20m')).toBeTruthy();
      expect(screen.getByText('+30m')).toBeTruthy();
    });
  });

  it('shows progress count', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText('0/3 done')).toBeTruthy();
    });
  });

  it('shows expandable section toggle', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Measurements & Notes/)).toBeTruthy();
    });
  });

  it('expands to show measurement button', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Measurements & Notes/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/Measurements & Notes/));
    await waitFor(() => {
      expect(screen.getByText(/Record Measurement/)).toBeTruthy();
    });
  });

  it('shows measurement form when button clicked', async () => {
    render(<CalfTrackerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Measurements & Notes/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/Measurements & Notes/));
    await waitFor(() => {
      expect(screen.getByText(/Record Measurement/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/Record Measurement/));
    await waitFor(() => {
      expect(screen.getByText('Left Calf (cm)')).toBeTruthy();
      expect(screen.getByText('Right Calf (cm)')).toBeTruthy();
      expect(screen.getByText(/Ankle Flexion/)).toBeTruthy();
    });
  });
});
