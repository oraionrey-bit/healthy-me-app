/**
 * Supabase Database Types
 * Auto-generate with: supabase gen types typescript --local > src/types/database.ts
 * These are placeholder types until Supabase project is created.
 */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string };
        Update: Partial<UserProfile>;
      };
      food_logs: {
        Row: FoodLog;
        Insert: Omit<FoodLog, 'id' | 'created_at'>;
        Update: Partial<FoodLog>;
      };
      water_logs: {
        Row: WaterLog;
        Insert: Omit<WaterLog, 'id'>;
        Update: Partial<WaterLog>;
      };
      supplement_logs: {
        Row: SupplementLog;
        Insert: Omit<SupplementLog, 'id'>;
        Update: Partial<SupplementLog>;
      };
      user_supplements: {
        Row: UserSupplement;
        Insert: Omit<UserSupplement, 'id' | 'created_at'>;
        Update: Partial<UserSupplement>;
      };
      exercise_logs: {
        Row: ExerciseLog;
        Insert: Omit<ExerciseLog, 'id' | 'created_at'>;
        Update: Partial<ExerciseLog>;
      };
      health_labs: {
        Row: HealthLab;
        Insert: Omit<HealthLab, 'id' | 'created_at'>;
        Update: Partial<HealthLab>;
      };
      weight_logs: {
        Row: WeightLog;
        Insert: Omit<WeightLog, 'id' | 'created_at'>;
        Update: Partial<WeightLog>;
      };
      symptoms: {
        Row: Symptom;
        Insert: Omit<Symptom, 'id' | 'created_at'>;
        Update: Partial<Symptom>;
      };
      symptom_logs: {
        Row: SymptomLog;
        Insert: Omit<SymptomLog, 'id' | 'created_at'>;
        Update: Partial<SymptomLog>;
      };
      period_logs: {
        Row: PeriodLog;
        Insert: Omit<PeriodLog, 'id' | 'created_at'>;
        Update: Partial<PeriodLog>;
      };
      daily_logs: {
        Row: DailyLog;
        Insert: Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<DailyLog>;
      };
      skin_photos: {
        Row: SkinPhoto;
        Insert: Omit<SkinPhoto, 'id' | 'created_at'>;
        Update: Partial<SkinPhoto>;
      };
      daily_scores: {
        Row: DailyScore;
        Insert: Omit<DailyScore, 'id'>;
        Update: Partial<DailyScore>;
      };
      oura_daily: {
        Row: OuraDaily;
        Insert: Omit<OuraDaily, 'id' | 'created_at'>;
        Update: Partial<OuraDaily>;
      };
      oura_workouts: {
        Row: OuraWorkout;
        Insert: Omit<OuraWorkout, 'synced_at'>;
        Update: Partial<OuraWorkout>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ChatMessage>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Row types

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  pcos_type: 'insulin_resistant' | 'post_pill' | 'inflammatory' | 'adrenal' | 'unsure' | null;
  date_of_birth: string | null;
  age: number | null;
  height_cm: number | null;
  current_weight: number | null;
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  water_target: number;
  goal_weight: number | null;
  weight_unit: 'lbs' | 'kg';
  pet_choice: string;
  pet_name: string | null;
  onboarding_complete: boolean;
  push_token: string | null;
  notification_supplements_time: string;
  notification_lunch_time: string;
  notification_dinner_time: string;
  notification_checkin_time: string;
  notifications_enabled: boolean;
  timezone: string;
  oura_access_token: string | null;
  oura_refresh_token: string | null;
  oura_connected: boolean;
}

export interface FoodLog {
  id: string;
  user_id: string;
  created_at: string;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  ai_analyzed: boolean;
  ai_confidence: number | null;
  ai_pcos_notes: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  user_edited: boolean;
  notes: string | null;
}

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  glasses: number;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  user_supplement_id: string;
  log_date: string;
  taken: boolean;
  taken_at: string | null;
  notes: string | null;
}

