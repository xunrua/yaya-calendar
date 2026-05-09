import { addMonths, format, getISOWeek, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import type React from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import MonthGrid from "./MonthGrid";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, displayMonth: displayMonthStr, setDisplayMonth } = useViewStore();
  const insets = useSafeAreaInsets();

  // 从全局状态获取 displayMonth，转换为 Date 对象
  const displayMonth = useMemo(() => {
    const date = new Date(displayMonthStr);
    return startOfMonth(date);
  }, [displayMonthStr]);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const prevDisplayMonthRef = useRef(displayMonthStr);

  // 计算显示的周数：如果当前显示月份包含 selectedDate，显示 selectedDate 的周数；否则显示该月第一周的周数
  const prevMonth = useMemo(() => subMonths(displayMonth, 1), [displayMonth]);
  const nextMonth = useMemo(() => addMonths(displayMonth, 1), [displayMonth]);

  // 计算显示的周数：如果当前显示月份包含 selectedDate，显示 selectedDate 的周数；否则显示该月第一周的周数
  const displayWeekNumber = useMemo(() => {
    if (isSameMonth(displayMonth, selectedDate)) {
      return getISOWeek(new Date(selectedDate));
    }
    return getISOWeek(startOfMonth(displayMonth));
  }, [displayMonth, selectedDate]);

  const goToPreviousJS = useCallback(() => {
    const newMonth = subMonths(displayMonth, 1);
    setDisplayMonth(newMonth.toISOString().split("T")[0]);
  }, [displayMonth, setDisplayMonth]);

  const goToNextJS = useCallback(() => {
    const newMonth = addMonths(displayMonth, 1);
    setDisplayMonth(newMonth.toISOString().split("T")[0]);
  }, [displayMonth, setDisplayMonth]);

  // 当 displayMonth 更新后，使用 useLayoutEffect 同步重置 translateX
  // 这确保在浏览器绘制之前完成重置，避免闪烁
  // 同时处理大跨度跳转的淡入淡出动画
  useLayoutEffect(() => {
    const prevMonth = prevDisplayMonthRef.current;
    prevDisplayMonthRef.current = displayMonthStr;

    if (prevMonth && displayMonthStr) {
      const prevDate = new Date(prevMonth);
      const currentDate = new Date(displayMonthStr);
      const monthDiff = (currentDate.getFullYear() - prevDate.getFullYear()) * 12
        + currentDate.getMonth() - prevDate.getMonth();

      if (Math.abs(monthDiff) > 1) {
        // 大跨度跳转：使用淡入淡出动画
        opacity.value = 0;
        translateX.value = 0;
        isAnimating.value = false;
        // 下一帧淡入
        runOnUI(() => {
          "worklet";
          opacity.value = withTiming(1, { duration: 200 });
        })();
      } else {
        // 正常滑动：重置位置
        translateX.value = 0;
        isAnimating.value = false;
      }
    } else {
      translateX.value = 0;
      isAnimating.value = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMonthStr]);

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
        translationX < -SWIPE_DISTANCE_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight =
        translationX > SWIPE_DISTANCE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeLeft) {
        isAnimating.value = true;
        translateX.value = withTiming(
          -SCREEN_WIDTH,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
          (finished) => {
            if (finished) {
              // 只更新 React 状态，translateX 在 useEffect 中重置
              scheduleOnRN(goToNextJS);
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
              // 只更新 React 状态，translateX 在 useEffect 中重置
              scheduleOnRN(goToPreviousJS);
            }
          }
        );
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const prevMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));

  const nextMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Month header */}
      <View style={styles.monthHeader}>
        <View style={styles.titleRow}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {format(displayMonth, "yyyy年M月", { locale: zhCN })}
          </Text>
          <Text style={[styles.weekNumber, { color: theme.colors.textTertiary }]}>
            第{displayWeekNumber}周
          </Text>
        </View>
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
          <Animated.View
            style={[styles.monthPanel, { bottom: insets.bottom + 64 }, prevMonthStyle]}
          >
            <MonthGrid
              year={prevMonth.getFullYear()}
              month={prevMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>

          <Animated.View style={[styles.monthPanel, { bottom: insets.bottom + 64 }, animatedStyle]}>
            <MonthGrid
              year={displayMonth.getFullYear()}
              month={displayMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>

          <Animated.View
            style={[styles.monthPanel, { bottom: insets.bottom + 64 }, nextMonthStyle]}
          >
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
    marginLeft: 16,
    marginRight: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "5%",
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  weekNumber: {
    fontSize: 14,
    fontWeight: "400",
    marginLeft: 8,
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    marginLeft: 16,
    marginRight: 16,
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
    left: 16,
    right: 16,
  },
});

export default MonthView;
