import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, goToPrevious, goToNext } = useViewStore();
  const insets = useSafeAreaInsets();

  const currentMonth = new Date(selectedDate);
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [selectedDate]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [selectedDate]);

  const goToPreviousJS = useCallback(() => {
    goToPrevious();
  }, [goToPrevious]);

  const goToNextJS = useCallback(() => {
    goToNext();
  }, [goToNext]);

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
              runOnJS(goToNextJS)();
              translateX.value = withTiming(0, { duration: 0 }, () => {
                isAnimating.value = false;
              });
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
              runOnJS(goToPreviousJS)();
              translateX.value = withTiming(0, { duration: 0 }, () => {
                isAnimating.value = false;
              });
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
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
          {format(currentMonth, "yyyy年M月", { locale: zhCN })}
        </Text>
      </View>

      {/* Fixed weekday header */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.weekdayText,
              { color: idx >= 5 ? theme.colors.weekendText : theme.colors.textTertiary },
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Swipeable month grids */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.monthsContainer}>
          <Animated.View style={[styles.monthPanel, prevMonthStyle]}>
            <MonthGrid
              year={prevMonth.getFullYear()}
              month={prevMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>

          <Animated.View style={[styles.monthPanel, animatedStyle]}>
            <MonthGrid
              year={currentMonth.getFullYear()}
              month={currentMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>

          <Animated.View style={[styles.monthPanel, nextMonthStyle]}>
            <MonthGrid
              year={nextMonth.getFullYear()}
              month={nextMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    fontSize: 12,
    textAlign: "center",
    width: "14.28%",
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
