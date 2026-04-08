/**
 * Skin Dashboard Tests
 *
 * Tests the Routine Insights and Tester Performance cards
 * that appear in the Routine tab of the Skin screen.
 */
import React from 'react';
import { render, screen, fireEvent } from './test-utils';
import { RoutineInsightsCard } from '../components/skin/routine-insights-card';
import { TesterPerformanceCard } from '../components/skin/tester-performance-card';
import type { TesterSummary } from '../hooks/use-skincare';

// ── RoutineInsightsCard ──

describe('RoutineInsightsCard', () => {
  it('renders title', () => {
    render(
      <RoutineInsightsCard amAdherence={0} pmAdherence={0} streak={0} mostSkippedStep={null} />
    );
    expect(screen.getByText(/How It.s Going/)).toBeTruthy();
  });

  it('displays AM and PM adherence percentages', () => {
    render(
      <RoutineInsightsCard amAdherence={71} pmAdherence={43} streak={0} mostSkippedStep={null} />
    );
    expect(screen.getByText('71%')).toBeTruthy();
    expect(screen.getByText('43%')).toBeTruthy();
  });

  it('shows streak count when streak > 0', () => {
    render(
      <RoutineInsightsCard amAdherence={100} pmAdherence={100} streak={5} mostSkippedStep={null} />
    );
    expect(screen.getByText(/5 day streak/)).toBeTruthy();
  });

  it('shows "No streak yet" when streak is 0', () => {
    render(
      <RoutineInsightsCard amAdherence={50} pmAdherence={50} streak={0} mostSkippedStep={null} />
    );
    expect(screen.getByText('No streak yet')).toBeTruthy();
  });

  it('shows most skipped step when provided', () => {
    render(
      <RoutineInsightsCard amAdherence={50} pmAdherence={50} streak={0} mostSkippedStep="Goodal Heartleaf SPF" />
    );
    expect(screen.getByText(/Most skipped.*Goodal Heartleaf SPF/)).toBeTruthy();
  });

  it('hides most skipped when null', () => {
    render(
      <RoutineInsightsCard amAdherence={50} pmAdherence={50} streak={0} mostSkippedStep={null} />
    );
    expect(screen.queryByText(/Most skipped/)).toBeNull();
  });

  it('renders AM and PM labels', () => {
    render(
      <RoutineInsightsCard amAdherence={80} pmAdherence={60} streak={0} mostSkippedStep={null} />
    );
    expect(screen.getByText('☀️ AM')).toBeTruthy();
    expect(screen.getByText('🌙 PM')).toBeTruthy();
  });
});

// ── TesterPerformanceCard ──

describe('TesterPerformanceCard', () => {
  const mockTester: TesterSummary = {
    productId: 'p7',
    productName: 'Madeca Cream',
    dayCount: 12,
    last7Days: ['good', 'good', 'neutral', 'good', 'none', 'good', 'good'],
    goodPercent: 80,
    badPercent: 0,
    totalLogs: 10,
    suggestion: 'consider-safe',
  };

  const badTester: TesterSummary = {
    productId: 'p99',
    productName: 'Problem Serum',
    dayCount: 6,
    last7Days: ['bad', 'bad', 'neutral', 'bad', 'none', 'bad', 'neutral'],
    goodPercent: 0,
    badPercent: 67,
    totalLogs: 6,
    suggestion: 'consider-trigger',
  };

  it('renders title', () => {
    render(<TesterPerformanceCard testers={[]} />);
    expect(screen.getByText('🧪 Tester Performance')).toBeTruthy();
  });

  it('shows empty state when no testers', () => {
    render(<TesterPerformanceCard testers={[]} />);
    expect(screen.getByText('No products being tested')).toBeTruthy();
  });

  it('renders tester product name and day count', () => {
    render(<TesterPerformanceCard testers={[mockTester]} />);
    expect(screen.getByText('Madeca Cream')).toBeTruthy();
    expect(screen.getByText('Day 12')).toBeTruthy();
  });

  it('shows log count', () => {
    render(<TesterPerformanceCard testers={[mockTester]} />);
    expect(screen.getByText('10 logs')).toBeTruthy();
  });

  it('shows "consider safe" suggestion for good testers', () => {
    render(<TesterPerformanceCard testers={[mockTester]} onMarkSafe={() => {}} />);
    expect(screen.getByText(/mark safe/i)).toBeTruthy();
  });

  it('shows "consider trigger" suggestion for bad testers', () => {
    render(<TesterPerformanceCard testers={[badTester]} onMarkTrigger={() => {}} />);
    expect(screen.getByText(/mark trigger/i)).toBeTruthy();
  });

  it('calls onMarkSafe when suggestion is tapped', () => {
    const onMarkSafe = jest.fn();
    render(<TesterPerformanceCard testers={[mockTester]} onMarkSafe={onMarkSafe} />);
    fireEvent.click(screen.getByText(/mark safe/i));
    expect(onMarkSafe).toHaveBeenCalledWith('p7');
  });

  it('calls onMarkTrigger when suggestion is tapped', () => {
    const onMarkTrigger = jest.fn();
    render(<TesterPerformanceCard testers={[badTester]} onMarkTrigger={onMarkTrigger} />);
    fireEvent.click(screen.getByText(/mark trigger/i));
    expect(onMarkTrigger).toHaveBeenCalledWith('p99');
  });

  it('renders multiple testers', () => {
    render(<TesterPerformanceCard testers={[mockTester, badTester]} />);
    expect(screen.getByText('Madeca Cream')).toBeTruthy();
    expect(screen.getByText('Problem Serum')).toBeTruthy();
  });

  it('shows last 7 days reaction emojis', () => {
    render(<TesterPerformanceCard testers={[mockTester]} />);
    // Should have emoji characters rendered
    const thumbsUp = screen.getAllByText('👍');
    expect(thumbsUp.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show suggestion when null', () => {
    const noSuggestion: TesterSummary = { ...mockTester, suggestion: null };
    render(<TesterPerformanceCard testers={[noSuggestion]} />);
    expect(screen.queryByText(/mark safe/i)).toBeNull();
    expect(screen.queryByText(/mark trigger/i)).toBeNull();
  });
});
