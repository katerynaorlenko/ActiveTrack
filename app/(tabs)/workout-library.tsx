import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WorkoutExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
};

type Workout = {
  id: string;
  title: string;
  exercises: WorkoutExercise[];
};

type LibraryExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string;
};

const WORKOUTS_STORAGE_KEY = "activeTrack_workouts";

const libraryExercises: LibraryExercise[] = [
  { id: "1", name: "Bench Press", category: "Chest", equipment: "Barbell" },
  { id: "2", name: "Push-ups", category: "Chest", equipment: "No equipment" },
  {
    id: "3",
    name: "Incline Dumbbell Press",
    category: "Chest",
    equipment: "Dumbbells",
  },
  { id: "4", name: "Chest Fly", category: "Chest", equipment: "Dumbbells" },

  {
    id: "5",
    name: "Shoulder Press",
    category: "Shoulders",
    equipment: "Dumbbells",
  },
  {
    id: "6",
    name: "Lateral Raise",
    category: "Shoulders",
    equipment: "Dumbbells",
  },
  {
    id: "7",
    name: "Front Raise",
    category: "Shoulders",
    equipment: "Dumbbells",
  },
  {
    id: "8",
    name: "Arnold Press",
    category: "Shoulders",
    equipment: "Dumbbells",
  },

  { id: "9", name: "Bicep Curls", category: "Arms", equipment: "Dumbbells" },
  { id: "10", name: "Hammer Curls", category: "Arms", equipment: "Dumbbells" },
  {
    id: "11",
    name: "Tricep Dips",
    category: "Arms",
    equipment: "No equipment",
  },
  {
    id: "12",
    name: "Tricep Pushdown",
    category: "Arms",
    equipment: "Cable machine",
  },

  { id: "13", name: "Squats", category: "Legs", equipment: "No equipment" },
  { id: "14", name: "Lunges", category: "Legs", equipment: "No equipment" },
  { id: "15", name: "Leg Press", category: "Legs", equipment: "Machine" },
  { id: "16", name: "Deadlift", category: "Legs", equipment: "Barbell" },
  {
    id: "17",
    name: "Calf Raises",
    category: "Legs",
    equipment: "No equipment",
  },

  { id: "18", name: "Pull-ups", category: "Back", equipment: "Pull-up bar" },
  { id: "19", name: "Barbell Row", category: "Back", equipment: "Barbell" },
  { id: "20", name: "Lat Pulldown", category: "Back", equipment: "Machine" },
  { id: "21", name: "Seated Row", category: "Back", equipment: "Machine" },
];

export default function WorkoutLibraryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<LibraryExercise | null>(null);

  const categories = ["All", "Chest", "Shoulders", "Arms", "Legs", "Back"];

  const filteredExercises = useMemo(() => {
    return libraryExercises.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || exercise.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const loadWorkouts = async () => {
    try {
      const stored = await AsyncStorage.getItem(WORKOUTS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];

      const normalizedWorkouts: Workout[] = parsed.map((workout: any) => ({
        id: String(workout.id),
        title: workout.title ?? "Workout",
        exercises: Array.isArray(workout.exercises)
          ? workout.exercises.map((exercise: any) => ({
              id: String(exercise.id ?? Date.now()),
              name: exercise.name ?? "Exercise",
              sets:
                typeof exercise.sets === "number" && exercise.sets > 0
                  ? exercise.sets
                  : 3,
              reps:
                typeof exercise.reps === "number" && exercise.reps > 0
                  ? exercise.reps
                  : 12,
            }))
          : [],
      }));

      setWorkouts(normalizedWorkouts);
    } catch {
      setWorkouts([]);
    }
  };

  const openWorkoutPicker = async (exercise: LibraryExercise) => {
    setSelectedExercise(exercise);
    await loadWorkouts();
    setModalVisible(true);
  };

  const closeWorkoutPicker = () => {
    setModalVisible(false);
    setSelectedExercise(null);
  };

  const handleAddExerciseToWorkout = async (workout: Workout) => {
    try {
      if (!selectedExercise) return;

      const alreadyExists = workout.exercises.some(
        (item) =>
          item.name.toLowerCase() === selectedExercise.name.toLowerCase(),
      );

      if (alreadyExists) {
        Alert.alert(
          "Already added",
          `"${selectedExercise.name}" is already in "${workout.title}".`,
        );
        return;
      }

      const updatedWorkouts = workouts.map((item) => {
        if (item.id !== workout.id) return item;

        return {
          ...item,
          exercises: [
            ...item.exercises,
            {
              id: Date.now().toString(),
              name: selectedExercise.name,
              sets: 3,
              reps: 12,
            },
          ],
        };
      });

      await AsyncStorage.setItem(
        WORKOUTS_STORAGE_KEY,
        JSON.stringify(updatedWorkouts),
      );

      closeWorkoutPicker();

      Alert.alert(
        "Exercise Added",
        `"${selectedExercise.name}" was added to "${workout.title}" with 3 sets × 12 reps.`,
      );
    } catch {
      Alert.alert("Error", "Failed to add exercise to workout.");
    }
  };

  const renderExerciseCard = ({ item }: { item: LibraryExercise }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.exerciseName}>{item.name}</Text>

        <Text style={styles.exerciseInfo}>Category: {item.category}</Text>
        <Text style={styles.exerciseInfo}>Equipment: {item.equipment}</Text>

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => openWorkoutPicker(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.addExerciseButtonText}>Add to Workout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    return (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => handleAddExerciseToWorkout(item)}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.modalItemTitle}>{item.title}</Text>
          <Text style={styles.modalItemText}>
            {item.exercises.length} exercises
          </Text>
        </View>

        <Text style={styles.modalAddText}>Add</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>ActiveTrack</Text>
        <Text style={styles.title}>Workout Library</Text>
        <Text style={styles.subtitle}>
          Clean English exercises for your plans
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filtersRow}>
          {categories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          style={styles.list}
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>No exercises found.</Text>
            </View>
          }
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeWorkoutPicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Workout</Text>

            {selectedExercise && (
              <Text style={styles.modalSubtitle}>
                Add “{selectedExercise.name}” with 3 sets × 12 reps
              </Text>
            )}

            {workouts.length === 0 ? (
              <View style={styles.modalEmptyBox}>
                <Text style={styles.modalEmptyTitle}>No workouts found</Text>
                <Text style={styles.modalEmptyText}>
                  Create a workout first, then come back to add exercises.
                </Text>
              </View>
            ) : (
              <FlatList
                data={workouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                showsVerticalScrollIndicator={false}
                style={styles.modalList}
              />
            )}

            <TouchableOpacity
              onPress={closeWorkoutPicker}
              style={styles.modalClose}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    marginBottom: 18,
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111827",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },

  filterChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginRight: 10,
    marginBottom: 10,
  },

  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  filterChipText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  list: {
    flex: 1,
    marginTop: 10,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 34,
  },

  card: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  exerciseName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 28,
  },

  exerciseInfo: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 6,
    lineHeight: 21,
  },

  addExerciseButton: {
    backgroundColor: "#2563EB",
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  addExerciseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  centerBox: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContent: {
    width: "100%",
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },

  modalList: {
    marginBottom: 10,
  },

  modalItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  modalItemText: {
    fontSize: 14,
    color: "#6B7280",
  },

  modalAddText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "800",
  },

  modalEmptyBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  modalEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  modalClose: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
});
