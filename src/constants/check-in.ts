/**
 * Shared option arrays for the Home Daily Check-in card and its summary view.
 * Extracted from src/app/(tabs)/index.tsx during the May 7 component split.
 */
import type { SymptomType } from '../types/database';

export const MOOD_OPTIONS: Array<{ value: number; emoji: string }> = [
  { value: 1, emoji: '😢' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😊' },
];

export const ENERGY_OPTIONS: Array<{ value: number; emoji: string }> = [
  { value: 1, emoji: '🪫' },
  { value: 2, emoji: '😴' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '⚡' },
  { value: 5, emoji: '🔋' },
];

export const PERIOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
  { value: 'spotting', label: 'Spotting' },
];

export const SYMPTOM_OPTIONS: Array<{ type: SymptomType; label: string }> = [
  { type: 'stomach', label: 'Stomach' },
  { type: 'histamine', label: 'Histamine' },
  { type: 'headache', label: 'Headache' },
  { type: 'bloating', label: 'Bloating' },
  { type: 'acne', label: 'Acne' },
  { type: 'cramps', label: 'Cramps' },
  { type: 'brain_fog', label: 'Brain Fog' },
  { type: 'fatigue', label: 'Fatigue' },
  { type: 'irritated', label: 'Irritated' },
  { type: 'anxiety', label: 'Anxiety' },
  { type: 'other', label: 'Other' },
];
