import { Platform } from 'react-native';

export interface FoodEntry {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  photos: string[]; // base64 data URIs (web only for now)
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  status: 'pending' | 'analyzed';
  createdAt: string;
}

function getStorage() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

export function getFoodEntries(date: string): FoodEntry[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const data = storage.getItem(`hm-food-${date}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFoodEntry(date: string, entry: FoodEntry): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const entries = getFoodEntries(date);
    entries.push(entry);
    storage.setItem(`hm-food-${date}`, JSON.stringify(entries));
  } catch {}
}

export function deleteFoodEntry(date: string, entryId: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const entries = getFoodEntries(date).filter(e => e.id !== entryId);
    storage.setItem(`hm-food-${date}`, JSON.stringify(entries));
  } catch {}
}

export function updateFoodEntry(date: string, entryId: string, updates: Partial<FoodEntry>): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const entries = getFoodEntries(date).map(e =>
      e.id === entryId ? { ...e, ...updates } : e
    );
    storage.setItem(`hm-food-${date}`, JSON.stringify(entries));
  } catch {}
}

// Generate a simple unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Get YYYY-MM-DD string
export function toDateKey(date: Date): string {
  // Use local date to avoid UTC timezone shift
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Checklist storage
export interface ChecklistState {
  [key: string]: boolean;
}

export function getChecklist(date: string): ChecklistState {
  try {
    const storage = getStorage();
    if (!storage) return {};
    const data = storage.getItem(`hm-checklist-${date}`);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveChecklist(date: string, state: ChecklistState): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(`hm-checklist-${date}`, JSON.stringify(state));
  } catch {}
}