export interface UserSupplement {
  id: string;
  user_id: string;
  created_at: string;
  supplement_name: string;
  dosage: string | null;
  frequency: string;
  time_of_day: string;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  created_at: string;
  log_date: string;
  exercise_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: 'low' | 'moderate' | 'high' | null;
  sleep_score: number | null;
  activity_score: number | null;
  steps: number | null;
  notes: string | null;
}

export interface HealthLab {
  id: string;
  user_id: string;
  created_at: string;
  test_date: string;
  test_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  is_flagged: boolean;
  notes: string | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  created_at: string;
  log_date: string;
  weight: number;
  notes: string | null;
}

export interface Symptom {
  id: string;
  user_id: string;
  created_at: string;
  log_date: string;
  bloating: number;
  acne: number;
  hair_loss: number;
  hirsutism: number;
  fatigue: number;
  brain_fog: number;
  cravings: number;
  anxiety: number;
  mood: number | null;
  energy_level: number | null;
  notes: string | null;
}

export interface PeriodLog {
  id: string;
  user_id: string;
  created_at: string;
  log_date: string;
  flow: 'spotting' | 'light' | 'medium' | 'heavy' | null;
  cramps: number;
  headache: boolean;
  back_pain: boolean;
  notes: string | null;
}

export interface SkinPhoto {
  id: string;
  user_id: string;
  created_at: string;
  photo_date: string;
  photo_url: string;
  angle: 'front' | 'left' | 'right' | 'other' | null;
  acne_severity: number | null;
  notes: string | null;
}

export interface DailyScore {
  id: string;
  user_id: string;
  score_date: string;
  food_score: number;
  supplement_score: number;
  exercise_score: number;
  water_score: number;
  sleep_score: number;
  total_score: number;
  calories_consumed: number;
  protein_consumed: number;
  carbs_consumed: number;
  fat_consumed: number;
}

export interface SymptomLog {
  id: string;
  user_id: string;
  symptom_type: string;
  severity: number;
  notes: string | null;
  triggers: string | null;
  log_date: string;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  exercise: string | null;
  mood: string | null;
  period: string | null;
  health_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SymptomType =
  | 'stomach'
  | 'histamine'
  | 'headache'
  | 'bloating'
  | 'acne'
  | 'cramps'
  | 'brain_fog'
  | 'fatigue'
  | 'anxiety'
  | 'other';

export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export interface OuraDaily {
  id: string;
  user_id: string;
  log_date: string;
  sleep_score: number | null;
  readiness_score: number | null;
  activity_score: number | null;
  hrv_average: number | null;
  resting_hr: number | null;
  temperature_deviation: number | null;
  total_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  low_activity_minutes: number | null;
  medium_activity_minutes: number | null;
  high_activity_minutes: number | null;
  sedentary_minutes: number | null;
  equivalent_walking_distance: number | null;
  non_wear_minutes: number | null;
  resting_minutes: number | null;
  created_at: string;
}

export interface OuraWorkout {
  id: string;
  user_id: string;
  log_date: string;
  activity_type: string | null;
  calories: number | null;
  distance_meters: number | null;
  duration_minutes: number | null;
  intensity: string | null;
  label: string | null;
  start_time: string | null;
  end_time: string | null;
  source: string | null;
  synced_at: string;
}

export type ChatMessageDirection = 'user' | 'oraion';
export type ChatMessageType = 'chat' | 'food_analysis' | 'skin_analysis' | 'supplement_check' | 'lab_analysis' | 'menu_analysis' | 'fridge_analysis';
export type ChatMessageStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface FoodAnalysis {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  pcos_notes?: string;
  items?: string[];
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  direction: ChatMessageDirection;
  content: string | null;
  photo_urls: string[] | null;
  analysis: FoodAnalysis | Record<string, unknown> | null;
  message_type: ChatMessageType;
  status: ChatMessageStatus;
  created_at: string;
  updated_at: string;
}
