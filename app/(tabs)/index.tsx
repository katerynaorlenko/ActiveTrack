import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type ExerciseItem = {
  id: string;
  name: string;
  sets: number;
  reps: number;
};

type Workout = {
  id: string;
  title: string;
  exercises: ExerciseItem[];
};

const WORKOUTS_STORAGE_KEY = "activeTrack_workouts";
const HISTORY_STORAGE_KEY = "activeTrack_completed_history";

const defaultWorkouts: Workout[] = [
  {
    id: "1",
    title: "Full Body Workout",
    exercises: [
      { id: "e1", name: "Squats", sets: 3, reps: 12 },
      { id: "e2", name: "Push-ups", sets: 3, reps: 10 },
      { id: "e3", name: "Plank", sets: 2, reps: 30 },
      { id: "e4", name: "Shoulder Press", sets: 3, reps: 12 },
    ],
  },
  {
    id: "2",
    title: "Leg Day",
    exercises: [
      { id: "e5", name: "Squats", sets: 4, reps: 12 },
      { id: "e6", name: "Lunges", sets: 3, reps: 10 },
      { id: "e7", name: "Leg Press", sets: 4, reps: 12 },
      { id: "e8", name: "Deadlift", sets: 3, reps: 8 },
    ],
  },
  {
    id: "3",
    title: "Upper Body",
    exercises: [
      { id: "e9", name: "Bench Press", sets: 4, reps: 10 },
      { id: "e10", name: "Pull-ups", sets: 3, reps: 8 },
      { id: "e11", name: "Shoulder Press", sets: 3, reps: 12 },
      { id: "e12", name: "Bicep Curls", sets: 3, reps: 12 },
    ],
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const exerciseCategories = useMemo(
    () => [
      {
        category: "Chest",
        exercises: [
          "Bench Press",
          "Push-ups",
          "Incline Dumbbell Press",
          "Chest Fly",
        ],
      },
      {
        category: "Legs",
        exercises: ["Squats", "Lunges", "Leg Press", "Deadlift"],
      },
      {
        category: "Back",
        exercises: ["Pull-ups", "Barbell Row", "Lat Pulldown", "Seated Row"],
      },
      {
        category: "Shoulders",
        exercises: [
          "Shoulder Press",
          "Lateral Raise",
          "Front Raise",
          "Arnold Press",
        ],
      },
      {
        category: "Core",
        exercises: [
          "Plank",
          "Russian Twist",
          "Leg Raises",
          "Mountain Climbers",
        ],
      },
      {
        category: "Arms",
        exercises: [
          "Bicep Curls",
          "Hammer Curls",
          "Tricep Dips",
          "Tricep Pushdown",
        ],
      },
    ],
    [],
  );

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newWorkoutTitle, setNewWorkoutTitle] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<ExerciseItem[]>(
    [],
  );
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  const [startModalVisible, setStartModalVisible] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isRestRunning, setIsRestRunning] = useState(false);

  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);

  const [feelingModalVisible, setFeelingModalVisible] = useState(false);

  const [pendingWorkoutDuration, setPendingWorkoutDuration] = useState(0);
  const [pendingWorkoutResult, setPendingWorkoutResult] = useState<{
    workoutId: string;
    workoutTitle: string;
    exercisesCount: number;
    durationMinutes: number;
  } | null>(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, []),
  );

  useEffect(() => {
    if (!isLoading) {
      saveWorkouts(workouts);
    }
  }, [workouts, isLoading]);

  useEffect(() => {
    if (!isRestRunning || restTimeLeft <= 0) {
      if (restTimeLeft === 0) {
        setIsRestRunning(false);
      }
      return;
    }

    const timer = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRestRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRestRunning, restTimeLeft]);

  const normalizeLoadedWorkouts = (data: any[]): Workout[] => {
    return data.map((workout, workoutIndex) => ({
      id: String(workout.id ?? Date.now() + workoutIndex),
      title: workout.title ?? "Workout",
      exercises: Array.isArray(workout.exercises)
        ? workout.exercises.map((exercise: any, exerciseIndex: number) => {
            if (typeof exercise === "string") {
              return {
                id: `${workout.id ?? workoutIndex}-${exerciseIndex}`,
                name: exercise,
                sets: 3,
                reps: 12,
              };
            }

            return {
              id: String(
                exercise.id ?? `${workout.id ?? workoutIndex}-${exerciseIndex}`,
              ),
              name: exercise.name ?? "Exercise",
              sets:
                typeof exercise.sets === "number" && exercise.sets > 0
                  ? exercise.sets
                  : 3,
              reps:
                typeof exercise.reps === "number" && exercise.reps > 0
                  ? exercise.reps
                  : 12,
            };
          })
        : [],
    }));
  };

  const loadWorkouts = async () => {
    try {
      const storedWorkouts = await AsyncStorage.getItem(WORKOUTS_STORAGE_KEY);

      if (storedWorkouts) {
        const parsed = JSON.parse(storedWorkouts);
        setWorkouts(normalizeLoadedWorkouts(parsed));
      } else {
        setWorkouts(defaultWorkouts);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load saved workouts.");
      setWorkouts(defaultWorkouts);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkouts = async (data: Workout[]) => {
    try {
      await AsyncStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      Alert.alert("Error", "Failed to save workouts.");
    }
  };

  const resetForm = () => {
    setNewWorkoutTitle("");
    setSelectedExercises([]);
    setEditingWorkoutId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (workout: Workout) => {
    setNewWorkoutTitle(workout.title);
    setSelectedExercises(workout.exercises);
    setEditingWorkoutId(workout.id);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const toggleExercise = (exerciseName: string) => {
    const exists = selectedExercises.some((item) => item.name === exerciseName);

    if (exists) {
      setSelectedExercises((prev) =>
        prev.filter((item) => item.name !== exerciseName),
      );
    } else {
      const newExercise: ExerciseItem = {
        id: Date.now().toString() + exerciseName,
        name: exerciseName,
        sets: 3,
        reps: 12,
      };
      setSelectedExercises((prev) => [...prev, newExercise]);
    }
  };

  const updateExerciseSets = (exerciseId: string, delta: number) => {
    setSelectedExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: Math.max(1, exercise.sets + delta) }
          : exercise,
      ),
    );
  };

  const updateExerciseReps = (exerciseId: string, delta: number) => {
    setSelectedExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, reps: Math.max(1, exercise.reps + delta) }
          : exercise,
      ),
    );
  };

  const handleSaveWorkout = () => {
    const trimmedTitle = newWorkoutTitle.trim();

    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please enter a workout name.");
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert(
        "No exercises selected",
        "Please choose at least one exercise.",
      );
      return;
    }

    if (editingWorkoutId) {
      setWorkouts((prevWorkouts) =>
        prevWorkouts.map((workout) =>
          workout.id === editingWorkoutId
            ? {
                ...workout,
                title: trimmedTitle,
                exercises: selectedExercises,
              }
            : workout,
        ),
      );
    } else {
      const newWorkout: Workout = {
        id: Date.now().toString(),
        title: trimmedTitle,
        exercises: selectedExercises,
      };

      setWorkouts((prevWorkouts) => [newWorkout, ...prevWorkouts]);
    }

    closeModal();
  };

  const handleDeleteWorkout = (id: string) => {
    Alert.alert(
      "Delete workout",
      "Are you sure you want to delete this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setWorkouts((prevWorkouts) =>
              prevWorkouts.filter((workout) => workout.id !== id),
            );
          },
        },
      ],
    );
  };

  const handleResetAllData = () => {
    Alert.alert(
      "Reset all workouts",
      "Do you want to restore the default workout list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(WORKOUTS_STORAGE_KEY);
              await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
              setWorkouts(defaultWorkouts);
            } catch (error) {
              Alert.alert("Error", "Failed to reset saved workouts.");
            }
          },
        },
      ],
    );
  };

  const handleStartWorkout = (workout: Workout) => {
    if (workout.exercises.length === 0) {
      Alert.alert("No exercises", "This workout has no exercises.");
      return;
    }

    setActiveWorkout(workout);
    setCurrentExerciseIndex(0);
    setRestTimeLeft(0);
    setIsRestRunning(false);
    setCompletedExercises([]);
    setWorkoutStartedAt(Date.now());
    setPendingWorkoutDuration(0);
    setPendingWorkoutResult(null);
    setStartModalVisible(true);
  };

  const handleCloseStartWorkout = () => {
    setStartModalVisible(false);
    setActiveWorkout(null);
    setCurrentExerciseIndex(0);
    setRestTimeLeft(0);
    setIsRestRunning(false);
    setCompletedExercises([]);
    setWorkoutStartedAt(null);
  };

  const handleToggleExerciseFromChecklist = (
    exerciseId: string,
    index: number,
  ) => {
    if (!activeWorkout) return;

    const isAlreadyCompleted = completedExercises.includes(exerciseId);

    if (isAlreadyCompleted) {
      setCompletedExercises((prev) =>
        prev.filter((item) => item !== exerciseId),
      );
      setCurrentExerciseIndex(index);
    } else {
      const updatedCompletedExercises = [...completedExercises, exerciseId];

      setCompletedExercises(updatedCompletedExercises);

      const nextUncompletedIndex = activeWorkout.exercises.findIndex(
        (exercise) => !updatedCompletedExercises.includes(exercise.id),
      );

      if (nextUncompletedIndex !== -1) {
        setCurrentExerciseIndex(nextUncompletedIndex);
      } else {
        setCurrentExerciseIndex(index);
      }
    }

    setRestTimeLeft(0);
    setIsRestRunning(false);
  };

  const handleSelectExerciseFromChecklist = (index: number) => {
    setCurrentExerciseIndex(index);
    setRestTimeLeft(0);
    setIsRestRunning(false);
  };

  const handleNextExercise = () => {
    if (!activeWorkout) return;

    if (currentExerciseIndex < activeWorkout.exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setRestTimeLeft(0);
      setIsRestRunning(false);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setRestTimeLeft(0);
      setIsRestRunning(false);
    }
  };

  const handleFinishWorkout = async () => {
    if (!activeWorkout) return;

    if (completedExercises.length !== activeWorkout.exercises.length) {
      Alert.alert(
        "Workout not finished",
        "Please complete all exercises before finishing the workout.",
      );
      return;
    }

    const durationMinutes = workoutStartedAt
      ? Math.max(1, Math.round((Date.now() - workoutStartedAt) / 60000))
      : 1;

    setPendingWorkoutDuration(durationMinutes);
    setPendingWorkoutResult({
      workoutId: activeWorkout.id,
      workoutTitle: activeWorkout.title,
      exercisesCount: activeWorkout.exercises.length,
      durationMinutes,
    });

    setStartModalVisible(false);

    setTimeout(() => {
      setFeelingModalVisible(true);
    }, 250);
  };

  const saveWorkoutWithFeeling = async (feeling: string) => {
    try {
      if (!pendingWorkoutResult) return;

      const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];

      const newHistoryItem = {
        id: Date.now().toString(),
        workoutId: pendingWorkoutResult.workoutId,
        workoutTitle: pendingWorkoutResult.workoutTitle,
        completedAt: new Date().toISOString(),
        exercisesCount: pendingWorkoutResult.exercisesCount,
        durationMinutes: pendingWorkoutResult.durationMinutes,
        feeling,
      };

      const updatedHistory = [newHistoryItem, ...parsedHistory];

      await AsyncStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(updatedHistory),
      );

      setFeelingModalVisible(false);
      setPendingWorkoutResult(null);
      setPendingWorkoutDuration(0);
      setActiveWorkout(null);
      setCurrentExerciseIndex(0);
      setRestTimeLeft(0);
      setIsRestRunning(false);
      setCompletedExercises([]);
      setWorkoutStartedAt(null);

      Alert.alert(
        "Workout completed",
        `Feeling: ${feeling}
Duration: ${newHistoryItem.durationMinutes} min`,
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save workout history.");
    }
  };

  const handleStartRest = () => {
    setRestTimeLeft(60);
    setIsRestRunning(true);
  };

  const handleAddRestTime = () => {
    setRestTimeLeft((prev) => prev + 15);
    setIsRestRunning(true);
  };

  const handleSkipRest = () => {
    setRestTimeLeft(0);
    setIsRestRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentExercise =
    activeWorkout?.exercises[currentExerciseIndex] ?? null;

  const progressText = activeWorkout
    ? `${completedExercises.length} / ${activeWorkout.exercises.length}`
    : "0 / 0";

  const progressPercent = activeWorkout
    ? (completedExercises.length / activeWorkout.exercises.length) * 100
    : 0;

  const allExercisesCompleted =
    !!activeWorkout &&
    completedExercises.length === activeWorkout.exercises.length;

  const previewExercises = (exercises: ExerciseItem[]) => {
    const visibleExercises = exercises.slice(0, 3);
    const remainingCount = exercises.length - visibleExercises.length;

    return { visibleExercises, remainingCount };
  };

  const filteredWorkouts = workouts.filter((workout) =>
    workout.title.toLowerCase().includes(workoutSearchQuery.toLowerCase()),
  );

  const getWorkoutIconName = (
    title: string,
  ): keyof typeof Ionicons.glyphMap => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes("arm") || lowerTitle.includes("upper")) {
      return "fitness-outline";
    }

    if (lowerTitle.includes("leg")) {
      return "walk-outline";
    }

    if (lowerTitle.includes("full") || lowerTitle.includes("body")) {
      return "barbell-outline";
    }

    if (lowerTitle.includes("cardio")) {
      return "heart-outline";
    }

    return "barbell-outline";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workouts...</Text>
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
          <Text style={styles.title}>My Workouts</Text>
          <Text style={styles.subtitle}>
            Plan your training and track your progress
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heroAddButton}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <View style={styles.heroAddIcon}>
            <Ionicons name="add" size={26} color="#2563EB" />
          </View>

          <Text style={styles.heroAddButtonText}>Add Workout</Text>

          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Workout Plans</Text>

          <View style={styles.planSearchBox}>
            <Ionicons name="search" size={17} color="#9CA3AF" />
            <TextInput
              style={styles.planSearchInput}
              placeholder="Search plans..."
              placeholderTextColor="#9CA3AF"
              value={workoutSearchQuery}
              onChangeText={setWorkoutSearchQuery}
            />
          </View>
        </View>
        <View style={styles.section}>
          {filteredWorkouts.map((workout) => {
            const { visibleExercises, remainingCount } = previewExercises(
              workout.exercises,
            );

            return (
              <View key={workout.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.workoutIconTile}>
                    <Ionicons
                      name={getWorkoutIconName(workout.title)}
                      size={30}
                      color="#2563EB"
                    />
                  </View>

                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{workout.title}</Text>
                    <Text style={styles.cardText}>
                      {workout.exercises.length} exercises
                    </Text>
                  </View>

                  <Text style={styles.cardBadge}>Workout</Text>
                </View>

                <View style={styles.exercisePreview}>
                  {visibleExercises.map((exercise) => (
                    <Text key={exercise.id} style={styles.exercisePreviewText}>
                      • {exercise.name} · {exercise.sets} sets × {exercise.reps}{" "}
                      reps
                    </Text>
                  ))}

                  {remainingCount > 0 && (
                    <Text style={styles.moreExercisesText}>
                      +{remainingCount} more
                    </Text>
                  )}
                </View>

                <View style={styles.cardButtonsRow}>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => handleStartWorkout(workout)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={16} color="#15803D" />
                    <Text style={styles.startButtonText}>Start</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(workout)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create" size={16} color="#1D4ED8" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteWorkout(workout.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filteredWorkouts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No plans found</Text>
              <Text style={styles.emptyStateText}>
                Try another search or create a new workout plan.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.headerSideButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {editingWorkoutId ? "Edit Workout" : "Create Workout"}
            </Text>

            <TouchableOpacity
              onPress={handleSaveWorkout}
              style={styles.headerSideButton}
            >
              <Text style={styles.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.inputLabel}>Workout name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter workout name"
              placeholderTextColor="#9CA3AF"
              value={newWorkoutTitle}
              onChangeText={setNewWorkoutTitle}
            />

            <Text style={styles.selectorTitle}>
              Choose exercises by category
            </Text>

            {exerciseCategories.map((group) => (
              <View key={group.category} style={styles.categoryBlock}>
                <Text style={styles.categoryTitle}>{group.category}</Text>

                <View style={styles.exerciseList}>
                  {group.exercises.map((exerciseName) => {
                    const selectedExercise = selectedExercises.find(
                      (item) => item.name === exerciseName,
                    );
                    const isSelected = !!selectedExercise;

                    return (
                      <View
                        key={exerciseName}
                        style={[
                          styles.exerciseChipCard,
                          isSelected && styles.exerciseChipCardSelected,
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => toggleExercise(exerciseName)}
                          style={styles.exerciseChipTop}
                        >
                          <Text
                            style={[
                              styles.exerciseChipText,
                              isSelected && styles.exerciseChipTextSelected,
                            ]}
                          >
                            {exerciseName}
                          </Text>
                        </TouchableOpacity>

                        {isSelected && selectedExercise && (
                          <View style={styles.controlsBlock}>
                            <View style={styles.controlRow}>
                              <Text style={styles.controlLabel}>Sets</Text>

                              <View style={styles.counterControls}>
                                <TouchableOpacity
                                  style={styles.setButton}
                                  onPress={() =>
                                    updateExerciseSets(selectedExercise.id, -1)
                                  }
                                >
                                  <Text style={styles.setButtonText}>−</Text>
                                </TouchableOpacity>

                                <Text style={styles.setsText}>
                                  {selectedExercise.sets}
                                </Text>

                                <TouchableOpacity
                                  style={styles.setButton}
                                  onPress={() =>
                                    updateExerciseSets(selectedExercise.id, 1)
                                  }
                                >
                                  <Text style={styles.setButtonText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            <View style={styles.controlRow}>
                              <Text style={styles.controlLabel}>Reps</Text>

                              <View style={styles.counterControls}>
                                <TouchableOpacity
                                  style={styles.setButton}
                                  onPress={() =>
                                    updateExerciseReps(selectedExercise.id, -1)
                                  }
                                >
                                  <Text style={styles.setButtonText}>−</Text>
                                </TouchableOpacity>

                                <Text style={styles.setsText}>
                                  {selectedExercise.reps}
                                </Text>

                                <TouchableOpacity
                                  style={styles.setButton}
                                  onPress={() =>
                                    updateExerciseReps(selectedExercise.id, 1)
                                  }
                                >
                                  <Text style={styles.setButtonText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveWorkout}
            >
              <Text style={styles.saveButtonText}>
                {editingWorkoutId ? "Save Changes" : "Save Workout"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={startModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.startSafeArea}>
          <View style={[styles.startHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={handleCloseStartWorkout}
              style={styles.headerSideButton}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>

            <Text style={styles.startHeaderTitle}>Start Workout</Text>

            <View style={styles.headerSideButton} />
          </View>

          <ScrollView
            contentContainerStyle={styles.startScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.startTopBlock}>
              <Text style={styles.startWorkoutName}>
                {activeWorkout?.title ?? "Workout"}
              </Text>

              <Text style={styles.progressText}>{progressText}</Text>

              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.exerciseCard}>
              <Text style={styles.exerciseCardLabel}>Current Exercise</Text>
              <Text style={styles.exerciseCardTitle}>
                {currentExercise?.name ?? ""}
              </Text>
              <Text style={styles.exerciseSetsText}>
                {currentExercise?.sets ?? 0} sets × {currentExercise?.reps ?? 0}{" "}
                reps
              </Text>
            </View>

            <View style={styles.inlineRestCard}>
              <View>
                <Text style={styles.inlineRestLabel}>Rest Timer</Text>
                <Text style={styles.inlineRestTime}>
                  {restTimeLeft > 0 ? formatTime(restTimeLeft) : "Ready"}
                </Text>
              </View>

              <View style={styles.inlineRestActions}>
                <TouchableOpacity
                  style={styles.inlineRestPrimaryButton}
                  onPress={handleStartRest}
                >
                  <Text style={styles.inlineRestPrimaryButtonText}>Start</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inlineRestSecondaryButton}
                  onPress={handleAddRestTime}
                >
                  <Text style={styles.inlineRestSecondaryButtonText}>+15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inlineRestSecondaryButton}
                  onPress={handleSkipRest}
                >
                  <Text style={styles.inlineRestSecondaryButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <Text style={styles.checklistTitle}>Workout Checklist</Text>
                <Text style={styles.checklistCounter}>
                  {completedExercises.length}/
                  {activeWorkout?.exercises.length ?? 0}
                </Text>
              </View>

              {activeWorkout?.exercises.map((exercise, index) => {
                const isCompleted = completedExercises.includes(exercise.id);
                const isCurrent = index === currentExerciseIndex;

                return (
                  <View
                    key={exercise.id}
                    style={[
                      styles.checklistItem,
                      isCurrent && styles.checklistItemCurrent,
                    ]}
                  >
                    <View style={styles.checklistLeft}>
                      <TouchableOpacity
                        onPress={() =>
                          handleToggleExerciseFromChecklist(exercise.id, index)
                        }
                        style={[
                          styles.checkIcon,
                          isCompleted && styles.checkIconDone,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.checkIconText,
                            isCompleted && styles.checkIconTextDone,
                          ]}
                        >
                          {isCompleted ? "✓" : "○"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSelectExerciseFromChecklist(index)}
                        style={styles.checklistTextBlock}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.checklistExerciseName,
                            isCurrent && styles.checklistExerciseNameCurrent,
                          ]}
                        >
                          {exercise.name}
                        </Text>
                        <Text style={styles.checklistExerciseSets}>
                          {exercise.sets} sets × {exercise.reps} reps
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isCurrent && (
                      <Text style={styles.currentBadge}>Current</Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.bottomActionBar}>
              <TouchableOpacity
                style={[
                  styles.iosSecondaryButton,
                  currentExerciseIndex === 0 && styles.disabledButton,
                ]}
                onPress={handlePreviousExercise}
                disabled={currentExerciseIndex === 0}
              >
                <Text
                  style={[
                    styles.iosSecondaryButtonText,
                    currentExerciseIndex === 0 && styles.disabledButtonText,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              {allExercisesCompleted ? (
                <TouchableOpacity
                  style={styles.iosFinishButton}
                  onPress={handleFinishWorkout}
                >
                  <Text style={styles.iosFinishButtonText}>Finish</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.iosPrimaryButton}
                  onPress={handleNextExercise}
                >
                  <Text style={styles.iosPrimaryButtonText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={feelingModalVisible} transparent animationType="fade">
        <View style={styles.feelingOverlay} pointerEvents="box-none">
          <View style={styles.feelingModal}>
            <Text style={styles.feelingTitle}>
              How did you feel after the workout?
            </Text>
            <Text style={styles.feelingSubtitle}>
              Duration: {pendingWorkoutDuration || 1} min
            </Text>

            <View style={styles.feelingOptionsGrid}>
              {[
                { label: "Great", emoji: "🔥" },
                { label: "Good", emoji: "💪" },
                { label: "Tired", emoji: "😮‍💨" },
                { label: "Hard", emoji: "🏋️" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.feelingButton}
                  onPress={() => saveWorkoutWithFeeling(option.label)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.feelingEmoji}>{option.emoji}</Text>
                  <Text style={styles.feelingButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FB" },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  header: { marginTop: 20, marginBottom: 24 },
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
  subtitle: { fontSize: 16, color: "#6B7280", lineHeight: 22 },

  heroAddButton: {
    backgroundColor: "#2563EB",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroAddIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroAddButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  resetRowButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resetRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  resetRowText: {
    flex: 1,
    color: "#374151",
    fontSize: 16,
    fontWeight: "800",
  },

  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  planSearchBox: {
    minWidth: 150,
    maxWidth: 190,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  planSearchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutIconTile: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardHeaderLeft: { flex: 1, paddingRight: 12 },
  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
  cardBadge: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  exercisePreview: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 14,
  },
  exercisePreviewText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 5,
    lineHeight: 20,
  },
  moreExercisesText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "800",
    marginTop: 4,
  },
  cardButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 10,
  },
  startButton: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  startButtonText: { color: "#15803D", fontSize: 14, fontWeight: "800" },
  editButton: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  editButtonText: { color: "#1D4ED8", fontSize: 14, fontWeight: "800" },
  deleteButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  deleteButtonText: { color: "#DC2626", fontSize: 14, fontWeight: "800" },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  modalSafeArea: { flex: 1, backgroundColor: "#F5F7FB" },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerSideButton: { minWidth: 64 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    flex: 1,
  },
  cancelText: { fontSize: 17, fontWeight: "500", color: "#2563EB" },
  saveHeaderText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2563EB",
    textAlign: "right",
  },
  modalContent: { padding: 20, paddingBottom: 40 },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
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
  selectorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  categoryBlock: { marginBottom: 18 },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  exerciseList: { gap: 10 },
  exerciseChipCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
  },
  exerciseChipCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FBFF",
  },
  exerciseChipTop: { marginBottom: 8 },
  exerciseChipText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseChipTextSelected: { color: "#2563EB" },
  controlsBlock: { gap: 10 },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  setButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
    lineHeight: 22,
  },
  setsText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 14,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 18, fontWeight: "600", color: "#374151" },

  startSafeArea: { flex: 1, backgroundColor: "#F5F7FB" },
  startHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  startHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    flex: 1,
  },
  startScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  startTopBlock: { marginBottom: 18 },
  startWorkoutName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  exerciseCardLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
    textAlign: "center",
  },
  exerciseCardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 8,
  },
  exerciseSetsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    textAlign: "center",
  },
  inlineRestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  inlineRestLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  inlineRestTime: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  inlineRestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineRestPrimaryButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  inlineRestPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  inlineRestSecondaryButton: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  inlineRestSecondaryButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  checklistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  checklistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  checklistCounter: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  checklistItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    minHeight: 64,
  },
  checklistItemCurrent: {
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  checklistLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  checklistTextBlock: {
    flex: 1,
    justifyContent: "center",
  },
  checkIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkIconDone: { backgroundColor: "#DCFCE7" },
  checkIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  checkIconTextDone: { color: "#15803D" },
  checklistExerciseName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  checklistExerciseNameCurrent: { color: "#2563EB" },
  checklistExerciseSets: {
    fontSize: 13,
    color: "#6B7280",
  },
  currentBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bottomActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  iosSecondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  iosSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  iosPrimaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  iosPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  iosFinishButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  iosFinishButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  feelingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  feelingModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  feelingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  feelingSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  feelingOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  feelingButton: {
    width: "48%",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  feelingEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  feelingButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
});
