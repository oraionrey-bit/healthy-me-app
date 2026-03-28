/**
 * Test utilities — provides real component wrappers with auth context.
 * Uses @testing-library/react (web) since this is an Expo Web app.
 * Mocks Supabase at the module level. Components render for real.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

// ── Mock data for Supabase tables ──

const mockProfileData = {
  id: 'test-user-id',
  display_name: 'Tina',
  email: 'tina@test.com',
  pcos_type: 'insulin_resistant',
  age: 28,
  height_cm: 163,
  current_weight: 135,
  calorie_target: 1500,
  protein_target: 80,
  carb_target: 150,
  fat_target: 50,
  water_target: 8,
  goal_weight: 125,
  weight_unit: 'lbs',
  pet_choice: 'cat',
  pet_name: 'Luna',
  onboarding_complete: true,
  push_token: null,
  notification_supplements_time: '08:00',
  notification_lunch_time: '12:00',
  notification_dinner_time: '18:00',
  notification_checkin_time: '21:00',
  notifications_enabled: false,
  timezone: 'America/Los_Angeles',
  avatar_url: null,
  date_of_birth: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockSupplementsData = [
  { id: 'sup-1', user_id: 'test-user-id', supplement_name: 'Ovasitol (AM)', dosage: '1 scoop', frequency: 'daily', time_of_day: 'morning', notes: null, is_active: true, sort_order: 0, created_at: '2026-01-01' },
  { id: 'sup-2', user_id: 'test-user-id', supplement_name: 'NAC', dosage: '500mg', frequency: 'daily', time_of_day: 'morning', notes: null, is_active: true, sort_order: 2, created_at: '2026-01-01' },
  { id: 'sup-3', user_id: 'test-user-id', supplement_name: 'Ovasitol (PM)', dosage: '1 scoop', frequency: 'daily', time_of_day: 'evening', notes: null, is_active: true, sort_order: 4, created_at: '2026-01-01' },
];

// Must prefix with 'mock' to be accessible inside jest.mock factory
function mockCreateTable(table: string) {
  const mockTableData: Record<string, any[]> = {
    user_profiles: [mockProfileData],
    user_supplements: mockSupplementsData,
    supplement_logs: [],
    food_logs: [],
    exercise_logs: [],
    daily_scores: [],
    daily_logs: [],
    symptom_logs: [],
    weight_logs: [],
    period_logs: [],
  };

  const data = mockTableData[table] ?? [];

  const builder: any = {};
  builder.select = jest.fn(() => builder);
  builder.insert = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);
  builder.upsert = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.neq = jest.fn(() => builder);
  builder.gte = jest.fn(() => builder);
  builder.lte = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.single = jest.fn(() => Promise.resolve({ data: data[0] ?? null, error: null }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ data: data[0] ?? null, error: null }));
  // Thenable for queries without .single()
  builder.then = (resolve: any, reject?: any) =>
    Promise.resolve({ data, error: null }).then(resolve, reject);

  return builder;
}

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'test-user-id', email: 'tina@test.com' },
              access_token: 'test-token',
            },
          },
          error: null,
        }),
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithOtp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    from: jest.fn((table: string) => mockCreateTable(table)),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.com/photo.jpg' } })),
      })),
    },
  },
}));

// Mock auth context to provide user directly
jest.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'tina@test.com' },
    session: { user: { id: 'test-user-id', email: 'tina@test.com' }, access_token: 'test-token' },
    loading: false,
    signIn: jest.fn(() => Promise.resolve({ error: null })),
    signOut: jest.fn(() => Promise.resolve()),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** Custom render — no extra providers needed for web */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { customRender as render };
