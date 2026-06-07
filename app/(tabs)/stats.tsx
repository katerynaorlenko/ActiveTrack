import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Workout = {
  id: string;
  title: string;
  exercises: unknown[];
};

type CompletedWorkout = {
  id: string;
  workoutId: string;
  workoutTitle: string;
  completedAt: string;
  exercisesCount: number;
  durationMinutes?: number;
  feeling?: string;
};

type StatCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

const WORKOUTS_STORAGE_KEY = "activeTrack_workouts";
const HISTORY_STORAGE_KEY = "activeTrack_completed_history";
const WEEKLY_GOAL = 4;

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getDateKey = (dateString: string) => {
  const date = startOfDay(new Date(dateString));
  return date.toISOString().split("T")[0];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatCard({
  label,
  value,
  unit,
  icon,
  iconColor,
  iconBackground,
}: StatCardProps) {
  return (
    <View style={styles.smallCard}>
      <View style={[styles.smallCardIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={styles.smallCardTextBlock}>
        <Text style={styles.cardLabel}>{label}</Text>

        <View style={styles.valueRow}>
          <Text style={styles.cardNumber}>{value}</Text>

          {unit ? <Text style={styles.cardUnit}>{unit}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [completedHistory, setCompletedHistory] = useState<CompletedWorkout[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadStatsData = async () => {
    try {
      const storedWorkouts = await AsyncStorage.getItem(WORKOUTS_STORAGE_KEY);
      const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

      const parsedWorkouts = storedWorkouts ? JSON.parse(storedWorkouts) : [];
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];

      setWorkouts(parsedWorkouts);
      setCompletedHistory(parsedHistory);
    } catch (error) {
      setWorkouts([]);
      setCompletedHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadStatsData();
    }, []),
  );

  const totalWorkoutPlans = workouts.length;
  const totalCompletedWorkouts = completedHistory.length;

  const workoutsLast7Days = completedHistory.filter((item) => {
    const completedDate = new Date(item.completedAt).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return completedDate >= sevenDaysAgo;
  }).length;

  const totalCompletedExercises = completedHistory.reduce(
    (sum, item) => sum + item.exercisesCount,
    0,
  );

  const totalWorkoutMinutes = completedHistory.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0,
  );

  const averageExercisesPerWorkout =
    totalCompletedWorkouts > 0
      ? (totalCompletedExercises / totalCompletedWorkouts).toFixed(1)
      : "0";

  const averageWorkoutDuration =
    totalCompletedWorkouts > 0
      ? Math.round(totalWorkoutMinutes / totalCompletedWorkouts)
      : 0;

  const weeklyGoalProgress = Math.min(workoutsLast7Days / WEEKLY_GOAL, 1);
  const weeklyGoalPercent = Math.round(weeklyGoalProgress * 100);

  const sortedHistory = useMemo(() => {
    return [...completedHistory].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }, [completedHistory]);

  const lastWorkout = sortedHistory[0];

  const uniqueWorkoutDays = useMemo(() => {
    return Array.from(
      new Set(sortedHistory.map((item) => getDateKey(item.completedAt))),
    )
      .map((dateKey) => new Date(`${dateKey}T00:00:00`))
      .sort((a, b) => b.getTime() - a.getTime());
  }, [sortedHistory]);

  const currentStreak = useMemo(() => {
    if (uniqueWorkoutDays.length === 0) return 0;

    let streak = 0;
    const today = startOfDay(new Date());
    const firstWorkoutDay = uniqueWorkoutDays[0];
    const diffFromToday = Math.round(
      (today.getTime() - firstWorkoutDay.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffFromToday > 1) return 0;

    let expectedDay =
      diffFromToday === 0
        ? today
        : new Date(today.getTime() - 24 * 60 * 60 * 1000);

    for (const workoutDay of uniqueWorkoutDays) {
      if (workoutDay.getTime() === expectedDay.getTime()) {
        streak += 1;
        expectedDay = new Date(expectedDay.getTime() - 24 * 60 * 60 * 1000);
      } else if (workoutDay.getTime() < expectedDay.getTime()) {
        break;
      }
    }

    return streak;
  }, [uniqueWorkoutDays]);

  const bestStreak = useMemo(() => {
    if (uniqueWorkoutDays.length === 0) return 0;

    let best = 1;
    let current = 1;

    for (let index = 1; index < uniqueWorkoutDays.length; index += 1) {
      const previousDay = uniqueWorkoutDays[index - 1];
      const currentDay = uniqueWorkoutDays[index];

      const diffDays = Math.round(
        (previousDay.getTime() - currentDay.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (diffDays === 1) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }

    return best;
  }, [uniqueWorkoutDays]);

  const getFeelingEmoji = (feeling?: string) => {
    switch (feeling) {
      case "Great":
        return "🔥";
      case "Good":
        return "💪";
      case "Tired":
        return "😴";
      case "Hard":
        return "🏋️";
      default:
        return "✅";
    }
  };

  const feelingCounts = useMemo(() => {
    return ["Great", "Good", "Tired", "Hard"].map((feeling) => ({
      feeling,
      count: completedHistory.filter((item) => item.feeling === feeling).length,
    }));
  }, [completedHistory]);

  const totalFeelings = feelingCounts.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const mostCommonFeeling = useMemo(() => {
    if (totalFeelings === 0) return "No data";

    return [...feelingCounts].sort((a, b) => b.count - a.count)[0].feeling;
  }, [feelingCounts, totalFeelings]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>ActiveTrack</Text>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>
            Overview of your workouts and training activity
          </Text>
        </View>

        <View style={styles.highlightCard}>
          <View style={styles.highlightTopRow}>
            <View style={styles.highlightIcon}>
              <Ionicons name="calendar-outline" size={22} color="#60A5FA" />
            </View>

            <Text style={styles.highlightLabel}>
              WORKOUTS IN THE LAST 7 DAYS
            </Text>

            <View style={styles.highlightBadge}>
              <Text style={styles.highlightBadgeText}>
                {weeklyGoalPercent}%
              </Text>
            </View>
          </View>

          <View style={styles.highlightContentRow}>
            <View style={styles.highlightMain}>
              <Text style={styles.highlightNumber}>{workoutsLast7Days}</Text>
              <Text style={styles.highlightText}>
                Training sessions completed this week
              </Text>
            </View>

            <View style={styles.barChart}>
              {[0.38, 0.56, 0.72, weeklyGoalProgress || 0.18].map(
                (height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chartBar,
                      index === 3 && styles.chartBarActive,
                      { height: 38 + height * 45 },
                    ]}
                  />
                ),
              )}
            </View>
          </View>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalTopRow}>
            <View>
              <Text style={styles.goalTitle}>Weekly Goal</Text>
              <Text style={styles.goalSubtitle}>
                {workoutsLast7Days}/{WEEKLY_GOAL} workouts completed
              </Text>
            </View>

            <Text style={styles.goalPercent}>{weeklyGoalPercent}%</Text>
          </View>

          <View style={styles.goalProgressTrack}>
            <View
              style={[
                styles.goalProgressFill,
                { width: `${weeklyGoalPercent}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard
            label="Workout Plans"
            value={totalWorkoutPlans}
            icon="clipboard-outline"
            iconColor="#9333EA"
            iconBackground="#F3E8FF"
          />

          <StatCard
            label="Completed"
            value={totalCompletedWorkouts}
            icon="checkmark-circle-outline"
            iconColor="#16A34A"
            iconBackground="#DCFCE7"
          />

          <StatCard
            label="Exercises Done"
            value={totalCompletedExercises}
            icon="barbell-outline"
            iconColor="#2563EB"
            iconBackground="#EFF6FF"
          />

          <StatCard
            label="Avg Exercises"
            value={averageExercisesPerWorkout}
            icon="trending-up-outline"
            iconColor="#D97706"
            iconBackground="#FEF3C7"
          />

          <StatCard
            label="Total Time"
            value={totalWorkoutMinutes}
            unit="min"
            icon="time-outline"
            iconColor="#DC2626"
            iconBackground="#FEE2E2"
          />

          <StatCard
            label="Avg Duration"
            value={averageWorkoutDuration}
            unit="min"
            icon="timer-outline"
            iconColor="#7C3AED"
            iconBackground="#EDE9FE"
          />
        </View>

        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <View style={styles.streakIcon}>
              <Ionicons name="flame-outline" size={22} color="#EA580C" />
            </View>
            <Text style={styles.streakValue}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Current streak</Text>
          </View>

          <View style={styles.streakCard}>
            <View style={styles.streakIconBlue}>
              <Ionicons name="trophy-outline" size={22} color="#2563EB" />
            </View>
            <Text style={styles.streakValue}>{bestStreak}</Text>
            <Text style={styles.streakLabel}>Best streak</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="analytics-outline" size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Mood Distribution</Text>
          </View>
        </View>

        <View style={styles.moodCard}>
          {feelingCounts.map((item) => {
            const percent =
              totalFeelings > 0
                ? Math.round((item.count / totalFeelings) * 100)
                : 0;

            return (
              <View key={item.feeling} style={styles.moodRow}>
                <View style={styles.moodLabelBlock}>
                  <Text style={styles.moodEmoji}>
                    {getFeelingEmoji(item.feeling)}
                  </Text>
                  <Text style={styles.moodName}>{item.feeling}</Text>
                </View>

                <View style={styles.moodProgressTrack}>
                  <View
                    style={[styles.moodProgressFill, { width: `${percent}%` }]}
                  />
                </View>

                <Text style={styles.moodPercent}>{percent}%</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={22} color="#2563EB" />
            <Text style={styles.sectionTitle}>Last Workout</Text>
          </View>
        </View>

        {lastWorkout ? (
          <View style={styles.lastWorkoutCard}>
            <View style={styles.lastWorkoutTop}>
              <View>
                <Text style={styles.lastWorkoutTitle}>
                  {lastWorkout.workoutTitle}
                </Text>
                <Text style={styles.lastWorkoutDate}>
                  {formatDate(lastWorkout.completedAt)}
                </Text>
              </View>

              <View style={styles.lastWorkoutBadge}>
                <Text style={styles.lastWorkoutBadgeText}>
                  {lastWorkout.exercisesCount} exercises
                </Text>
              </View>
            </View>

            <View style={styles.lastWorkoutMetaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="checkmark" size={16} color="#15803D" />
                <Text style={styles.metaPillTextGreen}>Completed</Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaEmoji}>⏱</Text>
                <Text style={styles.metaPillText}>
                  {lastWorkout.durationMinutes ?? 0} min
                </Text>
              </View>

              {lastWorkout.feeling ? (
                <View style={styles.metaPill}>
                  <Text style={styles.metaEmoji}>
                    {getFeelingEmoji(lastWorkout.feeling)}
                  </Text>
                  <Text style={styles.metaPillText}>{lastWorkout.feeling}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyInsightCard}>
            <Ionicons name="barbell-outline" size={34} color="#9CA3AF" />
            <Text style={styles.emptyInsightTitle}>No workouts yet</Text>
            <Text style={styles.emptyInsightText}>
              Finish your first workout to see detailed statistics.
            </Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>

          <Text style={styles.summaryText}>
            You currently have {totalWorkoutPlans} saved workout plans and{" "}
            {totalCompletedWorkouts} completed training sessions.
          </Text>

          <Text style={styles.summaryText}>
            You trained for {totalWorkoutMinutes} minutes in total.
          </Text>

          <Text style={styles.summaryText}>
            Most common feeling:{" "}
            {mostCommonFeeling === "No data"
              ? "No data yet"
              : `${getFeelingEmoji(mostCommonFeeling)} ${mostCommonFeeling}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },

  header: {
    marginTop: 20,
    marginBottom: 24,
  },

  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 18,
    letterSpacing: -0.8,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -1,
  },

  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 22,
  },

  highlightCard: {
    backgroundColor: "#111827",
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  highlightTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  highlightLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: "#CBD5E1",
    letterSpacing: 1,
  },

  highlightBadge: {
    backgroundColor: "#064E3B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  highlightBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4ADE80",
  },

  highlightContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  highlightMain: {
    flex: 1,
    paddingRight: 16,
  },

  highlightNumber: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },

  highlightText: {
    fontSize: 15,
    color: "#E5E7EB",
    lineHeight: 22,
  },

  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 95,
  },

  chartBar: {
    width: 18,
    backgroundColor: "rgba(96,165,250,0.22)",
    borderRadius: 999,
  },

  chartBarActive: {
    backgroundColor: "#2563EB",
  },

  goalCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  goalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },

  goalSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  goalPercent: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2563EB",
  },

  goalProgressTrack: {
    height: 12,
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    overflow: "hidden",
  },

  goalProgressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  smallCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  smallCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  smallCardTextBlock: {
    flex: 1,
  },

  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 17,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
  },

  cardNumber: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  cardUnit: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 4,
  },

  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 20,
  },

  streakCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  streakIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  streakIconBlue: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  streakValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },

  streakLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },

  sectionHeader: {
    marginTop: 6,
    marginBottom: 12,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  moodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  moodLabelBlock: {
    width: 88,
    flexDirection: "row",
    alignItems: "center",
  },

  moodEmoji: {
    fontSize: 20,
    marginRight: 7,
  },

  moodName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },

  moodProgressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 10,
  },

  moodProgressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
  },

  moodPercent: {
    width: 38,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "900",
    color: "#6B7280",
  },

  lastWorkoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  lastWorkoutTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  lastWorkoutTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },

  lastWorkoutDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  lastWorkoutBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  lastWorkoutBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },

  lastWorkoutMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  metaPill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },

  metaPillTextGreen: {
    fontSize: 13,
    fontWeight: "900",
    color: "#15803D",
  },

  metaEmoji: {
    fontSize: 15,
  },

  emptyInsightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },

  emptyInsightTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 10,
    marginBottom: 8,
  },

  emptyInsightText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  summaryTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },

  summaryText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },
});
