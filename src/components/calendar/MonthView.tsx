import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../stores/themeStore";
import { useViewStore } from "../../stores/eventStore";
import { format, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import MonthGrid from "./MonthGrid";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, goToPrevious, goToNext } = useViewStore();

  const currentMonth = new Date(selectedDate);
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [selectedDate]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [selectedDate]);

  const handleMonthChange = useCallback(
    (direction: number) => {
      "worklet";
      if (direction < 0) {
        runOnJS(goToPrevious)();
      } else {
        runOnJS(goToNext)();
      }
    },
    [goToPrevious, goToNext]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (isAnimating.value) return;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isAnimating.value) return;

      const { translationX, velocityX } = event;
      const shouldSwipeLeft =
        translationX < -SWIPE_DISTANCE_THRESHOLD ||
        velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight =
        translationX > SWIPE_DISTANCE_THRESHOLD ||
        velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeLeft) {
        isAnimating.value = true;
        translateX.value = withTiming(
          -SCREEN_WIDTH,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
          (finished) => {
            if (finished) {
              handleMonthChange(-1);
              translateX.value = 0;
              isAnimating.value = false;
            }
          }
        );
      } else if (shouldSwipeRight) {
        isAnimating.value = true;
        translateX.value = withTiming(
          SCREEN_WIDTH,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
          (finished) => {
            if (finished) {
              handleMonthChange(1);
              translateX.value = 0;
              isAnimating.value = false;
            }
          }
        );
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const prevMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));

  const nextMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.gestureContainer}>
          {/* Month header */}
          <View style={styles.monthHeader}>
            <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
              {format(currentMonth, "yyyy年M月", { locale: zhCN })}
            </Text>
          </View>

          {/* Three month grids */}
          <View style={styles.monthsContainer}>
            {/* Previous month */}
            <Animated.View
              style={[styles.monthPanel, prevMonthStyle]}
            >
              <MonthGrid
                year={prevMonth.getFullYear()}
                month={prevMonth.getMonth()}
                fidelity="skeleton"
              />
            </Animated.View>

            {/* Current month */}
            <Animated.View style={[styles.monthPanel, animatedStyle]}>
              <MonthGrid
                year={currentMonth.getFullYear()}
                month={currentMonth.getMonth()}
                fidelity="full"
              />
            </Animated.View>

            {/* Next month */}
            <Animated.View
              style={[styles.monthPanel, nextMonthStyle]}
            >
              <MonthGrid
                year={nextMonth.getFullYear()}
                month={nextMonth.getMonth()}
                fidelity="skeleton"
              />
            </Animated.View>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureContainer: {
    flex: 1,
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  monthsContainer: {
    flex: 1,
    overflow: "hidden",
  },
  monthPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: "100%",
  },
});

export default MonthView;
