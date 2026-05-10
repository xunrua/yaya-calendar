import { addMonths, format, getISOWeek, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import type React from "react";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
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
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };
const FOLD_SPRING_CONFIG = { damping: 18, stiffness: 200 };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const EXPANDED_HEIGHT = 320;
const COLLAPSED_HEIGHT = 64;
const FOLD_VELOCITY_THRESHOLD = 300;
const FOLD_DISTANCE_THRESHOLD = SCREEN_HEIGHT * 0.05;

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, setSelectedDate } = useViewStore();
  const setHasNavigatedMonth = useViewStore((s) => s.setHasNavigatedMonth);
  const insets = useSafeAreaInsets();

  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date(selectedDate)));
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  // 折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  const calendarHeight = useSharedValue(EXPANDED_HEIGHT);

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

  // 当 selectedDate 从外部变化时（如从年视图点击月份），同步 displayMonth
  // 注意：不将 displayMonth 放入依赖，避免滑动切换时被重置
  useLayoutEffect(() => {
    setDisplayMonth(startOfMonth(new Date(selectedDate)));
  }, [selectedDate]);

  const goToPreviousJS = useCallback(() => {
    setDisplayMonth((prev) => {
      const next = subMonths(prev, 1);
      setSelectedDate(format(next, "yyyy-MM-dd"));
      setHasNavigatedMonth(true);
      return next;
    });
  }, [setSelectedDate, setHasNavigatedMonth]);

  const goToNextJS = useCallback(() => {
    setDisplayMonth((prev) => {
      const next = addMonths(prev, 1);
      setSelectedDate(format(next, "yyyy-MM-dd"));
      setHasNavigatedMonth(true);
      return next;
    });
  }, [setSelectedDate, setHasNavigatedMonth]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 当 displayMonth 更新后，使用 useLayoutEffect 同步重置 translateX
  // 这确保在浏览器绘制之前完成重置，避免闪烁
  useLayoutEffect(() => {
    translateX.value = 0;
    isAnimating.value = false;
  }, [displayMonth, translateX, isAnimating]);

  // 折叠高度动画
  useLayoutEffect(() => {
    calendarHeight.value = withSpring(
      isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
      FOLD_SPRING_CONFIG
    );
  }, [isCollapsed, calendarHeight]);

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
  }));

  const prevMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));

  const nextMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  const calendarHeightStyle = useAnimatedStyle(() => ({
    height: calendarHeight.value,
  }));

  // 折叠手势（垂直滑动）
  const foldGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldFold =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldExpand =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      if (shouldFold && !isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else if (shouldExpand && isCollapsed) {
        scheduleOnRN(toggleCollapse);
      }
    });

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

      {/* Swipeable month grids with fold gesture */}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, foldGesture)}>
        <Animated.View style={[styles.monthsContainer, calendarHeightStyle]}>
          <Animated.View
            style={[styles.monthPanel, prevMonthStyle]}
          >
            <MonthGrid
              year={prevMonth.getFullYear()}
              month={prevMonth.getMonth()}
              fidelity={isCollapsed ? "skeleton" : "full"}
            />
          </Animated.View>

          <Animated.View style={[styles.monthPanel, animatedStyle]}>
            <MonthGrid
              year={displayMonth.getFullYear()}
              month={displayMonth.getMonth()}
              fidelity={isCollapsed ? "skeleton" : "full"}
            />
          </Animated.View>

          <Animated.View
            style={[styles.monthPanel, nextMonthStyle]}
          >
            <MonthGrid
              year={nextMonth.getFullYear()}
              month={nextMonth.getMonth()}
              fidelity={isCollapsed ? "skeleton" : "full"}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Collapse indicator */}
      <View style={styles.collapseIndicator}>
        <Text style={[styles.collapseText, { color: theme.colors.textTertiary }]}>
          {isCollapsed ? "ˆ" : "ˇ"}
        </Text>
      </View>
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
    overflow: "hidden",
  },
  monthPanel: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    bottom: 100,
  },
  collapseIndicator: {
    alignItems: "center",
    paddingVertical: 4,
  },
  collapseText: {
    fontSize: 16,
  },
});

export default MonthView;
