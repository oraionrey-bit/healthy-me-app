import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useHealthTrends } from '../../hooks/use-health-trends';
import { usePeriodCalendar } from '../../hooks/use-period-calendar';
import { useUserProfile } from '../../hooks/use-user-profile';
import { TimeRangeSelector } from './time-range-selector';
import { NutritionTrend } from './nutrition-trend';
import { PeriodCalendarCard } from './period-calendar-card';
import { SymptomFrequencyCard } from './symptom-frequency';
import { WeightTrend } from './weight-trend';
import { SupplementStreakCard } from './supplement-streak-card';
import { SupplementTracker } from './supplement-tracker';
import { LabDashboard } from './lab-dashboard';
import { ZepboundTrackerCard } from './zepbound-tracker-card';

export function HealthDashboard() {
  const { nutrition, symptomFrequency, weight, loading, range, setRange } =
    useHealthTrends();
  const {
    periodLogs,
    currentMonth,
    selectedDate,
    setSelectedDate,
    setCurrentMonth,
    saving: periodSaving,
    savePeriodLog,
    deletePeriodLog,
  } = usePeriodCalendar();
  const { calorieTarget, profile } = useUserProfile();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>HEALTH</Text>
      <TimeRangeSelector range={range} onRangeChange={setRange} />
      <NutritionTrend data={nutrition} calorieTarget={calorieTarget} range={range} />
      <PeriodCalendarCard
        periodLogs={periodLogs}
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        saving={periodSaving}
        onMonthChange={setCurrentMonth}
        onDayPress={setSelectedDate}
        onSave={savePeriodLog}
        onDelete={deletePeriodLog}
      />
      <View style={styles.sectionSpacing}>
        <ZepboundTrackerCard />
      </View>
      <View style={styles.sectionSpacing}>
        <SupplementTracker />
      </View>
      <View style={styles.sectionSpacing}>
        <SupplementStreakCard />
      </View>
      <View style={styles.sectionSpacing}>
        <SymptomFrequencyCard data={symptomFrequency} />
      </View>
      <View style={styles.sectionSpacing}>
        <LabDashboard />
      </View>
      <View style={styles.sectionSpacing}>
        <WeightTrend data={weight} range={range} unit={profile?.weight_unit ?? 'lbs'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  sectionSpacing: {
    marginTop: Spacing.lg,
  },
});
