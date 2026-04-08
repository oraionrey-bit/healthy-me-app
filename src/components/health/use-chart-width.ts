import { useWindowDimensions } from 'react-native';
import { Spacing } from '../../constants/theme';

const MAX_APP_WIDTH = 430;
const SCREEN_PADDING = Spacing.lg; // from ScreenWrapper
const CARD_PADDING = Spacing.md; // from HealthCard
const BORDER_WIDTH = 4; // card left border
const Y_AXIS_WIDTH = 50; // space for y-axis labels like "2000"

/** Returns the chart width accounting for screen padding, card padding, border, and y-axis. */
export function useChartWidth(): number {
  const { width } = useWindowDimensions();
  const computed = Math.min(width, MAX_APP_WIDTH) - SCREEN_PADDING * 2 - CARD_PADDING * 2 - BORDER_WIDTH - Y_AXIS_WIDTH;
  return Math.max(computed, 50); // Prevent negative SVG width errors
}
