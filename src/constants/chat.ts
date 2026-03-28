/**
 * Oraion Chat Tunnel constants
 */

export const CHAT_RELAY_URL = 'https://chat.withluna.dev';

export const ANALYSIS_TYPES = [
  { key: 'food_analysis', label: 'Food', emoji: '🍽️' },
  { key: 'skin_analysis', label: 'Skin', emoji: '🧴' },
  { key: 'supplement_check', label: 'Supplement', emoji: '💊' },
  { key: 'lab_analysis', label: 'Lab', emoji: '🔬' },
  { key: 'menu_analysis', label: 'Menu', emoji: '📋' },
  { key: 'fridge_analysis', label: 'Fridge', emoji: '🥕' },
] as const;

export type AnalysisTypeKey = (typeof ANALYSIS_TYPES)[number]['key'];
