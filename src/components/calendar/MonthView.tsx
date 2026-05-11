import { Ionicons } from "@expo/vector-icons";
import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import type React from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import MonthGrid from "./MonthGrid";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const EXPANDED_HEIGHT = 320;
const COLLAPSED_HEIGHT = 64;
const FOLD_VELOCITY_THRESHOLD = 300;
const FOLD_DISTANCE_THRESHOLD = SCREEN_HEIGHT * 0.05;

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const {
    selectedDate,
    displayMonth: displayMonthStr,
    setDisplayMonth,
    setSelectedDate,
    hasNavigatedMonth,
  } = useViewStore();
  const setHasNavigatedMonth = useViewStore((s) => s.setHasNavigatedMonth);

  // 从全局状态获取 displayMonth，转换为 Date 对象
  const displayMonth = useMemo(() => {
    const date = new Date(displayMonthStr);
    return startOfMonth(date);
  }, [displayMonthStr]);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const prevDisplayMonthRef = useRef(displayMonthStr);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const calendarHeight = useSharedValue(EXPANDED_HEIGHT);
  const dragStartHeight = useSharedValue(EXPANDED_HEIGHT);

  const prevMonth = useMemo(() => subMonths(displayMonth, 1), [displayMonth]);
  const nextMonth = useMemo(() => addMonths(displayMonth, 1), [displayMonth]);

  // 当 selectedDate 从外部变化时（如从年视图点击月份），同步 displayMonth
  // 但如果用户已经手动滑动过月份，则不同步
  useLayoutEffect(() => {
    if (!hasNavigatedMonth) {
      const [year, month] = selectedDate.split("-").map(Number);
      const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
      setDisplayMonth(monthStartStr);
    }
  }, [selectedDate, setDisplayMonth, hasNavigatedMonth]);

  const goToPreviousJS = useCallback(() => {
    const [year, month] = displayMonthStr.split("-").map(Number);
    const currentDisplayMonth = new Date(year, month - 1, 1);
    const newMonth = subMonths(currentDisplayMonth, 1);
    const newMonthStr = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, "0")}-01`;
    setDisplayMonth(newMonthStr);
    setHasNavigatedMonth(true);

    // 切换月份时同步选中日期
    const today = new Date();
    if (isSameMonth(newMonth, today)) {
      // 当前月份：选中今天
      setSelectedDate(today.toISOString().split("T")[0]);
    } else {
      // 非当前月份：选中首日
      setSelectedDate(newMonthStr);
    }
  }, [displayMonthStr, setDisplayMonth, setHasNavigatedMonth, setSelectedDate]);

  const goToNextJS = useCallback(() => {
    const [year, month] = displayMonthStr.split("-").map(Number);
    const currentDisplayMonth = new Date(year, month - 1, 1);
    const newMonth = addMonths(currentDisplayMonth, 1);
    const newMonthStr = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, "0")}-01`;
    setDisplayMonth(newMonthStr);
    setHasNavigatedMonth(true);

    // 切换月份时同步选中日期
    const today = new Date();
    if (isSameMonth(newMonth, today)) {
      // 当前月份：选中今天
      setSelectedDate(today.toISOString().split("T")[0]);
    } else {
      // 非当前月份：选中首日
      setSelectedDate(newMonthStr);
    }
  }, [displayMonthStr, setDisplayMonth, setHasNavigatedMonth, setSelectedDate]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 当 displayMonth 更新后，使用 useLayoutEffect 同步重置 translateX
  // 这确保在浏览器绘制之前完成重置，避免闪烁
  // 同时处理大跨度跳转的淡入淡出动画
  useLayoutEffect(() => {
    const prevMonth = prevDisplayMonthRef.current;
    prevDisplayMonthRef.current = displayMonthStr;

    if (prevMonth && displayMonthStr) {
      const [prevYear, prevMonthNum] = prevMonth.split("-").map(Number);
      const [currYear, currMonthNum] = displayMonthStr.split("-").map(Number);
      const monthDiff = (currYear - prevYear) * 12 + (currMonthNum - prevMonthNum);

      if (Math.abs(monthDiff) > 1) {
        // 大跨度跳转：使用淡入淡出动画
        opacity.value = 0;
        translateX.value = 0;
        isAnimating.value = false;
        // 下一帧淡入
        scheduleOnRN(() => {
          opacity.value = withTiming(1, { duration: 200 });
        });
      } else {
        // 正常滑动：重置位置
        translateX.value = 0;
        isAnimating.value = false;
      }
    } else {
      translateX.value = 0;
      isAnimating.value = false;
    }
  }, [displayMonthStr, translateX, opacity, isAnimating]);

  // 折叠高度动画
  useLayoutEffect(() => {
    calendarHeight.value = withTiming(isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
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

  const calendarHeightStyle = useAnimatedStyle(() => ({
    height: calendarHeight.value,
  }));

  // 折叠手势（垂直滑动）- 用于月份网格区域，与水平滑动共存
  const foldGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      dragStartHeight.value = calendarHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, dragStartHeight.value + event.translationY)
      );
      calendarHeight.value = newHeight;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldExpand =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldFold =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      if (shouldFold && !isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else if (shouldExpand && isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else {
        calendarHeight.value = withTiming(isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  // 折叠指示器专用手势 - 仅响应垂直滑动，不限制水平偏移
  const indicatorFoldGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      dragStartHeight.value = calendarHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, dragStartHeight.value + event.translationY)
      );
      calendarHeight.value = newHeight;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldExpand =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldFold =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      if (shouldFold && !isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else if (shouldExpand && isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else {
        calendarHeight.value = withTiming(isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          <Animated.View style={[styles.monthPanel, prevMonthStyle]}>
            <MonthGrid
              year={prevMonth.getFullYear()}
              month={prevMonth.getMonth()}
              fidelity="full"
            />
          </Animated.View>

          <Animated.View style={[styles.monthPanel, animatedStyle]}>
            <MonthGrid
              year={displayMonth.getFullYear()}
              month={displayMonth.getMonth()}
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
        </Animated.View>
      </GestureDetector>

      {/* Collapse indicator area - includes indicator and space below it */}
      <GestureDetector gesture={indicatorFoldGesture}>
        <View style={styles.collapseIndicatorArea}>
          <View style={styles.collapseIndicator}>
            <Ionicons name="remove" size={20} color={theme.colors.textTertiary} />
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
  collapseIndicatorArea: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 4,
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
