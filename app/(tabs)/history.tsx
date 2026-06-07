import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CompletedWorkout = {
  id: string;
  workoutId: string;
  workoutTitle: string;
  completedAt: string;
  exercisesCount: number;
  durationMinutes?: number;
  feeling?: string;
};

const HISTORY_STORAGE_KEY = "activeTrack_completed_history";

export default function HistoryScreen() {
  const [completedHistory, setCompletedHistory] = useState<CompletedWorkout[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
      setCompletedHistory(parsedHistory);
    } catch (error) {
      Alert.alert("Error", "Failed to load workout history.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadHistory();
    }, []),
  );

  const handleClearHistory = () => {
    Alert.alert(
      "Clear history",
      "Are you sure you want to delete all completed workout history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
              setCompletedHistory([]);
            } catch (error) {
              Alert.alert("Error", "Failed to clear workout history.");
            }
          },
        },
      ],
    );
  };

  const workoutsLast7Days = completedHistory.filter((item) => {
    const completedDate = new Date(item.completedAt).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return completedDate >= sevenDaysAgo;
  }).length;

  const totalCompletedWorkouts = completedHistory.length;

  const totalMinutes = completedHistory.reduce(
    (sum, item) => sum + (item.durationMinutes ?? 0),
    0,
  );

  const latestWorkout = completedHistory[0];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
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
          <Text style={styles.title}>Workout History</Text>
          <Text style={styles.subtitle}>
            View your completed training sessions and progress
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Ionicons name="calendar" size={22} color="#60A5FA" />
            </View>

            <Text style={styles.heroLabel}>WORKOUTS IN THE LAST 7 DAYS</Text>

            <View style={styles.activePill}>
              <Ionicons name="trending-up" size={14} color="#22C55E" />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>

          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.heroNumber}>{workoutsLast7Days}</Text>
              <Text style={styles.heroText}>
                Completed workouts in the past 7 days
              </Text>
            </View>

            <View style={styles.barsRow}>
              <View style={[styles.bar, styles.barSmall]} />
              <View style={[styles.bar, styles.barMedium]} />
              <View style={[styles.bar, styles.barLarge]} />
              <View style={[styles.bar, styles.barActive]} />
            </View>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalIconBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={34}
              color="#16A34A"
            />
          </View>

          <View style={styles.totalTextBlock}>
            <Text style={styles.totalLabel}>Total completed workouts</Text>
            <Text style={styles.totalNumber}>{totalCompletedWorkouts}</Text>
          </View>

          <View style={styles.totalMinutesBox}>
            <Text style={styles.totalMinutesNumber}>{totalMinutes}</Text>
            <Text style={styles.totalMinutesLabel}>min</Text>
          </View>
        </View>

        {latestWorkout ? (
          <View style={styles.latestCard}>
            <Text style={styles.latestLabel}>Latest session</Text>
            <Text style={styles.latestTitle}>{latestWorkout.workoutTitle}</Text>

            <View style={styles.latestPillsRow}>
              <View style={styles.lightPill}>
                <Text style={styles.lightPillText}>
                  {latestWorkout.exercisesCount} exercises
                </Text>
              </View>

              <View style={styles.lightPill}>
                <Text style={styles.lightPillText}>
                  ⏱ {latestWorkout.durationMinutes ?? 0} min
                </Text>
              </View>

              {latestWorkout.feeling ? (
                <View style={styles.lightPill}>
                  <Text style={styles.lightPillText}>
                    {getFeelingEmoji(latestWorkout.feeling)}{" "}
                    {latestWorkout.feeling}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearHistory}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.clearButtonText}>Clear History</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {completedHistory.length > 0 ? (
            <Text style={styles.viewAllText}>View all</Text>
          ) : null}
        </View>

        {completedHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyStateTitle}>
              No completed workouts yet
            </Text>
            <Text style={styles.emptyStateText}>
              Complete your first workout to see your training history here.
            </Text>
          </View>
        ) : (
          completedHistory.map((item, index) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyIconBox}>
                <Ionicons
                  name={index % 2 === 0 ? "barbell-outline" : "fitness-outline"}
                  size={26}
                  color={index % 2 === 0 ? "#2563EB" : "#7C3AED"}
                />
              </View>

              <View style={styles.historyMainContent}>
                <View style={styles.historyTopRow}>
                  <View style={styles.historyTitleBlock}>
                    <Text style={styles.historyWorkoutTitle}>
                      {item.workoutTitle}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(item.completedAt)}
                    </Text>
                  </View>

                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>
                      {item.exercisesCount} exercises
                    </Text>
                  </View>
                </View>

                <View style={styles.historyMetaRow}>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark" size={14} color="#16A34A" />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>

                  {item.feeling ? (
                    <View style={styles.feelingBox}>
                      <Text style={styles.feelingText}>
                        {getFeelingEmoji(item.feeling)} {item.feeling}
                      </Text>
                    </View>
                  ) : null}

                  {item.durationMinutes ? (
                    <Text style={styles.durationText}>
                      ⏱ {item.durationMinutes} min
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}
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
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 22,
  },

  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1E3A8A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#D1D5DB",
    lineHeight: 20,
  },

  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#064E3B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },

  activePillText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "800",
  },

  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  heroNumber: {
    fontSize: 46,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  heroText: {
    maxWidth: 210,
    fontSize: 16,
    color: "#E5E7EB",
    lineHeight: 24,
  },

  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    height: 72,
  },

  bar: {
    width: 18,
    borderRadius: 999,
    backgroundColor: "#243B63",
  },

  barSmall: {
    height: 30,
  },

  barMedium: {
    height: 44,
  },

  barLarge: {
    height: 58,
  },

  barActive: {
    height: 72,
    backgroundColor: "#2563EB",
  },

  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  totalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  totalTextBlock: {
    flex: 1,
  },

  totalLabel: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 8,
  },

  totalNumber: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },

  totalMinutesBox: {
    alignItems: "flex-end",
  },

  totalMinutesNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  totalMinutesLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },

  latestCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },

  latestLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 10,
  },

  latestTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },

  latestPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  lightPill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 999,
  },

  lightPillText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "800",
  },

  clearButton: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 26,
  },

  clearButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  viewAllText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2563EB",
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  historyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  historyMainContent: {
    flex: 1,
  },

  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  historyTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },

  historyWorkoutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  historyDate: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  historyBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },

  historyBadgeText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "800",
  },

  historyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  completedBadge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  completedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
  },

  feelingBox: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  feelingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },

  durationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "800",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
});
